import { GoogleGenerativeAI } from '@google/generative-ai';
import { createLogger } from './logger';

// ── AI Client Service: Model-Agnostic Gemini Wrapper ───────────────────────
// Retry logic, exponential backoff, timeout handling, safe JSON parsing.
// Gemini is replaceable without changing business logic.

const apiKey = process.env.GEMINI_API_KEY || '';
const genAI = new GoogleGenerativeAI(apiKey);

const MAX_RETRIES = 3;
const BASE_DELAY_MS = 200;    // 200ms, 400ms, 800ms
const TIMEOUT_MS = 30000;     // 30 second hard timeout

export interface AIResponse {
  success: boolean;
  rawText: string;
  parsedJSON: any | null;
  model: string;
  promptTokens?: number;
  responseTokens?: number;
  latencyMs: number;
  retryCount: number;
  error?: string;
}

/**
 * Send a prompt to Gemini with retry logic and safe JSON extraction.
 * Returns a structured AIResponse — never throws.
 */
export async function callGemini(
  prompt: string,
  correlationId: string,
  options?: {
    model?: string;
    temperature?: number;
    maxTokens?: number;
    responseMimeType?: string;
  }
): Promise<AIResponse> {
  const logger = createLogger('AIClient', correlationId);
  const modelName = options?.model || 'gemini-1.5-flash';
  let retryCount = 0;
  let lastError: Error | null = null;

  while (retryCount <= MAX_RETRIES) {
    const startTime = Date.now();

    try {
      if (retryCount > 0) {
        const delay = BASE_DELAY_MS * Math.pow(2, retryCount - 1);
        logger.info('ai_retry', { retryCount, delayMs: delay });
        await sleep(delay);
      }

      const model = genAI.getGenerativeModel({
        model: modelName,
        generationConfig: {
          temperature: options?.temperature ?? 0.7,
          maxOutputTokens: options?.maxTokens ?? 2048,
          responseMimeType: options?.responseMimeType || 'application/json',
        },
      });

      // Race between Gemini call and timeout
      const result = await Promise.race([
        model.generateContent(prompt),
        timeoutPromise(TIMEOUT_MS),
      ]);

      if (!result || !('response' in result)) {
        throw new Error('Gemini request timed out');
      }

      const rawText = result.response.text();
      const latencyMs = Date.now() - startTime;

      // Try to extract JSON from the response
      const parsedJSON = safeParseJSON(rawText);

      logger.info('ai_call_success', {
        model: modelName,
        latencyMs,
        retryCount,
        responseLength: rawText.length,
        jsonParsed: parsedJSON !== null,
      });

      return {
        success: true,
        rawText,
        parsedJSON,
        model: modelName,
        latencyMs,
        retryCount,
      };
    } catch (err: any) {
      lastError = err;
      const latencyMs = Date.now() - startTime;
      logger.error('ai_call_failed', err, { retryCount, latencyMs, model: modelName });
      retryCount++;
    }
  }

  // All retries exhausted
  logger.error('ai_call_exhausted', lastError || new Error('Unknown'), {
    totalRetries: MAX_RETRIES,
  });

  return {
    success: false,
    rawText: '',
    parsedJSON: null,
    model: modelName,
    latencyMs: 0,
    retryCount: MAX_RETRIES,
    error: lastError?.message || 'All retries exhausted',
  };
}

/** Safely extract and parse JSON from AI response text */
function safeParseJSON(text: string): any | null {
  // Strip markdown code fences
  let cleaned = text.replace(/```json\s*/gi, '').replace(/```\s*/g, '').trim();

  // Try direct parse first
  try {
    return JSON.parse(cleaned);
  } catch {}

  // Try to find JSON object in the text
  const jsonMatch = cleaned.match(/\{[\s\S]*\}/);
  if (jsonMatch) {
    try {
      return JSON.parse(jsonMatch[0]);
    } catch {}
  }

  // Try to find JSON array
  const arrayMatch = cleaned.match(/\[[\s\S]*\]/);
  if (arrayMatch) {
    try {
      return JSON.parse(arrayMatch[0]);
    } catch {}
  }

  return null;
}

function sleep(ms: number): Promise<void> {
  return new Promise(resolve => setTimeout(resolve, ms));
}

function timeoutPromise(ms: number): Promise<never> {
  return new Promise((_, reject) =>
    setTimeout(() => reject(new Error(`Gemini timeout after ${ms}ms`)), ms)
  );
}

export { safeParseJSON };
