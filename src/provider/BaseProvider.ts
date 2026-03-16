/**
 * Base provider adapter interface
 * All AI provider adapters must extend this class
 */

import type { ModelInfo, ProviderMessage, ChatOptions } from '../types/index.js';

/**
 * Abstract base class for AI provider adapters
 * Defines the contract that all providers must implement
 */
export abstract class BaseProviderAdapter {
  /**
   * Unique provider identifier (e.g., 'openai', 'anthropic')
   */
  abstract readonly id: string;

  /**
   * Display name shown in UI (e.g., 'OpenAI', 'Anthropic')
   */
  abstract readonly displayName: string;

  /**
   * Get available models from this provider
   * @returns Array of model information
   */
  abstract getModels(): Promise<ModelInfo[]> | ModelInfo[];

  /**
   * Send a chat request with streaming support
   * @param model - Model identifier to use
   * @param messages - Array of chat messages
   * @param options - Chat options (temperature, max tokens, etc.)
   * @param onChunk - Callback for each streaming chunk
   * @param signal - AbortSignal for cancellation
   */
  abstract chat(
    model: string,
    messages: ProviderMessage[],
    options: ChatOptions,
    onChunk: (chunk: string) => void,
    signal: AbortSignal
  ): Promise<void>;

  /**
   * Count tokens for text (default implementation using character-based estimation)
   * Providers can override for more accurate counting
   * @param text - The text to count tokens for
   * @returns Estimated token count
   */
  async countTokens(text: string): Promise<number> {
    // Default: character-based estimation
    if (!text || text.length === 0) {
      return 0;
    }
    return Math.ceil(text.length / 4);
  }

  /**
   * Validate API key format for this provider
   * @param key - The API key to validate
   * @returns True if the format is valid
   */
  protected abstract validateApiKey(key: string): boolean;

  /**
   * Format request for this provider's API
   * @param model - Model identifier
   * @param messages - Chat messages
   * @param options - Chat options
   * @returns Formatted request body
   */
  protected abstract formatRequest(
    model: string,
    messages: ProviderMessage[],
    options: ChatOptions
  ): Record<string, unknown>;

  /**
   * Parse streaming chunk from provider response
   * @param chunk - Raw chunk data from API
   * @returns Text content or null if not a content chunk
   */
  protected abstract parseChunk(chunk: string): string | null;
}
