import { createLogger } from './logger';
import { callGemini } from './ai-client.service';
import { safeParseJSON } from './ai-client.service';

// ── Resume Intelligence: Entity Extraction & Canonical Normalization ────────

export interface ExtractedResumeEntities {
  skills: string[];
  projects: string[];
  experienceYears: number;
  educationLevel: string;
  frameworks: string[];
  languages: string[];
  certifications: string[];
  atsScore: number;
  atsFeedback: string;
}

export class ResumeIntelligence {
  /**
   * Extract structured entities from raw resume text using Gemini.
   */
  static async extractEntities(
    rawText: string,
    correlationId: string
  ): Promise<ExtractedResumeEntities> {
    const logger = createLogger('ResumeIntelligence', correlationId);
    
    if (!rawText || rawText.trim().length < 50) {
      logger.warn('extract_entities_failed', { reason: 'text too short' });
      return this.emptyEntities();
    }

    const prompt = `
You are an expert technical recruiter and resume parser.
Extract the following information from the resume text provided below.

RULES:
1. ONLY return a valid JSON object. No markdown, no conversational text.
2. For skills, frameworks, and languages, you MUST normalize them to lowercase, standard names (e.g., "NodeJS" -> "node.js", "React.js" -> "react", "C++" -> "cpp").
3. Estimate total years of professional experience as a number (0 if none or unclear).
4. Summarize top 3 projects briefly (max 10 words each).

RESUME TEXT:
${rawText.substring(0, 8000)} // Truncated to avoid token limits

OUTPUT SCHEMA:
{
  "skills": ["skill1", "skill2"],
  "projects": ["project1 summary", "project2 summary"],
  "experienceYears": 3,
  "educationLevel": "bachelors | masters | phd | none",
  "frameworks": ["react", "express"],
  "languages": ["javascript", "python"],
  "certifications": ["aws solutions architect"],
  "atsScore": 85,
  "atsFeedback": "Good match for software engineering roles but lacks cloud experience."
}
`;

    const aiResponse = await callGemini(prompt, correlationId, { temperature: 0.1 });
    
    if (!aiResponse.success || !aiResponse.parsedJSON) {
      logger.error('resume_extraction_failed', new Error('Failed to parse resume JSON'));
      return this.emptyEntities();
    }

    const data = aiResponse.parsedJSON;

    // Normalize and validate the parsed data
    const result: ExtractedResumeEntities = {
      skills: this.normalizeArray(data.skills),
      projects: this.normalizeArray(data.projects),
      experienceYears: typeof data.experienceYears === 'number' ? data.experienceYears : 0,
      educationLevel: typeof data.educationLevel === 'string' ? data.educationLevel.toLowerCase() : 'none',
      frameworks: this.normalizeArray(data.frameworks),
      languages: this.normalizeArray(data.languages),
      certifications: this.normalizeArray(data.certifications),
      atsScore: typeof data.atsScore === 'number' ? data.atsScore : 50,
      atsFeedback: typeof data.atsFeedback === 'string' ? data.atsFeedback : 'Resume parsed successfully.',
    };

    logger.info('resume_extracted', { 
      skillsCount: result.skills.length,
      experienceYears: result.experienceYears 
    });

    return result;
  }

  /**
   * Run canonical normalization on a raw list of skills (e.g., from user input).
   */
  static normalizeSkills(skills: string[]): string[] {
    if (!Array.isArray(skills)) return [];
    
    const canonicalMap: Record<string, string> = {
      'node': 'node.js',
      'nodejs': 'node.js',
      'reactjs': 'react',
      'react.js': 'react',
      'js': 'javascript',
      'ts': 'typescript',
      'cpp': 'c++',
      'c plus plus': 'c++',
      'c#': 'csharp',
      'py': 'python',
      'golang': 'go',
      'k8s': 'kubernetes',
      'aws': 'amazon web services',
      'gcp': 'google cloud',
      'vuejs': 'vue',
      'vue.js': 'vue',
    };

    const normalized = skills.map(s => {
      if (typeof s !== 'string') return '';
      const lower = s.toLowerCase().trim();
      return canonicalMap[lower] || lower;
    }).filter(s => s.length > 0);

    // Deduplicate
    return Array.from(new Set(normalized));
  }

  private static emptyEntities(): ExtractedResumeEntities {
    return {
      skills: [],
      projects: [],
      experienceYears: 0,
      educationLevel: 'none',
      frameworks: [],
      languages: [],
      certifications: [],
      atsScore: 0,
      atsFeedback: 'Failed to parse resume.',
    };
  }

  private static normalizeArray(arr: any): string[] {
    if (Array.isArray(arr)) {
      return this.normalizeSkills(arr);
    }
    return [];
  }
}
