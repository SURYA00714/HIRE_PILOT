import { createLogger } from './logger';

// ── Conversation Memory: Structured Knowledge Store ────────────────────────
// Not raw chat. Stores structured knowledge per interview question.
// Searchable by topic, weakness, improvement area.

export interface MemoryEntry {
  questionId: string;
  questionText: string;
  expectedTopic: string;
  subtopic: string;
  candidateUnderstanding: 'none' | 'surface' | 'moderate' | 'deep' | 'expert';
  mistakesIdentified: string[];
  keywordsMissed: string[];
  confidenceScore: number;     // 0-1
  aiFeedback: string;
  improvementTags: string[];
  responseTimeMs: number;
  timestamp: Date;
  score: number;               // 0-100
  difficulty: number;
  followUpDepth: number;
  isGibberish: boolean;
}

export class ConversationMemory {
  private entries: MemoryEntry[] = [];
  private correlationId: string;
  private logger;

  constructor(correlationId: string) {
    this.correlationId = correlationId;
    this.logger = createLogger('ConversationMemory', correlationId);
  }

  /** Add a new memory entry after answer evaluation */
  addEntry(entry: MemoryEntry): void {
    this.entries.push(entry);
    this.logger.info('memory_entry_added', {
      questionId: entry.questionId,
      topic: entry.expectedTopic,
      understanding: entry.candidateUnderstanding,
      score: entry.score,
      entryCount: this.entries.length,
    });
  }

  /** Get all entries */
  getAll(): MemoryEntry[] {
    return [...this.entries];
  }

  /** Search by topic */
  findByTopic(topic: string): MemoryEntry[] {
    return this.entries.filter(e => e.expectedTopic.toLowerCase() === topic.toLowerCase());
  }

  /** Get all identified weaknesses */
  getWeaknesses(): { topic: string; averageScore: number; count: number }[] {
    const topicScores = new Map<string, number[]>();
    this.entries.forEach(e => {
      const scores = topicScores.get(e.expectedTopic) || [];
      scores.push(e.score);
      topicScores.set(e.expectedTopic, scores);
    });

    const weaknesses: { topic: string; averageScore: number; count: number }[] = [];
    topicScores.forEach((scores, topic) => {
      const avg = scores.reduce((a, b) => a + b, 0) / scores.length;
      if (avg < 50) {
        weaknesses.push({ topic, averageScore: Math.round(avg), count: scores.length });
      }
    });

    return weaknesses.sort((a, b) => a.averageScore - b.averageScore);
  }

  /** Get all identified strengths */
  getStrengths(): { topic: string; averageScore: number; count: number }[] {
    const topicScores = new Map<string, number[]>();
    this.entries.forEach(e => {
      const scores = topicScores.get(e.expectedTopic) || [];
      scores.push(e.score);
      topicScores.set(e.expectedTopic, scores);
    });

    const strengths: { topic: string; averageScore: number; count: number }[] = [];
    topicScores.forEach((scores, topic) => {
      const avg = scores.reduce((a, b) => a + b, 0) / scores.length;
      if (avg >= 70) {
        strengths.push({ topic, averageScore: Math.round(avg), count: scores.length });
      }
    });

    return strengths.sort((a, b) => b.averageScore - a.averageScore);
  }

  /** Get recurring mistakes across the interview */
  getRecurringMistakes(): { mistake: string; count: number }[] {
    const mistakeCount = new Map<string, number>();
    this.entries.forEach(e => {
      e.mistakesIdentified.forEach(m => {
        mistakeCount.set(m, (mistakeCount.get(m) || 0) + 1);
      });
    });

    return Array.from(mistakeCount.entries())
      .map(([mistake, count]) => ({ mistake, count }))
      .filter(m => m.count > 1)
      .sort((a, b) => b.count - a.count);
  }

  /** Get improvement recommendations */
  getImprovementTags(): string[] {
    const tagSet = new Set<string>();
    this.entries.forEach(e => {
      e.improvementTags.forEach(t => tagSet.add(t));
    });
    return Array.from(tagSet);
  }

  /** Determine candidate understanding level from score */
  static scoreToUnderstanding(score: number): MemoryEntry['candidateUnderstanding'] {
    if (score >= 90) return 'expert';
    if (score >= 70) return 'deep';
    if (score >= 50) return 'moderate';
    if (score >= 25) return 'surface';
    return 'none';
  }

  /** Get total questions answered */
  get length(): number {
    return this.entries.length;
  }
}
