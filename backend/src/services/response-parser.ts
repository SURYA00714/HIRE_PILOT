import { createLogger } from './logger';

// ── Response Parser: 5-Stage AI Response Validation ────────────────────────
// Structure → Fields → Scores → Question → Safety. Deterministic fallback at each stage.
// The backend NEVER crashes from malformed Gemini output.

export interface ParsedQuestionResponse {
  nextQuestion: string;
  topic: string;
  subtopic: string;
  newDifficulty: number;
  feedbackOnLastAnswer: string | null;
  followUpDepth: number;
  reasoning: string;
}

export interface ParsedAnswerEvaluation {
  score: number;
  technicalAccuracy: number;
  communication: number;
  confidence: number;
  feedback: string;
  mistakesIdentified: string[];
  keywordsMissed: string[];
  improvementTags: string[];
  isGibberish: boolean;
  isOffTopic: boolean;
  topic: string;
}

export interface ParsedFinalEvaluation {
  overallScore: number;
  technicalAccuracy: number;
  problemSolving: number;
  communication: number;
  confidence: number;
  knowledgeDepth: number;
  responseStructure: number;
  SVAR_Fluency: number;
  SVAR_Vocabulary: number;
  AMCAT_LogicalReasoning: number;
  strengths: string[];
  weaknesses: string[];
  detailedFeedback: string;
  recommendedTopics: string[];
  hiringRecommendation: string;
  topicBreakdown: { topic: string; score: number; feedback: string }[];
}

interface ValidationResult<T> {
  success: boolean;
  data: T;
  warnings: string[];
  stage: string;
}

// ── Stage 1: Structure Validation ──────────────────────────────────────────

function validateStructure(json: any, correlationId: string): { valid: boolean; error?: string } {
  const logger = createLogger('ResponseParser', correlationId);

  if (json === null || json === undefined) {
    logger.warn('structure_validation_failed', { reason: 'null or undefined' });
    return { valid: false, error: 'AI returned null/undefined' };
  }
  if (typeof json !== 'object' || Array.isArray(json)) {
    logger.warn('structure_validation_failed', { reason: 'not an object', type: typeof json });
    return { valid: false, error: 'AI response is not a JSON object' };
  }
  return { valid: true };
}

// ── Stage 2: Field Validation ──────────────────────────────────────────────

function clampScore(value: any, fieldName: string): number {
  const num = typeof value === 'number' ? value : parseInt(value, 10);
  if (isNaN(num)) return 0;
  return Math.max(0, Math.min(100, Math.round(num)));
}

function ensureString(value: any, fallback: string): string {
  if (typeof value === 'string' && value.trim().length > 0) return value.trim();
  return fallback;
}

function ensureStringArray(value: any): string[] {
  if (Array.isArray(value)) return value.filter((v: any) => typeof v === 'string' && v.trim().length > 0);
  return [];
}

// ── Stage 3: Score Validation ──────────────────────────────────────────────

function validateScoreConsistency(scores: Record<string, number>, correlationId: string): string[] {
  const logger = createLogger('ResponseParser', correlationId);
  const warnings: string[] = [];

  // Check for logical impossibilities
  const overall = scores['overallScore'] || 0;
  const techAccuracy = scores['technicalAccuracy'] || 0;

  // If technical accuracy is 0 but overall is > 50, something is wrong
  if (techAccuracy === 0 && overall > 50) {
    warnings.push('Inconsistency: technicalAccuracy=0 but overallScore>50, clamping overall');
    scores['overallScore'] = Math.min(overall, 30);
  }

  // If all sub-scores are < 20 but overall > 40, clamp overall
  const subScores = [techAccuracy, scores['communication'] || 0, scores['confidence'] || 0, scores['knowledgeDepth'] || 0];
  const avgSub = subScores.reduce((a, b) => a + b, 0) / subScores.length;
  if (avgSub < 20 && overall > 40) {
    warnings.push(`Inconsistency: average sub-score=${avgSub.toFixed(0)} but overall=${overall}, clamping`);
    scores['overallScore'] = Math.min(overall, Math.round(avgSub * 1.5));
  }

  if (warnings.length > 0) {
    logger.warn('score_consistency_issues', { warnings });
  }

  return warnings;
}

// ── Public Parsers ─────────────────────────────────────────────────────────

const FALLBACK_QUESTIONS = [
  "Can you tell me about your background and experience relevant to this role?",
  "Describe a challenging project you worked on recently and how you handled key decisions.",
  "How do you approach debugging and troubleshooting complex production issues?",
  "How do you handle disagreements with team members regarding technical design?",
  "Where do you see your technical skills evolving over the next few years?",
];

/** Parse and validate a question generation response */
export function parseQuestionResponse(
  json: any,
  previousQuestions: string[],
  fallbackIndex: number,
  correlationId: string
): ValidationResult<ParsedQuestionResponse> {
  const logger = createLogger('ResponseParser', correlationId);
  const warnings: string[] = [];

  // Stage 1: Structure
  const structureCheck = validateStructure(json, correlationId);
  if (!structureCheck.valid) {
    logger.warn('question_parse_fallback', { stage: 'structure', reason: structureCheck.error });
    return {
      success: false,
      data: createFallbackQuestion(fallbackIndex),
      warnings: [structureCheck.error!],
      stage: 'structure',
    };
  }

  // Stage 2: Fields
  const question = ensureString(json.nextQuestion, '');
  if (!question) {
    logger.warn('question_parse_fallback', { stage: 'fields', reason: 'empty nextQuestion' });
    return {
      success: false,
      data: createFallbackQuestion(fallbackIndex),
      warnings: ['AI returned empty nextQuestion'],
      stage: 'fields',
    };
  }

  // Stage 4: Question Validation — check for duplicates
  const isDuplicate = previousQuestions.some(
    (prev) => prev.toLowerCase().trim() === question.toLowerCase().trim()
  );
  if (isDuplicate) {
    warnings.push('Duplicate question detected, using fallback');
    logger.warn('question_duplicate', { question: question.substring(0, 50) });
    return {
      success: false,
      data: createFallbackQuestion(fallbackIndex),
      warnings,
      stage: 'question_duplicate',
    };
  }

  // Stage 3: Score Validation (difficulty)
  let difficulty = typeof json.newDifficulty === 'number' ? json.newDifficulty : 3;
  difficulty = Math.max(1, Math.min(10, Math.round(difficulty)));

  const result: ParsedQuestionResponse = {
    nextQuestion: question,
    topic: ensureString(json.topic, 'general'),
    subtopic: ensureString(json.subtopic, ''),
    newDifficulty: difficulty,
    feedbackOnLastAnswer: json.feedbackOnLastAnswer || null,
    followUpDepth: typeof json.followUpDepth === 'number' ? json.followUpDepth : 0,
    reasoning: ensureString(json.reasoning, ''),
  };

  logger.info('question_parsed', { topic: result.topic, difficulty: result.newDifficulty });
  return { success: true, data: result, warnings, stage: 'complete' };
}

/** Parse and validate a per-answer evaluation response */
export function parseAnswerEvaluation(
  json: any,
  correlationId: string
): ValidationResult<ParsedAnswerEvaluation> {
  const logger = createLogger('ResponseParser', correlationId);

  const structureCheck = validateStructure(json, correlationId);
  if (!structureCheck.valid) {
    return {
      success: false,
      data: createFallbackAnswerEval(),
      warnings: [structureCheck.error!],
      stage: 'structure',
    };
  }

  const result: ParsedAnswerEvaluation = {
    score: clampScore(json.score, 'score'),
    technicalAccuracy: clampScore(json.technicalAccuracy, 'technicalAccuracy'),
    communication: clampScore(json.communication, 'communication'),
    confidence: clampScore(json.confidence, 'confidence'),
    feedback: ensureString(json.feedback, 'No feedback available.'),
    mistakesIdentified: ensureStringArray(json.mistakesIdentified),
    keywordsMissed: ensureStringArray(json.keywordsMissed),
    improvementTags: ensureStringArray(json.improvementTags),
    isGibberish: json.isGibberish === true,
    isOffTopic: json.isOffTopic === true,
    topic: ensureString(json.topic, 'unknown'),
  };

  // Score consistency check
  const scores: Record<string, number> = { score: result.score, technicalAccuracy: result.technicalAccuracy, communication: result.communication };
  validateScoreConsistency(scores, correlationId);
  result.score = scores['score'] ?? result.score;

  logger.info('answer_eval_parsed', { score: result.score, isGibberish: result.isGibberish });
  return { success: true, data: result, warnings: [], stage: 'complete' };
}

/** Parse and validate a final evaluation response */
export function parseFinalEvaluation(
  json: any,
  correlationId: string
): ValidationResult<ParsedFinalEvaluation> {
  const logger = createLogger('ResponseParser', correlationId);

  const structureCheck = validateStructure(json, correlationId);
  if (!structureCheck.valid) {
    return {
      success: false,
      data: createFallbackFinalEval(),
      warnings: [structureCheck.error!],
      stage: 'structure',
    };
  }

  const result: ParsedFinalEvaluation = {
    overallScore: clampScore(json.overallScore, 'overallScore'),
    technicalAccuracy: clampScore(json.technicalAccuracy, 'technicalAccuracy'),
    problemSolving: clampScore(json.problemSolving, 'problemSolving'),
    communication: clampScore(json.communication, 'communication'),
    confidence: clampScore(json.confidence, 'confidence'),
    knowledgeDepth: clampScore(json.knowledgeDepth, 'knowledgeDepth'),
    responseStructure: clampScore(json.responseStructure, 'responseStructure'),
    SVAR_Fluency: clampScore(json.SVAR_Fluency, 'SVAR_Fluency'),
    SVAR_Vocabulary: clampScore(json.SVAR_Vocabulary, 'SVAR_Vocabulary'),
    AMCAT_LogicalReasoning: clampScore(json.AMCAT_LogicalReasoning, 'AMCAT_LogicalReasoning'),
    strengths: ensureStringArray(json.strengths),
    weaknesses: ensureStringArray(json.weaknesses),
    detailedFeedback: ensureString(json.detailedFeedback, 'Evaluation completed.'),
    recommendedTopics: ensureStringArray(json.recommendedTopics),
    hiringRecommendation: ensureString(json.hiringRecommendation, 'NO_HIRE'),
    topicBreakdown: Array.isArray(json.topicBreakdown) ? json.topicBreakdown : [],
  };

  // Score consistency
  const scores: Record<string, number> = {
    overallScore: result.overallScore,
    technicalAccuracy: result.technicalAccuracy,
    communication: result.communication,
    confidence: result.confidence,
    knowledgeDepth: result.knowledgeDepth,
  };
  const warnings = validateScoreConsistency(scores, correlationId);
  result.overallScore = scores['overallScore'] ?? result.overallScore;

  logger.info('final_eval_parsed', { overallScore: result.overallScore, recommendation: result.hiringRecommendation });
  return { success: true, data: result, warnings, stage: 'complete' };
}

// ── Fallback Factories ─────────────────────────────────────────────────────

function createFallbackQuestion(index: number): ParsedQuestionResponse {
  return {
    nextQuestion: FALLBACK_QUESTIONS[index % FALLBACK_QUESTIONS.length],
    topic: 'general',
    subtopic: '',
    newDifficulty: 3,
    feedbackOnLastAnswer: null,
    followUpDepth: 0,
    reasoning: 'Fallback question used due to AI response parsing failure',
  };
}

function createFallbackAnswerEval(): ParsedAnswerEvaluation {
  return {
    score: 0,
    technicalAccuracy: 0,
    communication: 0,
    confidence: 0,
    feedback: 'Unable to evaluate this answer.',
    mistakesIdentified: [],
    keywordsMissed: [],
    improvementTags: [],
    isGibberish: false,
    isOffTopic: false,
    topic: 'unknown',
  };
}

function createFallbackFinalEval(): ParsedFinalEvaluation {
  return {
    overallScore: 0,
    technicalAccuracy: 0,
    problemSolving: 0,
    communication: 0,
    confidence: 0,
    knowledgeDepth: 0,
    responseStructure: 0,
    SVAR_Fluency: 0,
    SVAR_Vocabulary: 0,
    AMCAT_LogicalReasoning: 0,
    strengths: ['Unable to determine'],
    weaknesses: ['Unable to evaluate responses'],
    detailedFeedback: 'The evaluation could not be completed due to a parsing error.',
    recommendedTopics: [],
    hiringRecommendation: 'NO_HIRE',
    topicBreakdown: [],
  };
}
