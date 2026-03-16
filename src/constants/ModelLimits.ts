/**
 * Model configuration constants
 * Default token limits and capabilities for various model families
 */

/**
 * Token limits for a specific model family
 */
export interface ModelTokenLimits {
  maxInputTokens: number;
  maxOutputTokens: number;
}

/**
 * Default token limits for models
 */
export const DEFAULT_TOKEN_LIMITS = {
  /** Default maximum input tokens */
  MAX_INPUT_TOKENS: 128000,
  /** Default maximum output tokens */
  MAX_OUTPUT_TOKENS: 4096,
};

/**
 * Model family specific token limits
 */
export const MODEL_FAMILY_LIMITS: Record<string, ModelTokenLimits> = {
  /** GPT-4 family token limits */
  'gpt-4': {
    maxInputTokens: 128000,
    maxOutputTokens: 4096,
  },
  /** GPT-4 mini variant */
  'gpt-4-mini': {
    maxInputTokens: 128000,
    maxOutputTokens: 16384,
  },
  /** GPT-3.5 family token limits */
  'gpt-3.5': {
    maxInputTokens: 16385,
    maxOutputTokens: 4096,
  },
  /** Claude 3 family token limits */
  'claude-3': {
    maxInputTokens: 200000,
    maxOutputTokens: 8192,
  },
  /** Claude 2 family token limits */
  'claude-2': {
    maxInputTokens: 100000,
    maxOutputTokens: 4096,
  },
  /** DeepSeek R1 token limits */
  'deepseek-r1': {
    maxInputTokens: 64000,
    maxOutputTokens: 8000,
  },
  /** DeepSeek family token limits */
  'deepseek': {
    maxInputTokens: 128000,
    maxOutputTokens: 4096,
  },
};

/**
 * Model capability detection patterns
 */
export const MODEL_PATTERNS = {
  /** Patterns that indicate vision support */
  VISION: ['vision', 'gpt-4o', 'claude-3'],
  /** Patterns that indicate tool calling support */
  TOOLS_EXCLUDED: ['instruct', 'base'],
};

/**
 * Minimum API key lengths for validation
 */
export const API_KEY_REQUIREMENTS = {
  /** Minimum length for OpenAI API keys */
  OPENAI_MIN_LENGTH: 20,
  /** Minimum length for Anthropic API keys */
  ANTHROPIC_MIN_LENGTH: 20,
};
