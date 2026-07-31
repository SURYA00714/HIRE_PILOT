import { genAI } from './gemini';

export const generateNextQuestion = async (
  role: string,
  experienceLevel: string,
  previousQA: { question: string, answer: string }[],
  currentDifficulty: number
) => {
  const model = genAI.getGenerativeModel({ model: "gemini-2.5-flash" });

  const prompt = `
  You are an expert technical interviewer for the role of ${role} (${experienceLevel} experience).
  The current difficulty level is ${currentDifficulty}/10.
  
  Previous Questions and Answers:
  ${JSON.stringify(previousQA)}

  Based on the user's previous answers, adapt the interview. If they answered well, increase the difficulty and ask deeper follow-up questions. If they struggled, ask more foundational questions or provide a hint in your response before asking the next question.
  
  Provide a JSON output ONLY with the following structure:
  {
    "nextQuestion": "The next question you want to ask...",
    "newDifficulty": 6,
    "feedbackOnLastAnswer": "A brief internal note on how they did on the last question"
  }
  `;

  const result = await model.generateContent(prompt);
  let text = result.response.text();
  text = text.replace(/```json/g, '').replace(/```/g, '').trim();
  
  return JSON.parse(text);
};

export const generateFinalEvaluation = async (
  role: string,
  experienceLevel: string,
  qaHistory: { question: string, answer: string }[]
) => {
  const model = genAI.getGenerativeModel({ model: "gemini-2.5-flash" });

  const prompt = `
  You are an expert technical interviewer evaluating a candidate for the role of ${role} (${experienceLevel} experience).
  
  Full Interview Transcript:
  ${JSON.stringify(qaHistory)}

  Generate a final evaluation. Provide a JSON output ONLY with the following structure:
  {
    "overallScore": 85,
    "technicalAccuracy": 80,
    "communication": 90,
    "problemSolving": 85,
    "strengths": ["Clear communication", "Good understanding of core concepts"],
    "weaknesses": ["Struggled with system design questions"],
    "detailedFeedback": "The candidate performed well overall, but needs to work on scalable architecture...",
    "recommendedTopics": ["System Design", "Microservices"]
  }
  `;

  const result = await model.generateContent(prompt);
  let text = result.response.text();
  text = text.replace(/```json/g, '').replace(/```/g, '').trim();
  
  return JSON.parse(text);
};
