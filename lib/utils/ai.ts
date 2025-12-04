/**
 * AI utility functions using LiteLLM
 * 
 * LiteLLM provides OpenAI-compatible API for multiple LLM providers.
 * Currently configured with Gemini 2.5 Flash for vision capabilities.
 */

const LITELLM_BASE_URL = process.env.LITELLM_BASE_URL;
const LITELLM_API_KEY = process.env.LITELLM_API_KEY;

export class AIError extends Error {
  constructor(
    message: string,
    public readonly code: string,
    public readonly statusCode?: number
  ) {
    super(message);
    this.name = "AIError";
  }
}

/**
 * Validates that LiteLLM environment variables are configured
 */
export function isAIConfigured(): boolean {
  return !!(LITELLM_BASE_URL && LITELLM_API_KEY);
}
