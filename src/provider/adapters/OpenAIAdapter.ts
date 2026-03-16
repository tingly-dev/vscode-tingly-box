/**
 * OpenAI-compatible provider adapter
 * Implements chat functionality using OpenAI-compatible APIs
 * Fetches available models dynamically from the API
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
 * OpenAI models API response
 */
interface OpenAIModelsResponse {
  object: string;
  data: Array<{
    id: string;
    object: string;
    created: number;
    owned_by: string;
  }>;
}

/**
 * Adapter for OpenAI-compatible APIs
 */
export class OpenAIAdapter extends BaseProviderAdapter {
  readonly id = 'default';
  readonly displayName = 'Tingly Box VSCode';

  private configManager?: ConfigManager;
  private cachedModels: ModelInfo[] | null = null;

  /**
   * Set the config manager (called during extension activation)
   */
  setConfigManager(config: ConfigManager): void {
    this.configManager = config;
  }

  /**
   * Get available models by fetching from API
   */
  async getModels(): Promise<ModelInfo[]> {
    if (!this.configManager) {
      throw new Error('ConfigManager not initialized');
    }

    const config = await this.configManager.getProviderConfig('default');
    if (!config) {
      return []; // Return empty if not configured
    }

    // Return cached models if available
    if (this.cachedModels) {
      return this.cachedModels;
    }

    try {
      // Fetch models from API
      const modelsUrl = new URL('/models', config.baseUrl).toString();
      const response = await fetch(modelsUrl, {
        method: 'GET',
        headers: {
          'Authorization': `Bearer ${config.token}`,
        },
      });

      if (!response.ok) {
        // If models endpoint fails, return default models
        return this.getDefaultModels();
      }

      const data = (await response.json()) as OpenAIModelsResponse;

      // Convert API response to ModelInfo
      this.cachedModels = this.parseModelsFromAPI(data);
      return this.cachedModels;
    } catch (error) {
      // On error, return default models
      return this.getDefaultModels();
    }
  }

  /**
   * Parse models from API response
   */
  private parseModelsFromAPI(response: OpenAIModelsResponse): ModelInfo[] {
    return response.data.map((model) => {
      const modelId = `default:${model.id}`;

      // Estimate token limits based on model name
      let maxInputTokens = 128000;
      let maxOutputTokens = 4096;
      let family = model.id.split('-')[0] || 'unknown';
      let version = new Date(model.created * 1000).toISOString().split('T')[0];

      // Adjust based on model name patterns
      if (model.id.includes('gpt-4')) {
        family = 'gpt-4';
        maxInputTokens = 128000;
        maxOutputTokens = model.id.includes('mini') ? 16384 : 4096;
      } else if (model.id.includes('gpt-3.5')) {
        family = 'gpt-3.5';
        maxInputTokens = 16385;
        maxOutputTokens = 4096;
      } else if (model.id.includes('claude')) {
        family = 'claude';
        maxInputTokens = 200000;
        maxOutputTokens = 8192;
      }

      return {
        id: modelId,
        name: model.id,
        provider: 'default',
        family,
        version,
        maxInputTokens,
        maxOutputTokens,
        capabilities: {
          toolCalling: true,
        },
      };
    });
  }

  /**
   * Get default models as fallback
   */
  private getDefaultModels(): ModelInfo[] {
    return [
      {
        id: 'default:gpt-4o',
        name: 'GPT-4o',
        provider: 'default',
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
        id: 'default:gpt-4o-mini',
        name: 'GPT-4o Mini',
        provider: 'default',
        family: 'gpt-4',
        version: '2024-05-13',
        maxInputTokens: 128000,
        maxOutputTokens: 16384,
        capabilities: {
          toolCalling: true,
        },
      },
      {
        id: 'default:claude-3-5-sonnet',
        name: 'Claude 3.5 Sonnet',
        provider: 'default',
        family: 'claude-3',
        version: '2024-06-20',
        maxInputTokens: 200000,
        maxOutputTokens: 8192,
        capabilities: {
          imageInput: true,
          toolCalling: true,
        },
      },
    ];
  }

  /**
   * Clear cached models (call when configuration changes)
   */
  clearModelCache(): void {
    this.cachedModels = null;
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

    const config = await this.configManager.getProviderConfig('default');
    if (!config) {
      throw new Error(
        'Tingly Box VSCode not configured. Please run "Tingly Box VSCode: Manage Settings" to configure.'
      );
    }

    // Extract model name (remove 'default:' prefix if present)
    const modelName = model.includes(':') ? model.split(':')[1] : model;

    const requestBody = this.formatRequest(modelName, messages, options);

    // Build API URL from base URL
    const apiUrl = new URL('/chat/completions', config.baseUrl).toString();

    try {
      const response = await fetch(apiUrl, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${config.token}`,
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
    // Accept any token format since users provide custom endpoints
    return key.length >= 10;
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
