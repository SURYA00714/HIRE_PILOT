import { randomUUID } from 'crypto';
import { createLogger } from './logger';
import { InterviewSessionRuntime, createSessionRuntime } from '../types/session.types';
import { transition, canTransition } from './state-machine';
import { QuestionService } from './question.service';
import { EvaluationService } from './evaluation.service';
import { ConversationMemory } from './conversation-memory';
import prisma from '../utils/prisma';
import { updateTopicPerformance } from './difficulty.service';

// ── Interview Service: Orchestrator ─────────────────────────────────────────

export class InterviewService {
  // In-memory active sessions (could be moved to Redis for horizontal scaling)
  private static activeSessions = new Map<string, InterviewSessionRuntime>();
  private static conversationMemories = new Map<string, ConversationMemory>();

  /**
   * Initialize a new interview session.
   */
  static async createSession(params: {
    sessionId: string;
    userId: string;
    interviewType: string;
    targetRole: string;
    experienceLevel: string;
    maxQuestions: number;
    resumeContext?: string;
    extractedSkills?: string[];
    socketId: string;
  }): Promise<InterviewSessionRuntime> {
    const correlationId = randomUUID();
    const logger = createLogger('InterviewService', correlationId);
    
    // Load or update from database
    const dbSession = await prisma.interviewSession.update({
      where: { id: params.sessionId },
      data: {
        status: 'INITIALIZING_CONTEXT',
      }
    });

    const session = createSessionRuntime({
      sessionId: params.sessionId,
      correlationId,
      candidateId: params.userId,
      interviewType: params.interviewType,
      targetRole: params.targetRole,
      experienceLevel: params.experienceLevel,
      maxQuestions: params.maxQuestions,
      socketId: params.socketId,
    });

    session.state = 'INITIALIZING_CONTEXT';

    if (params.resumeContext) session.resumeContext = params.resumeContext;
    if (params.extractedSkills) session.extractedSkills = params.extractedSkills;

    this.activeSessions.set(session.sessionId, session);
    this.conversationMemories.set(session.sessionId, new ConversationMemory(correlationId));

    logger.info('session_created', { sessionId: session.sessionId });

    return session;
  }

  /**
   * Start the interview by generating the first question.
   */
  static async startInterview(sessionId: string): Promise<{ question: string; questionId: string }> {
    const session = this.getSession(sessionId);
    const correlationId = session.correlationId;
    const logger = createLogger('InterviewService', correlationId);

    const transResult = transition(session, 'GENERATING_FIRST_QUESTION', correlationId);
    if (!transResult.success) throw new Error(transResult.reason);

    const questionData = await QuestionService.generateQuestion(session, [], correlationId);
    
    const questionId = randomUUID();
    
    session.questionHistory.push({
      questionId,
      questionText: questionData.nextQuestion,
      topic: questionData.topic,
      subtopic: questionData.subtopic,
      difficulty: questionData.newDifficulty,
      orderIndex: session.questionCounter,
      followUpDepth: questionData.followUpDepth,
      difficultyBefore: session.currentDifficulty,
      difficultyAfter: session.currentDifficulty, // unchanged until answered
      difficultyDelta: 0,
      timestamp: new Date(),
      isFallback: false, // In a full implementation, pass this from QuestionService
    });
    
    session.currentDifficulty = questionData.newDifficulty;
    session.questionCounter = 1;

    transition(session, 'WAITING_FOR_ANSWER', correlationId);
    logger.info('first_question_generated', { sessionId, questionId });

    return { question: questionData.nextQuestion, questionId };
  }

  /**
   * Process a candidate's answer, evaluate it, adjust difficulty, and generate the next question.
   */
  static async processAnswer(
    sessionId: string,
    questionId: string,
    answerText: string,
    responseTimeMs: number
  ): Promise<{ 
    evaluation: any, 
    nextQuestion?: { question: string, questionId: string }, 
    isComplete: boolean 
  }> {
    const session = this.getSession(sessionId);
    const correlationId = session.correlationId;
    const logger = createLogger('InterviewService', correlationId);

    const transEval = transition(session, 'EVALUATING', correlationId);
    if (!transEval.success) throw new Error(transEval.reason);

    // Find the current question
    const currentQIndex = session.questionHistory.findIndex(q => q.questionId === questionId);
    if (currentQIndex === -1) throw new Error(`Question ${questionId} not found in session ${sessionId}`);
    const currentQ = session.questionHistory[currentQIndex];

    // Evaluate Answer
    const evalResult = await EvaluationService.evaluateAnswer(
      session,
      currentQ,
      answerText,
      responseTimeMs,
      correlationId
    );

    transition(session, 'UPDATING_STATE', correlationId);

    // Update Question Record
    currentQ.answerText = answerText;
    currentQ.score = evalResult.score;
    currentQ.scoreJustification = evalResult.feedback;
    currentQ.confidenceScore = evalResult.confidence / 100; // normalize 0-1
    currentQ.aiFeedback = evalResult.feedback;
    currentQ.mistakesIdentified = evalResult.mistakesIdentified;
    currentQ.keywordsMissed = evalResult.keywordsMissed;
    currentQ.improvementTags = evalResult.improvementTags;
    currentQ.responseTimeMs = responseTimeMs;
    currentQ.difficultyAfter = evalResult.newDifficulty;
    currentQ.difficultyDelta = evalResult.difficultyDelta;

    // Update Session Metrics
    session.currentDifficulty = evalResult.newDifficulty;
    session.currentScore = evalResult.score;
    
    // Update Topic Performance
    updateTopicPerformance(session, currentQ.topic, evalResult.score, session.questionCounter);

    // Update Conversation Memory
    const memory = this.conversationMemories.get(sessionId);
    if (memory) {
      memory.addEntry({
        questionId: currentQ.questionId,
        questionText: currentQ.questionText,
        expectedTopic: currentQ.topic,
        subtopic: currentQ.subtopic || '',
        candidateUnderstanding: ConversationMemory.scoreToUnderstanding(evalResult.score),
        mistakesIdentified: evalResult.mistakesIdentified,
        keywordsMissed: evalResult.keywordsMissed,
        confidenceScore: evalResult.confidence / 100,
        aiFeedback: evalResult.feedback,
        improvementTags: evalResult.improvementTags,
        responseTimeMs,
        timestamp: new Date(),
        score: evalResult.score,
        difficulty: currentQ.difficulty,
        followUpDepth: currentQ.followUpDepth,
        isGibberish: evalResult.isGibberish
      });
    }

    logger.info('answer_processed', { 
      sessionId, 
      score: evalResult.score, 
      newDifficulty: evalResult.newDifficulty 
    });

    // Check if interview is complete
    if (session.questionCounter >= session.maxQuestions) {
      transition(session, 'COMPLETED', correlationId);
      return { evaluation: evalResult, isComplete: true };
    }

    // Generate Next Question
    transition(session, 'GENERATING_NEXT_QUESTION', correlationId);
    const previousAnswers = session.questionHistory.map(q => q.answerText || '');
    const nextQData = await QuestionService.generateQuestion(session, previousAnswers, correlationId);
    
    const nextQId = randomUUID();
    session.questionCounter++;
    
    session.questionHistory.push({
      questionId: nextQId,
      questionText: nextQData.nextQuestion,
      topic: nextQData.topic,
      subtopic: nextQData.subtopic,
      difficulty: nextQData.newDifficulty,
      orderIndex: session.questionCounter,
      followUpDepth: nextQData.followUpDepth,
      difficultyBefore: session.currentDifficulty,
      difficultyAfter: session.currentDifficulty,
      difficultyDelta: 0,
      timestamp: new Date(),
      isFallback: false
    });

    session.currentDifficulty = nextQData.newDifficulty;
    transition(session, 'WAITING_FOR_ANSWER', correlationId);

    return { 
      evaluation: evalResult, 
      nextQuestion: { question: nextQData.nextQuestion, questionId: nextQId }, 
      isComplete: false 
    };
  }

  /**
   * Finalize the interview, run final evaluation, and persist to DB.
   */
  static async completeInterview(sessionId: string): Promise<any> {
    const session = this.getSession(sessionId);
    const correlationId = session.correlationId;
    const logger = createLogger('InterviewService', correlationId);

    if (session.state !== 'COMPLETED') {
       transition(session, 'COMPLETED', correlationId);
    }

    const finalEval = await EvaluationService.evaluateFinal(session, correlationId);
    session.averageScore = finalEval.overallScore;
    session.endTime = Date.now();

    // In a real implementation, we would persist `session.questionHistory` to the `Question` table here,
    // and update `InterviewSession` with the final summary. For now, we update the main session record.
    await prisma.interviewSession.update({
      where: { id: sessionId },
      data: {
        status: 'COMPLETED',
        completedAt: new Date(session.endTime),
        overallScore: finalEval.overallScore,
        technicalScore: finalEval.technicalAccuracy,
        communicationScore: finalEval.communication,
        problemSolvingScore: finalEval.problemSolving,
        strengths: JSON.stringify(finalEval.strengths),
        weaknesses: JSON.stringify(finalEval.weaknesses),
        detailedFeedback: finalEval.detailedFeedback,
        // we'll store hiringRec as part of feedback for now, or add column later
      }
    });

    transition(session, 'REPORT_GENERATED', correlationId);
    logger.info('interview_completed_and_saved', { sessionId, overallScore: finalEval.overallScore });

    // Clean up memory
    this.activeSessions.delete(sessionId);
    this.conversationMemories.delete(sessionId);

    return finalEval;
  }

  /**
   * Get an active session or throw if not found.
   */
  static getSession(sessionId: string): InterviewSessionRuntime {
    const session = this.activeSessions.get(sessionId);
    if (!session) throw new Error(`Active session not found: ${sessionId}`);
    return session;
  }
}
