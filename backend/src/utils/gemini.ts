import { GoogleGenerativeAI } from '@google/generative-ai';

const apiKey = process.env.GEMINI_API_KEY || 'placeholder-api-key';
export const genAI = new GoogleGenerativeAI(apiKey);

export const analyzeResume = async (resumeText: string, jobRole: string) => {
  const model = genAI.getGenerativeModel({ model: "gemini-2.5-flash" });

  const prompt = `
  You are an expert HR recruiter. Analyze the following resume for the role of ${jobRole}.
  Resume Text: ${resumeText}

  Provide a JSON output ONLY with the following structure:
  {
    "atsScore": 85,
    "skills": ["JavaScript", "React"],
    "missingSkills": ["Docker", "AWS"],
    "strengths": ["Strong frontend experience", "Good education"],
    "weaknesses": ["Lack of cloud deployment experience"],
    "improvementSuggestions": "Add more details on backend projects."
  }
  `;

  const result = await model.generateContent(prompt);
  const response = result.response;
  let text = response.text();
  
  // Clean up potential markdown formatting in JSON response
  text = text.replace(/```json/g, '').replace(/```/g, '').trim();
  
  return JSON.parse(text);
};
