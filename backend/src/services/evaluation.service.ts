import { createLogger } from './logger';
import { validateBasic, validateSemantic, countFillerWords } from './validators';
import { callGemini } from './ai-client.service';
import { buildAnswerEvaluationPrompt, buildEvaluationPrompt, PromptContext } from './prompt-builder';
import { parseAnswerEvaluation, parseFinalEvaluation, ParsedAnswerEvaluation, ParsedFinalEvaluation } from './response-parser';
import { InterviewSessionRuntime, QuestionRecord } from '../types/session.types';
import { calculateDifficulty } from './difficulty.service';

// ── Evaluation Service: Multi-stage Pipeline ───────────────────────────────

export class EvaluationService {
  /**
   * Evaluate a single answer inline during the interview.
   * Runs the 7-stage pipeline from the spec.
   */
  static async evaluateAnswer(
    session: InterviewSessionRuntime,
    question: QuestionRecord,
    answerText: string,
    responseTimeMs: number,
    correlationId: string
  ): Promise<ParsedAnswerEvaluation & { difficultyDelta: number; newDifficulty: number }> {
    const logger = createLogger('EvaluationService', correlationId);
    
    // Stage 1: Basic Validation (Deterministic)
    const previousAnswers = session.questionHistory.map(q => q.answerText || '');
    const basicValid = validateBasic(answerText, previousAnswers, correlationId);
    
    // Update filler word metrics
    const fillerWords = countFillerWords(answerText);
    session.communicationMetrics.fillerWordCount += fillerWords;
    
    let aiEvaluation: ParsedAnswerEvaluation;

    if (!basicValid.isValid || basicValid.isGibberish) {
      logger.info('evaluation_short_circuit', { reason: basicValid.reasons[0] });
      // Fast path: skip AI, zero score
      aiEvaluation = {
        score: basicValid.penaltyScore,
        technicalAccuracy: 0,
        communication: 0,
        confidence: 0,
        feedback: basicValid.reasons[0] || 'Invalid answer provided.',
        mistakesIdentified: basicValid.reasons,
        keywordsMissed: [],
        improvementTags: ['Communication', 'Professionalism'],
        isGibberish: basicValid.isGibberish,
        isOffTopic: false,
        topic: question.topic,
      };
    } else {
      // Stage 2: Semantic Validation
      const semanticValid = validateSemantic(
        answerText,
        question.questionText,
        question.topic,
        session.extractedSkills,
        correlationId
      );

      // Stage 3: AI Prompt Construction
      const ctx: PromptContext = {
        interviewType: session.interviewType,
        role: session.targetRole,
        experienceLevel: session.experienceLevel,
        resumeContext: session.resumeContext,
        extractedSkills: session.extractedSkills,
        previousQA: [], // For individual answer eval, we just need the context, not full history
        currentDifficulty: session.currentDifficulty,
        weakTopics: session.weakTopics,
        strongTopics: session.strongTopics,
        questionCount: session.questionCounter,
        maxQuestions: session.maxQuestions,
      };
      
      const prompt = buildAnswerEvaluationPrompt(
        question.questionText,
        answerText,
        ctx,
        correlationId
      );

      // Stage 4: AI Evaluation
      const aiResponse = await callGemini(prompt, correlationId, { temperature: 0.2 }); // low temp for eval
      
      // Stage 5: Response Parsing & Validation
      const parsed = parseAnswerEvaluation(aiResponse.parsedJSON, correlationId);
      aiEvaluation = parsed.data;

      // Apply semantic penalties if AI missed off-topic
      if (!semanticValid.isRelevant && aiEvaluation.score > 40) {
        logger.warn('semantic_override', { originalScore: aiEvaluation.score, newScore: 30 });
        aiEvaluation.score = 30;
        aiEvaluation.isOffTopic = true;
        aiEvaluation.feedback = 'The answer provided was largely off-topic. ' + aiEvaluation.feedback;
      }
    }

    // Stage 6: Difficulty Adjustment (based on this answer)
    const diffResult = calculateDifficulty(
      session,
      aiEvaluation.score,
      responseTimeMs,
      correlationId
    );

    return {
      ...aiEvaluation,
      difficultyDelta: diffResult.delta,
      newDifficulty: diffResult.newDifficulty,
    };
  }

  /**
   * Final comprehensive evaluation at the end of the interview.
   */
  static async evaluateFinal(
    session: InterviewSessionRuntime,
    correlationId: string
  ): Promise<ParsedFinalEvaluation> {
    const logger = createLogger('EvaluationService', correlationId);
    logger.info('starting_final_evaluation', { sessionId: session.sessionId });

    const ctx: PromptContext = {
      interviewType: session.interviewType,
      role: session.targetRole,
      experienceLevel: session.experienceLevel,
      resumeContext: session.resumeContext,
      extractedSkills: session.extractedSkills,
      previousQA: session.questionHistory.map(q => ({
        question: q.questionText,
        answer: q.answerText || '',
        score: q.score,
        feedback: q.aiFeedback,
      })),
      currentDifficulty: session.currentDifficulty,
      weakTopics: session.weakTopics,
      strongTopics: session.strongTopics,
      questionCount: session.questionCounter,
      maxQuestions: session.maxQuestions,
    };

    const prompt = buildEvaluationPrompt(
      ctx,
      session.communicationMetrics.fillerWordCount,
      correlationId
    );

    const aiResponse = await callGemini(prompt, correlationId, { temperature: 0.3 });
    const parsed = parseFinalEvaluation(aiResponse.parsedJSON, correlationId);

    logger.info('final_evaluation_complete', { 
      overallScore: parsed.data.overallScore,
      hiringRecommendation: parsed.data.hiringRecommendation
    });

    return parsed.data;
  }
}
