// ── Session Types: Single Source of Truth for Interview Runtime ─────────────
// Every subsystem reads from this object. No conflicting copies.

export type InterviewState =
  | 'CREATED'
  | 'WAITING_FOR_CANDIDATE'
  | 'INITIALIZING_CONTEXT'
  | 'GENERATING_FIRST_QUESTION'
  | 'WAITING_FOR_ANSWER'
  | 'EVALUATING'
  | 'UPDATING_STATE'
  | 'GENERATING_NEXT_QUESTION'
  | 'COMPLETED'
  | 'REPORT_GENERATED'
  | 'ARCHIVED'
  | 'ERROR';

export interface QuestionRecord {
  questionId: string;
  questionText: string;
  topic: string;
  subtopic?: string;
  difficulty: number;
  orderIndex: number;
  followUpDepth: number;       // 0 = base question, 1+ = follow-up
  answerText?: string;
  normalizedAnswer?: string;
  score?: number;
  scoreJustification?: string;
  confidenceScore?: number;    // 0-1 range
  aiFeedback?: string;
  mistakesIdentified?: string[];
  keywordsMissed?: string[];
  improvementTags?: string[];
  responseTimeMs?: number;
  timestamp: Date;
  aiPromptVersion?: string;
  aiModelVersion?: string;
  difficultyBefore: number;
  difficultyAfter: number;
  difficultyDelta: number;
  isFallback: boolean;         // true if this was a canned/fallback question
}

export interface TopicPerformance {
  topic: string;
  questionsAsked: number;
  averageScore: number;
  scores: number[];
  lastAskedIndex: number;
}

export interface DifficultyFactors {
  rollingAverage: number;
  recentTrend: number;         // slope: positive = improving, negative = declining
  confidenceTrend: number;
  topicDifficulty: number;
  responseTimeFactor: number;
  consistency: number;         // standard deviation of recent scores
  questionComplexity: number;
  weakTopicFrequency: number;
  strongTopicFrequency: number;
  candidateFatigue: number;
}

export interface InterviewSessionRuntime {
  // ── Identifiers ──
  sessionId: string;
  correlationId: string;
  candidateId: string;
  interviewType: string;       // technical, behavioral, hr, coding, system_design
  targetRole: string;

  // ── Context ──
  experienceLevel: string;     // junior, mid-level, senior
  resumeContext: string;       // raw extracted text
  extractedSkills: string[];   // canonical forms only
  extractedProjects: string[];

  // ── Difficulty State ──
  currentDifficulty: number;   // 1-10
  weakTopics: string[];
  strongTopics: string[];
  topicPerformance: Map<string, TopicPerformance>;

  // ── Performance ──
  averageScore: number;
  currentScore: number;
  communicationMetrics: {
    fillerWordCount: number;
    averageResponseLength: number;
    averageResponseTimeMs: number;
  };

  // ── History ──
  questionCounter: number;
  maxQuestions: number;
  questionHistory: QuestionRecord[];
  followUpChain: string[];     // current chain of follow-up question IDs

  // ── Runtime ──
  state: InterviewState;
  socketId: string;

  // ── Lifecycle ──
  startTime: number;
  endTime?: number;
  lastActivityTime: number;
}

/** Create a fresh session runtime with sensible defaults */
export function createSessionRuntime(params: {
  sessionId: string;
  correlationId: string;
  candidateId: string;
  interviewType: string;
  targetRole: string;
  experienceLevel: string;
  maxQuestions: number;
  socketId: string;
}): InterviewSessionRuntime {
  return {
    sessionId: params.sessionId,
    correlationId: params.correlationId,
    candidateId: params.candidateId,
    interviewType: params.interviewType,
    targetRole: params.targetRole,
    experienceLevel: params.experienceLevel,
    resumeContext: '',
    extractedSkills: [],
    extractedProjects: [],
    currentDifficulty: 3,
    weakTopics: [],
    strongTopics: [],
    topicPerformance: new Map(),
    averageScore: 0,
    currentScore: 0,
    communicationMetrics: {
      fillerWordCount: 0,
      averageResponseLength: 0,
      averageResponseTimeMs: 0,
    },
    questionCounter: 0,
    maxQuestions: params.maxQuestions,
    questionHistory: [],
    followUpChain: [],
    state: 'CREATED',
    socketId: params.socketId,
    startTime: Date.now(),
    lastActivityTime: Date.now(),
  };
}
