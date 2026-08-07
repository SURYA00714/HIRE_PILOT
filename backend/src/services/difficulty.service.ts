import { createLogger } from './logger';
import { InterviewSessionRuntime, DifficultyFactors } from '../types/session.types';

// ── Adaptive Difficulty Engine: 10-Factor Delta Calculation ────────────────
// Difficulty NEVER depends on a single answer. Produces a delta (±1.0 max),
// not an absolute value. Every calculation is logged for auditability.

interface DifficultyResult {
  newDifficulty: number;
  delta: number;
  factors: DifficultyFactors;
  reasoning: string;
}

/**
 * Calculate adaptive difficulty based on 10 factors from the spec.
 * Returns a delta-based difficulty change, clamped to ±1.0 per question.
 */
export function calculateDifficulty(
  session: InterviewSessionRuntime,
  latestScore: number,
  latestResponseTimeMs: number,
  correlationId: string
): DifficultyResult {
  const logger = createLogger('DifficultyEngine', correlationId);
  const history = session.questionHistory;
  const recentN = 3; // rolling window size

  // ── Factor 1: Rolling Average (last N scores) ──
  const recentScores = history
    .slice(-recentN)
    .map(q => q.score ?? 0);
  recentScores.push(latestScore);
  const rollingAverage = recentScores.length > 0
    ? recentScores.reduce((a, b) => a + b, 0) / recentScores.length
    : latestScore;

  // ── Factor 2: Recent Trend (slope of recent scores) ──
  let recentTrend = 0;
  if (recentScores.length >= 2) {
    const diffs = [];
    for (let i = 1; i < recentScores.length; i++) {
      diffs.push(recentScores[i] - recentScores[i - 1]);
    }
    recentTrend = diffs.reduce((a, b) => a + b, 0) / diffs.length;
  }

  // ── Factor 3: Confidence Trend ──
  const recentConfidence = history
    .slice(-recentN)
    .map(q => q.confidenceScore ?? 0.5);
  const confidenceTrend = recentConfidence.length >= 2
    ? recentConfidence[recentConfidence.length - 1] - recentConfidence[0]
    : 0;

  // ── Factor 4: Topic Difficulty ──
  const lastTopic = history.length > 0 ? history[history.length - 1].topic : 'general';
  const topicPerf = session.topicPerformance.get(lastTopic);
  const topicDifficulty = topicPerf ? topicPerf.averageScore : 50;

  // ── Factor 5: Response Time ──
  const avgResponseTime = session.communicationMetrics.averageResponseTimeMs || 30000;
  const responseTimeFactor = latestResponseTimeMs > 0
    ? latestResponseTimeMs / Math.max(avgResponseTime, 1)
    : 1.0;

  // ── Factor 6: Consistency (std deviation of recent scores) ──
  const meanScore = recentScores.reduce((a, b) => a + b, 0) / Math.max(recentScores.length, 1);
  const variance = recentScores.reduce((sum, s) => sum + Math.pow(s - meanScore, 2), 0) / Math.max(recentScores.length, 1);
  const consistency = Math.sqrt(variance); // lower = more consistent

  // ── Factor 7: Question Complexity (rate from current difficulty) ──
  const questionComplexity = session.currentDifficulty;

  // ── Factor 8: Weak Topic Frequency ──
  const weakTopicQuestions = history.filter(q => session.weakTopics.includes(q.topic)).length;
  const weakTopicFrequency = history.length > 0 ? weakTopicQuestions / history.length : 0;

  // ── Factor 9: Strong Topic Frequency ──
  const strongTopicQuestions = history.filter(q => session.strongTopics.includes(q.topic)).length;
  const strongTopicFrequency = history.length > 0 ? strongTopicQuestions / history.length : 0;

  // ── Factor 10: Candidate Fatigue ──
  const interviewDurationMs = Date.now() - session.startTime;
  const interviewDurationMinutes = interviewDurationMs / (1000 * 60);
  const expectedDurationMinutes = session.maxQuestions * 3; // ~3 min per question
  const candidateFatigue = Math.min(interviewDurationMinutes / Math.max(expectedDurationMinutes, 1), 2.0);

  // ── Combine factors into delta ──
  let delta = 0;

  // Performance-based adjustment (primary driver)
  if (rollingAverage > 75) delta += 0.5;
  else if (rollingAverage > 60) delta += 0.2;
  else if (rollingAverage < 30) delta -= 0.5;
  else if (rollingAverage < 45) delta -= 0.2;

  // Trend modifier
  if (recentTrend > 15) delta += 0.3;       // improving rapidly
  else if (recentTrend < -15) delta -= 0.3;  // declining rapidly

  // Consistency penalty (erratic scores → don't change much)
  if (consistency > 25) delta *= 0.5;

  // Fatigue dampener (slow down difficulty increases late in interview)
  if (candidateFatigue > 1.2) delta = Math.min(delta, 0.2);

  // Response time (taking much longer → don't push harder)
  if (responseTimeFactor > 2.0) delta = Math.min(delta, 0);

  // ── Clamp delta to ±1.0 ──
  delta = Math.max(-1.0, Math.min(1.0, delta));
  delta = Math.round(delta * 10) / 10; // round to 1 decimal

  // ── Apply delta ──
  const newDifficulty = Math.max(1, Math.min(10, Math.round(session.currentDifficulty + delta)));

  const factors: DifficultyFactors = {
    rollingAverage,
    recentTrend,
    confidenceTrend,
    topicDifficulty,
    responseTimeFactor,
    consistency,
    questionComplexity,
    weakTopicFrequency,
    strongTopicFrequency,
    candidateFatigue,
  };

  const reasoning = `Rolling avg: ${rollingAverage.toFixed(0)}, Trend: ${recentTrend > 0 ? '+' : ''}${recentTrend.toFixed(0)}, Consistency SD: ${consistency.toFixed(1)}, Fatigue: ${candidateFatigue.toFixed(1)}x → Delta: ${delta > 0 ? '+' : ''}${delta} → ${session.currentDifficulty} → ${newDifficulty}`;

  logger.info('difficulty_calculated', {
    previousDifficulty: session.currentDifficulty,
    delta,
    newDifficulty,
    factors,
    reasoning,
  });

  return { newDifficulty, delta, factors, reasoning };
}

/** Update topic performance tracking after an answer is evaluated */
export function updateTopicPerformance(
  session: InterviewSessionRuntime,
  topic: string,
  score: number,
  questionIndex: number
): void {
  const existing = session.topicPerformance.get(topic);
  if (existing) {
    existing.questionsAsked++;
    existing.scores.push(score);
    existing.averageScore = existing.scores.reduce((a, b) => a + b, 0) / existing.scores.length;
    existing.lastAskedIndex = questionIndex;
  } else {
    session.topicPerformance.set(topic, {
      topic,
      questionsAsked: 1,
      averageScore: score,
      scores: [score],
      lastAskedIndex: questionIndex,
    });
  }

  // Update weak/strong topic lists
  session.weakTopics = [];
  session.strongTopics = [];
  session.topicPerformance.forEach((perf) => {
    if (perf.questionsAsked >= 1) {
      if (perf.averageScore < 40) session.weakTopics.push(perf.topic);
      else if (perf.averageScore > 70) session.strongTopics.push(perf.topic);
    }
  });
}
