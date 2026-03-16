/**
 * OpenAI-compatible provider adapter
 * Implements chat functionality using OpenAI-compatible APIs
 * Fetches model list from remote API
 */

import type { ModelInfo, ProviderMessage, ChatOptions } from '../../types/index.js';
import { BaseProviderAdapter } from '../BaseProvider.js';
import { MessageConverter } from '../../utils/MessageConverter.js';
import { ErrorHandler } from '../../utils/ErrorHandler.js';
import { ConfigManager } from '../../config/ConfigManager.js';
import * as vscode from 'vscode';

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
  private outputChannel?: vscode.OutputChannel;

  /**
   * Set the config manager (called during extension activation)
   */
  setConfigManager(config: ConfigManager): void {
    this.configManager = config;
  }

  /**
   * Set output channel for logging
   */
  setOutputChannel(output: vscode.OutputChannel): void {
    this.outputChannel = output;
  }

  /**
   * Log debug message
   */
  private log(message: string): void {
    if (this.outputChannel) {
      this.outputChannel.appendLine(`[OpenAIAdapter] ${message}`);
    }
  }

  /**
   * Get available models from cache or remote API
   */
  async getModels(): Promise<ModelInfo[]> {
    // Return cached models if available
    if (this.cachedModels) {
      this.log(`Returning ${this.cachedModels.length} cached models`);
      return this.cachedModels;
    }

    // Fetch from remote API
    return this.fetchModels();
  }

  /**
   * Fetch models from remote API
   * This can be called manually via the "Tingly Box: Fetch Models" command
   */
  async fetchModels(): Promise<ModelInfo[]> {
    if (!this.configManager) {
      throw new Error('ConfigManager not initialized');
    }

    const config = await this.configManager.getProviderConfig('default');
    if (!config) {
      throw new Error('Provider not configured. Please configure Base URL and Token first.');
    }

    // Fetch models from API - use baseUrl directly
    const modelsUrl = config.baseUrl.endsWith('/')
      ? `${config.baseUrl}models`
      : `${config.baseUrl}/models`;

    this.log(`Fetching models from: ${modelsUrl}`);

    const response = await fetch(modelsUrl, {
      method: 'GET',
      headers: {
        'Authorization': `Bearer ${config.token}`,
      },
    });

    this.log(`Models API response status: ${response.status} ${response.statusText}`);

    if (!response.ok) {
      const body = await response.text();
      this.log(`Models API error response: ${body.substring(0, 200)}`);
      const error = await ErrorHandler.createAPIError(response, body);
      throw error;
    }

    const data = (await response.json()) as OpenAIModelsResponse;
    this.log(`Received ${data.data.length} models from API`);

    // Convert API response to ModelInfo and cache
    this.cachedModels = this.parseModelsFromAPI(data);

    for (const model of this.cachedModels) {
      this.log(`  - ${model.name}: ${model.maxInputTokens} input, ${model.maxOutputTokens} output tokens`);
    }

    return this.cachedModels;
  }

  /**
   * Clear cached models
   */
  clearModelCache(): void {
    this.log('Clearing model cache');
    this.cachedModels = null;
  }

  /**
   * Parse models from API response
   */
  private parseModelsFromAPI(response: OpenAIModelsResponse): ModelInfo[] {
    return response.data.map((model) => {
      const modelId = `default:${model.id}`;

      // Parse model name to determine capabilities
      const modelName = model.id.toLowerCase();

      // Determine model family
      let family = 'unknown';
      if (modelName.includes('gpt-4')) {
        family = 'gpt-4';
      } else if (modelName.includes('gpt-3.5')) {
        family = 'gpt-3.5';
      } else if (modelName.includes('claude')) {
        family = 'claude';
      } else if (modelName.includes('llama')) {
        family = 'llama';
      }

      // Determine capabilities based on model name
      const supportsVision = modelName.includes('vision') ||
                            modelName.includes('gpt-4o') ||
                            modelName.includes('claude-3');

      const supportsTools = !modelName.includes('instruct') &&
                           !modelName.includes('base');

      // Estimate token limits (will be refined by actual API info if available)
      let maxInputTokens = 128000;
      let maxOutputTokens = 4096;

      // Adjust based on common model patterns
      if (modelName.includes('gpt-4')) {
        maxInputTokens = 128000;
        maxOutputTokens = modelName.includes('mini') ? 16384 : 4096;
      } else if (modelName.includes('gpt-3.5')) {
        maxInputTokens = 16385;
        maxOutputTokens = 4096;
      } else if (modelName.includes('claude-3')) {
        maxInputTokens = 200000;
        maxOutputTokens = 8192;
      } else if (modelName.includes('claude-2')) {
        maxInputTokens = 100000;
        maxOutputTokens = 4096;
      }

      // Version from creation timestamp
      const version = new Date(model.created * 1000).toISOString().split('T')[0];

      return {
        id: modelId,
        name: model.id,
        provider: 'default',
        family,
        version,
        maxInputTokens,
        maxOutputTokens,
        capabilities: {
          imageInput: supportsVision,
          toolCalling: supportsTools,
        },
      };
    });
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

    this.log(`Starting chat with model: ${modelName}`);
    this.log(`Messages count: ${messages.length}`);

    const requestBody = this.formatRequest(modelName, messages, options);

    // Build API URL - use baseUrl directly
    const apiUrl = config.baseUrl.endsWith('/')
      ? `${config.baseUrl}chat/completions`
      : `${config.baseUrl}/chat/completions`;

    this.log(`Chat API URL: ${apiUrl}`);

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

      this.log(`Chat API response status: ${response.status} ${response.statusText}`);

      if (!response.ok) {
        const body = await response.text();
        this.log(`Chat API error response: ${body.substring(0, 200)}`);
        const error = await ErrorHandler.createAPIError(response, body);
        throw error;
      }

      // Parse SSE stream
      await this.parseStream(response, onChunk, signal);
    } catch (error) {
      if (error instanceof Error) {
        if (error.name === 'AbortError') {
          this.log('Chat request cancelled by user');
          return;
        }
        this.log(`Chat request error: ${error.message}`);
      }
      throw error;
    }

    this.log('Chat request completed successfully');
  }

  /**
   * Count tokens using character-based estimation
   */
  async countTokens(text: string, model?: string): Promise<number> {
    if (!text || text.length === 0) {
      return 0;
    }
    return Math.ceil(text.length / 4);
  }

  protected validateApiKey(key: string): boolean {
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
    if (!chunk.startsWith('data: ')) {
      return null;
    }

    const data = chunk.slice(6).trim();

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

        const lines = buffer.split('\n');
        buffer = lines.pop() || '';

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
