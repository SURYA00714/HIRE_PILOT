import { createLogger } from './logger';
import { callGemini } from './ai-client.service';
import { buildQuestionPrompt, PromptContext } from './prompt-builder';
import { parseQuestionResponse, ParsedQuestionResponse } from './response-parser';
import { InterviewSessionRuntime, QuestionRecord } from '../types/session.types';

// ── Question Service: Generation, Deduplication, Follow-ups ────────────────
// Handles calling AI to generate questions and ensuring they are valid and unique.

export class QuestionService {
  /**
   * Generate the next interview question.
   * Uses the prompt builder to construct context and response parser to validate output.
   */
  static async generateQuestion(
    session: InterviewSessionRuntime,
    previousAnswers: string[], // for fallback duplicate check
    correlationId: string
  ): Promise<ParsedQuestionResponse> {
    const logger = createLogger('QuestionService', correlationId);
    logger.info('generating_question', {
      questionCounter: session.questionCounter + 1,
      difficulty: session.currentDifficulty,
    });

    const ctx = this.buildContext(session);
    const prompt = buildQuestionPrompt(ctx, correlationId);

    // Call Gemini
    const aiResponse = await callGemini(prompt, correlationId, {
      temperature: 0.7,
      maxTokens: 1024,
    });

    if (!aiResponse.success) {
      logger.error('ai_generation_failed', new Error(aiResponse.error || 'Unknown AI error'));
    }

    // Extract previous questions for deduplication
    const previousQuestions = session.questionHistory.map(q => q.questionText);

    // Parse and validate response
    const parsed = parseQuestionResponse(
      aiResponse.parsedJSON,
      previousQuestions,
      session.questionCounter,
      correlationId
    );

    logger.info('question_generated', {
      topic: parsed.data.topic,
      difficulty: parsed.data.newDifficulty,
      isFallback: !parsed.success,
      stage: parsed.stage,
    });

    return parsed.data;
  }

  /** Convert session state into the context required by PromptBuilder */
  private static buildContext(session: InterviewSessionRuntime): PromptContext {
    return {
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
  }
}
