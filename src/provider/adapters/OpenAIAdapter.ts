/**
 * OpenAI provider adapter
 * Implements chat functionality using OpenAI's API
 */

import type { ModelInfo, ProviderMessage, ChatOptions } from '../../types/index.js';
import { BaseProviderAdapter } from '../BaseProvider.js';
import { MessageConverter } from '../../utils/MessageConverter.js';
import { ErrorHandler } from '../../utils/ErrorHandler.js';
import { ConfigManager } from '../../config/ConfigManager.js';

/**
 * OpenAI API chat completion response
 */
interface OpenAIChatResponse {
  id: string;
  object: string;
  created: number;
  model: string;
  choices: Array<{
    index: number;
    delta: {
      role?: string;
      content?: string;
    };
    finish_reason: string | null;
  }>;
}

/**
 * Adapter for OpenAI API
 */
export class OpenAIAdapter extends BaseProviderAdapter {
  readonly id = 'openai';
  readonly displayName = 'OpenAI';

  private readonly API_URL = 'https://api.openai.com/v1/chat/completions';

  private configManager?: ConfigManager;

  /**
   * Set the config manager (called during extension activation)
   */
  setConfigManager(config: ConfigManager): void {
    this.configManager = config;
  }

  /**
   * Available OpenAI models
   */
  private readonly MODELS: ModelInfo[] = [
    {
      id: 'openai:gpt-4o',
      name: 'GPT-4o',
      provider: 'openai',
      family: 'gpt-4',
      version: '2024-05-13',
      maxInputTokens: 128000,
      maxOutputTokens: 4096,
      capabilities: {
        imageInput: true,
        toolCalling: true,
      },
    },
    {
      id: 'openai:gpt-4o-mini',
      name: 'GPT-4o Mini',
      provider: 'openai',
      family: 'gpt-4',
      version: '2024-05-13',
      maxInputTokens: 128000,
      maxOutputTokens: 16384,
      capabilities: {
        toolCalling: true,
      },
    },
    {
      id: 'openai:gpt-3.5-turbo',
      name: 'GPT-3.5 Turbo',
      provider: 'openai',
      family: 'gpt-3.5',
      version: '2023-11-06',
      maxInputTokens: 16385,
      maxOutputTokens: 4096,
      capabilities: {
        toolCalling: true,
      },
    },
  ];

  getModels(): ModelInfo[] {
    return this.MODELS;
  }

  async chat(
    model: string,
    messages: ProviderMessage[],
    options: ChatOptions,
    onChunk: (chunk: string) => void,
    signal: AbortSignal
  ): Promise<void> {
    if (!this.configManager) {
      throw new Error('ConfigManager not initialized');
    }

    const apiKey = await this.configManager.getApiKey('openai');
    if (!apiKey) {
      throw new Error('OpenAI API key not configured. Please run "Tingly Box: Manage Settings" to configure.');
    }

    // Extract model name (remove 'openai:' prefix if present)
    const modelName = model.includes(':') ? model.split(':')[1] : model;

    const requestBody = this.formatRequest(modelName, messages, options);

    try {
      const response = await fetch(this.API_URL, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${apiKey}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(requestBody),
        signal,
      });

      if (!response.ok) {
        const body = await response.text();
        const error = await ErrorHandler.createAPIError(response, body);
        throw error;
      }

      // Parse SSE stream
      await this.parseStream(response, onChunk, signal);
    } catch (error) {
      if (error instanceof Error) {
        if (error.name === 'AbortError') {
          // Request was cancelled, this is expected
          return;
        }
        throw error;
      }
      throw error;
    }
  }

  /**
   * Count tokens using character-based estimation
   * TODO: Integrate tiktoken for accurate counting
   */
  async countTokens(text: string, model?: string): Promise<number> {
    // Use character-based estimation for now
    // In the future, integrate tiktoken for accurate OpenAI tokenization
    if (!text || text.length === 0) {
      return 0;
    }
    return Math.ceil(text.length / 4);
  }

  protected validateApiKey(key: string): boolean {
    return key.startsWith('sk-') && key.length >= 40;
  }

  protected formatRequest(
    model: string,
    messages: ProviderMessage[],
    options: ChatOptions
  ): Record<string, unknown> {
    return {
      model,
      messages: MessageConverter.toOpenAIFormat(messages),
      stream: true,
      temperature: options.temperature ?? 0.7,
      max_tokens: options.maxTokens,
      stop: options.stop,
      ...(options.extra || {}),
    };
  }

  protected parseChunk(chunk: string): string | null {
    // SSE format: "data: {...}\n\n"
    if (!chunk.startsWith('data: ')) {
      return null;
    }

    const data = chunk.slice(6).trim();

    // Stream end marker
    if (data === '[DONE]') {
      return null;
    }

    try {
      const parsed = JSON.parse(data) as OpenAIChatResponse;
      const content = parsed.choices[0]?.delta?.content;
      return content || null;
    } catch {
      return null;
    }
  }

  /**
   * Parse Server-Sent Events stream from response
   */
  private async parseStream(
    response: Response,
    onChunk: (chunk: string) => void,
    signal: AbortSignal
  ): Promise<void> {
    if (!response.body) {
      throw new Error('Response body is empty');
    }

    const reader = response.body.getReader();
    const decoder = new TextDecoder('utf-8');
    let buffer = '';

    try {
      while (true) {
        const { done, value } = await reader.read();

        if (done || signal.aborted) {
          break;
        }

        buffer += decoder.decode(value, { stream: true });

        // Process complete SSE lines
        const lines = buffer.split('\n');
        buffer = lines.pop() || ''; // Keep incomplete line in buffer

        for (const line of lines) {
          const trimmed = line.trim();
          if (!trimmed || !trimmed.startsWith('data:')) {
            continue;
          }

          const content = this.parseChunk(trimmed);
          if (content) {
            onChunk(content);
          }
        }
      }
    } finally {
      reader.releaseLock();
    }
  }
}
