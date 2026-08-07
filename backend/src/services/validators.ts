import { createLogger } from './logger';

// ── Answer Validators: Pre-AI Deterministic Checks ─────────────────────────
// Stage 1 (Basic) and Stage 2 (Semantic) run BEFORE any Gemini call.
// No AI needed — these are fast, deterministic, and catch gibberish instantly.

export interface BasicValidationResult {
  isValid: boolean;
  isEmpty: boolean;
  isGibberish: boolean;
  isDuplicate: boolean;
  tokenCount: number;
  reasons: string[];
  penaltyScore: number; // 0 = maximum penalty, 100 = no penalty
}

export interface SemanticValidationResult {
  isRelevant: boolean;
  topicMatch: number;      // 0-1 relevance score
  keywordsFound: string[];
  reasons: string[];
}

// ── Common English dictionary words for gibberish detection ─────────────────
const COMMON_WORDS = new Set([
  'the', 'be', 'to', 'of', 'and', 'a', 'in', 'that', 'have', 'i',
  'it', 'for', 'not', 'on', 'with', 'he', 'as', 'you', 'do', 'at',
  'this', 'but', 'his', 'by', 'from', 'they', 'we', 'say', 'her', 'she',
  'or', 'an', 'will', 'my', 'one', 'all', 'would', 'there', 'their', 'what',
  'so', 'up', 'out', 'if', 'about', 'who', 'get', 'which', 'go', 'me',
  'when', 'make', 'can', 'like', 'time', 'no', 'just', 'him', 'know', 'take',
  'use', 'come', 'could', 'than', 'look', 'way', 'more', 'these', 'want', 'thing',
  'because', 'also', 'think', 'see', 'well', 'system', 'design', 'code', 'data',
  'function', 'class', 'method', 'variable', 'array', 'string', 'number', 'object',
  'server', 'client', 'database', 'api', 'request', 'response', 'error', 'test',
  'yes', 'no', 'maybe', 'sure', 'okay', 'right', 'understand', 'experience',
  'worked', 'project', 'team', 'using', 'used', 'built', 'learned', 'managed',
]);

const FILLER_REGEX = /\b(um|uh|like|you know|basically|actually|literally|so yeah|hmm|ahh)\b/gi;

/**
 * Stage 1: Basic Validation — fast deterministic checks.
 * Detects empty answers, gibberish, duplicates, and short/dismissive responses.
 */
export function validateBasic(
  answer: string,
  previousAnswers: string[],
  correlationId: string
): BasicValidationResult {
  const logger = createLogger('Validator', correlationId);
  const reasons: string[] = [];
  let penaltyScore = 100;

  const trimmed = answer.trim();
  const tokenCount = trimmed.split(/\s+/).filter(Boolean).length;

  // Empty check
  if (!trimmed || tokenCount === 0) {
    logger.info('validation_empty', { answer: trimmed.substring(0, 50) });
    return {
      isValid: false, isEmpty: true, isGibberish: false, isDuplicate: false,
      tokenCount: 0, reasons: ['Empty answer'], penaltyScore: 0,
    };
  }

  // Gibberish detection: calculate ratio of recognizable English words
  const words = trimmed.toLowerCase().split(/\s+/).filter(Boolean);
  const recognizedCount = words.filter(w => {
    const clean = w.replace(/[^a-z]/g, '');
    return clean.length > 0 && (COMMON_WORDS.has(clean) || clean.length > 15); // long words are likely real
  }).length;
  const recognizedRatio = words.length > 0 ? recognizedCount / words.length : 0;

  // Check for keyboard-mash patterns (consecutive consonants, repeated chars)
  const keyboardMash = /([bcdfghjklmnpqrstvwxyz]{5,})|(.)\2{3,}/i;
  const hasMash = keyboardMash.test(trimmed);

  const isGibberish = (recognizedRatio < 0.3 && tokenCount > 2) || (hasMash && recognizedRatio < 0.5);

  if (isGibberish) {
    reasons.push(`Gibberish detected (recognized word ratio: ${(recognizedRatio * 100).toFixed(0)}%)`);
    penaltyScore = 0;
  }

  // Duplicate detection
  const isDuplicate = previousAnswers.some(
    prev => prev.trim().toLowerCase() === trimmed.toLowerCase()
  );
  if (isDuplicate) {
    reasons.push('Duplicate of a previous answer');
    penaltyScore = Math.min(penaltyScore, 10);
  }

  // Short/dismissive answer check (for complex interview questions)
  if (tokenCount <= 3 && !isGibberish) {
    reasons.push(`Very short answer (${tokenCount} words)`);
    penaltyScore = Math.min(penaltyScore, 25);
  }

  // Filler word analysis
  const fillerMatches = trimmed.match(FILLER_REGEX);
  const fillerCount = fillerMatches ? fillerMatches.length : 0;
  const fillerRatio = tokenCount > 0 ? fillerCount / tokenCount : 0;

  if (fillerRatio > 0.4) {
    reasons.push(`Excessive filler words (${(fillerRatio * 100).toFixed(0)}% of answer)`);
    penaltyScore = Math.min(penaltyScore, 30);
  }

  const isValid = penaltyScore > 0;

  logger.info('basic_validation', {
    tokenCount,
    recognizedRatio: recognizedRatio.toFixed(2),
    isGibberish,
    isDuplicate,
    fillerCount,
    penaltyScore,
    isValid,
  });

  return {
    isValid,
    isEmpty: false,
    isGibberish,
    isDuplicate,
    tokenCount,
    reasons,
    penaltyScore,
  };
}

/**
 * Stage 2: Semantic Validation — checks answer relevance to the question.
 * Uses keyword overlap as a lightweight proxy for semantic similarity.
 */
export function validateSemantic(
  answer: string,
  question: string,
  expectedTopic: string,
  candidateSkills: string[],
  correlationId: string
): SemanticValidationResult {
  const logger = createLogger('Validator', correlationId);

  const answerLower = answer.toLowerCase();
  const questionLower = question.toLowerCase();

  // Extract significant words from question (not stopwords)
  const stopwords = new Set(['a', 'an', 'the', 'is', 'are', 'was', 'were', 'do', 'does', 'did', 'will', 'would', 'can', 'could', 'should', 'may', 'might', 'you', 'your', 'how', 'what', 'why', 'when', 'where', 'which', 'who', 'whom', 'about', 'with', 'from', 'into', 'for', 'on', 'in', 'of', 'to', 'and', 'or', 'but', 'not', 'if', 'then', 'than', 'that', 'this', 'these', 'those', 'have', 'has', 'had', 'been', 'being', 'be', 'me', 'my', 'tell']);

  const questionWords = questionLower.split(/\s+/)
    .map(w => w.replace(/[^a-z0-9]/g, ''))
    .filter(w => w.length > 2 && !stopwords.has(w));

  const answerWords = new Set(answerLower.split(/\s+/).map(w => w.replace(/[^a-z0-9]/g, '')));

  // How many question keywords appear in the answer?
  const keywordsFound = questionWords.filter(w => answerWords.has(w));
  const topicMatch = questionWords.length > 0 ? keywordsFound.length / questionWords.length : 0;

  // Check if answer mentions the expected topic
  const topicMentioned = expectedTopic ? answerLower.includes(expectedTopic.toLowerCase()) : false;

  // Check if answer references any of the candidate's claimed skills
  const skillsReferenced = candidateSkills.filter(s => answerLower.includes(s.toLowerCase()));

  const isRelevant = topicMatch > 0.1 || topicMentioned || skillsReferenced.length > 0;

  const reasons: string[] = [];
  if (!isRelevant) reasons.push('Answer appears off-topic (low keyword overlap with question)');
  if (topicMentioned) reasons.push(`Topic "${expectedTopic}" mentioned in answer`);

  logger.info('semantic_validation', {
    topicMatch: topicMatch.toFixed(2),
    keywordsFound: keywordsFound.length,
    totalQuestionKeywords: questionWords.length,
    isRelevant,
  });

  return { isRelevant, topicMatch, keywordsFound, reasons };
}

/** Count filler words in text (deterministic, no AI) */
export function countFillerWords(text: string): number {
  const matches = text.match(FILLER_REGEX);
  return matches ? matches.length : 0;
}
