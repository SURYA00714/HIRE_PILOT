import { createLogger } from './logger';

// ── Prompt Builder: 9-Layer Deterministic Context Construction ──────────────
// No string concatenation. Each layer is a pure function, independently testable.
// Every prompt includes full conversation history and explicit constraints.

export interface PromptContext {
  // Identity
  interviewType: string;
  // Candidate
  role: string;
  experienceLevel: string;
  // Resume
  resumeContext: string;
  extractedSkills: string[];
  // Conversation
  previousQA: { question: string; answer: string; score?: number; feedback?: string }[];
  // Difficulty
  currentDifficulty: number;
  weakTopics: string[];
  strongTopics: string[];
  // Question
  questionCount: number;
  maxQuestions: number;
}

// ── Layer Builders (each is a pure function) ────────────────────────────────

function buildIdentityLayer(type: string): string {
  const personas: Record<string, string> = {
    hr: 'You are a professional HR interviewer at a Fortune 500 company. Focus on cultural fit, motivation, career goals, salary expectations, and company alignment.',
    behavioral: 'You are a behavioral interviewer using the STAR method (Situation, Task, Action, Result). Ask situational questions about past experiences, leadership, conflict resolution, and teamwork.',
    technical: 'You are a senior technical interviewer at a top-tier technology company. Ask about data structures, algorithms, system design, databases, APIs, and software architecture.',
    coding: 'You are a coding interview expert at a FAANG-level company. Present algorithmic problems, discuss time/space complexity, and evaluate problem-solving approach.',
    system_design: 'You are a system design interviewer at a large-scale distributed systems company. Ask about designing scalable systems, microservices, load balancing, caching, and database sharding.',
    'system design': 'You are a system design interviewer at a large-scale distributed systems company. Ask about designing scalable systems, microservices, load balancing, caching, and database sharding.',
  };
  return personas[type.toLowerCase()] || 'You are an expert technical interviewer conducting a comprehensive interview.';
}

function buildInstructionLayer(ctx: PromptContext): string {
  return `
INSTRUCTIONS (MANDATORY):
- Generate exactly ONE clear, specific interview question
- The question MUST be appropriate for difficulty level ${ctx.currentDifficulty}/10
- Question ${ctx.questionCount + 1} of ${ctx.maxQuestions} total
- If the candidate answered well previously (score > 70), increase depth and ask follow-ups
- If the candidate struggled (score < 40), reduce difficulty and ask more foundational questions
- NEVER repeat a question already asked in this interview
- Keep questions conversational but professional
- Tie questions to the candidate's resume/projects when possible`;
}

function buildBehaviorLayer(): string {
  return `
BEHAVIOR RULES:
- Maintain a professional, encouraging tone
- Provide brief, constructive feedback on the previous answer (if any)
- Do not ask compound questions (one question at a time)
- Do not reveal the expected answer
- Do not make assumptions about candidate knowledge not evidenced in their answers or resume`;
}

function buildCandidateLayer(ctx: PromptContext): string {
  return `
CANDIDATE PROFILE:
- Target Role: ${ctx.role}
- Experience Level: ${ctx.experienceLevel}
- Current Interview Progress: Question ${ctx.questionCount + 1} of ${ctx.maxQuestions}
- Current Difficulty Level: ${ctx.currentDifficulty}/10`;
}

function buildResumeLayer(ctx: PromptContext): string {
  if (!ctx.resumeContext && ctx.extractedSkills.length === 0) return '';
  
  let layer = '\nCANDIDATE RESUME DATA (use to personalize questions):';
  if (ctx.extractedSkills.length > 0) {
    layer += `\n- Verified Skills (canonical): ${ctx.extractedSkills.join(', ')}`;
  }
  if (ctx.resumeContext) {
    // Truncate to prevent token overflow but keep meaningful content
    const truncated = ctx.resumeContext.substring(0, 2000);
    layer += `\n- Resume Text:\n${truncated}`;
  }
  return layer;
}

function buildConversationLayer(ctx: PromptContext): string {
  if (ctx.previousQA.length === 0) return '\nCONVERSATION HISTORY: This is the first question. No prior exchanges.';
  
  let layer = '\nFULL CONVERSATION HISTORY (you MUST read all of this before generating the next question):';
  ctx.previousQA.forEach((qa, i) => {
    layer += `\n\n--- Exchange ${i + 1} ---`;
    layer += `\nQ: ${qa.question}`;
    layer += `\nA: ${qa.answer || '[No answer provided]'}`;
    if (qa.score !== undefined) layer += `\nScore: ${qa.score}/100`;
    if (qa.feedback) layer += `\nFeedback: ${qa.feedback}`;
  });
  return layer;
}

function buildWeaknessLayer(ctx: PromptContext): string {
  let layer = '';
  if (ctx.weakTopics.length > 0) {
    layer += `\nIDENTIFIED WEAK AREAS (prioritize probing these): ${ctx.weakTopics.join(', ')}`;
  }
  if (ctx.strongTopics.length > 0) {
    layer += `\nIDENTIFIED STRENGTHS (balance with these for engagement): ${ctx.strongTopics.join(', ')}`;
  }
  return layer;
}

function buildOutputSchemaLayer(purpose: 'question' | 'evaluation'): string {
  if (purpose === 'question') {
    return `
OUTPUT FORMAT (respond with this exact JSON structure, nothing else):
{
  "nextQuestion": "Your next interview question here",
  "topic": "The primary topic this question covers (e.g., 'data_structures', 'system_design', 'leadership')",
  "subtopic": "Specific subtopic (e.g., 'binary_trees', 'caching', 'conflict_resolution')",
  "newDifficulty": 5,
  "feedbackOnLastAnswer": "Brief constructive feedback on their previous answer, or null if first question",
  "followUpDepth": 0,
  "reasoning": "Brief explanation of why you chose this question and topic"
}`;
  }
  
  return `
OUTPUT FORMAT (respond with this exact JSON structure, nothing else):
{
  "overallScore": 0,
  "technicalAccuracy": 0,
  "problemSolving": 0,
  "communication": 0,
  "confidence": 0,
  "knowledgeDepth": 0,
  "responseStructure": 0,
  "SVAR_Fluency": 0,
  "SVAR_Vocabulary": 0,
  "AMCAT_LogicalReasoning": 0,
  "strengths": ["strength1", "strength2"],
  "weaknesses": ["weakness1", "weakness2"],
  "detailedFeedback": "Comprehensive paragraph of feedback",
  "recommendedTopics": ["topic1", "topic2"],
  "hiringRecommendation": "STRONG_HIRE | HIRE | MAYBE | NO_HIRE | STRONG_NO_HIRE",
  "topicBreakdown": [
    {"topic": "topic_name", "score": 75, "feedback": "specific feedback"}
  ]
}`;
}

function buildConstraintLayer(): string {
  return `
ABSOLUTE CONSTRAINTS (Gemini CANNOT violate these):
- You CANNOT decide to end or continue the interview
- You CANNOT modify difficulty rules (backend controls this)
- You CANNOT skip the JSON output format
- You CANNOT add fields not in the schema
- You CANNOT provide scores outside 0-100 range
- You CANNOT recommend hiring/firing decisions that override business rules
- You MUST evaluate the SEMANTIC MEANING of answers, not just grammar
- If the candidate typed gibberish, random characters, or non-meaningful text, ALL scores MUST be 0
- If the candidate gave one-word dismissive answers to complex questions, scores MUST be below 30`;
}

// ── Public API ──────────────────────────────────────────────────────────────

/** Build a complete question generation prompt from layered context */
export function buildQuestionPrompt(ctx: PromptContext, correlationId: string): string {
  const logger = createLogger('PromptBuilder', correlationId);
  
  const layers = [
    buildIdentityLayer(ctx.interviewType),
    buildInstructionLayer(ctx),
    buildBehaviorLayer(),
    buildCandidateLayer(ctx),
    buildResumeLayer(ctx),
    buildConversationLayer(ctx),
    buildWeaknessLayer(ctx),
    buildOutputSchemaLayer('question'),
    buildConstraintLayer(),
  ].filter(Boolean);

  const prompt = layers.join('\n');
  logger.debug('prompt_built', { purpose: 'question', layerCount: layers.length, promptLength: prompt.length });
  return prompt;
}

/** Build a complete final evaluation prompt from layered context */
export function buildEvaluationPrompt(ctx: PromptContext, fillerWordCount: number, correlationId: string): string {
  const logger = createLogger('PromptBuilder', correlationId);
  
  const evalInstructions = `
You are an elite, highly strict AMCAT & SVAR AI Examiner evaluating a candidate for "${ctx.role}" (${ctx.experienceLevel}).

EVALUATION CRITERIA (apply ALL with equal rigor):
1. TECHNICAL ACCURACY: Are the candidate's technical claims factually correct? Cross-reference with known CS/engineering principles.
2. PROBLEM SOLVING: Did the candidate demonstrate structured thinking and approach?
3. COMMUNICATION: Was the response clear, structured, and professional?
4. CONFIDENCE: Did the candidate seem certain and knowledgeable?
5. KNOWLEDGE DEPTH: Did the candidate go beyond surface-level answers?
6. RESPONSE STRUCTURE: Did the candidate organize their thoughts logically?
7. SVAR FLUENCY: How naturally did the candidate express ideas? Filler words detected: ${fillerWordCount}
8. SVAR VOCABULARY: Did the candidate use appropriate technical vocabulary?
9. AMCAT LOGICAL REASONING: Did the candidate demonstrate logical deduction?

CRITICAL SCORING RULES:
- Gibberish/random text → ALL scores = 0, hiringRecommendation = "STRONG_NO_HIRE"
- One-word/dismissive answers to complex questions → overallScore < 30
- Factually incorrect technical answers → technicalAccuracy < 40
- Off-topic answers that dodge the question → overallScore < 40
- Good structure but wrong content → communication high, technicalAccuracy low
- Scores MUST be justified — do not assign high scores without evidence`;

  const layers = [
    evalInstructions,
    buildCandidateLayer(ctx),
    buildResumeLayer(ctx),
    buildConversationLayer(ctx),
    buildOutputSchemaLayer('evaluation'),
    buildConstraintLayer(),
  ].filter(Boolean);

  const prompt = layers.join('\n');
  logger.debug('prompt_built', { purpose: 'evaluation', layerCount: layers.length, promptLength: prompt.length });
  return prompt;
}

/** Build a per-answer evaluation prompt for inline scoring during the interview */
export function buildAnswerEvaluationPrompt(
  question: string,
  answer: string,
  ctx: PromptContext,
  correlationId: string
): string {
  const logger = createLogger('PromptBuilder', correlationId);

  const prompt = `
${buildIdentityLayer(ctx.interviewType)}

Evaluate this specific answer in the context of the interview.

QUESTION: ${question}
CANDIDATE'S ANSWER: ${answer}
DIFFICULTY LEVEL: ${ctx.currentDifficulty}/10
ROLE: ${ctx.role} (${ctx.experienceLevel})

${ctx.extractedSkills.length > 0 ? `CANDIDATE'S CLAIMED SKILLS: ${ctx.extractedSkills.join(', ')}` : ''}

CRITICAL: Evaluate the SEMANTIC MEANING of the answer relative to the question.
- If the answer is gibberish or random characters: score = 0
- If the answer is off-topic or doesn't address the question: score < 20
- If the answer is technically incorrect: score < 40
- If the answer is superficial but correct: score 40-60
- If the answer is correct and detailed: score 60-80
- If the answer is exceptional with examples: score 80-100

Respond with JSON ONLY:
{
  "score": 0,
  "technicalAccuracy": 0,
  "communication": 0,
  "confidence": 0,
  "feedback": "Brief constructive feedback",
  "mistakesIdentified": ["mistake1"],
  "keywordsMissed": ["keyword1"],
  "improvementTags": ["tag1"],
  "isGibberish": false,
  "isOffTopic": false,
  "topic": "detected_topic"
}

${buildConstraintLayer()}`;

  logger.debug('prompt_built', { purpose: 'answer_evaluation', promptLength: prompt.length });
  return prompt;
}
