/**
 * Model configuration constants
 *
 * These are fallback values used when the API doesn't provide model information.
 * The API should ideally return all model metadata (family, tokens, capabilities).
 */

/**
 * Token limits for a specific model family
 */
export interface ModelTokenLimits {
  maxInputTokens: number;
  maxOutputTokens: number;
}

/**
 * Default token limits for models (conservative fallback values)
 */
export const DEFAULT_TOKEN_LIMITS = {
  /** Default maximum input tokens */
  MAX_INPUT_TOKENS: 128000,
  /** Default maximum output tokens */
  MAX_OUTPUT_TOKENS: 4096,
};

/**
 * Example model family specific token limits
 * NOTE: These are EXAMPLES ONLY for reference. Do not use these in adapters.
 * Different providers may have different limits for the same model family.
 * Always use values provided by the API.
 *
 * @example
 * // VSCode internal model info example:
 * interface LanguageModelChatInformation {
 *   id: string;
 *   name: string;
 *   family: string;        // e.g., "gpt-4", "claude-3"
 *   version: string;
 *   maxInputTokens: number;
 *   maxOutputTokens: number;
 *   capabilities: {
 *     imageInput?: boolean;
 *     toolCalling?: boolean;
 *   };
 * }
 */
export const MODEL_FAMILY_LIMITS_EXAMPLES: Record<string, ModelTokenLimits> = {
  /** GPT-4 family example */
  'gpt-4-example': {
    maxInputTokens: 128000,
    maxOutputTokens: 4096,
  },
  /** Claude 3 family example */
  'claude-3-example': {
    maxInputTokens: 200000,
    maxOutputTokens: 8192,
  },
  /** DeepSeek example */
  'deepseek-example': {
    maxInputTokens: 128000,
    maxOutputTokens: 4096,
  },
};

/**
 * Example model capability patterns
 * NOTE: These are EXAMPLES ONLY. Do not use these in adapters.
 * The API should provide capability information.
 */
export const MODEL_PATTERNS_EXAMPLES = {
  /** Example patterns that might indicate vision support */
  VISION_EXAMPLE: ['vision', 'gpt-4o', 'claude-3'],
  /** Example patterns that might indicate tool calling exclusion */
  TOOLS_EXCLUDED_EXAMPLE: ['instruct', 'base'],
};

/**
 * Example API key validation requirements
 * NOTE: These are EXAMPLES ONLY. Do not use these in adapters.
 * The API should validate keys on the server side.
 */
export const API_KEY_REQUIREMENTS_EXAMPLES = {
  /** Example minimum length for OpenAI API keys */
  OPENAI_MIN_LENGTH_EXAMPLE: 20,
  /** Example minimum length for Anthropic API keys */
  ANTHROPIC_MIN_LENGTH_EXAMPLE: 20,
};

