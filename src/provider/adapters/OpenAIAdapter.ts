/**
 * OpenAI-compatible provider adapter
 * Implements chat functionality using OpenAI-compatible APIs
 * Handles OpenAI-style streaming responses including tool calls
 */

import type { ModelInfo, ProviderMessage, ChatOptions } from '../../types/index.js';
import { BaseAPIAdapter, OpenAIModelsResponse } from './BaseAPIAdapter.js';
import { MessageConverter } from '../../utils/MessageConverter.js';
import { ErrorHandler } from '../../utils/ErrorHandler.js';

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
      tool_calls?: Array<{
        index: number;
        id?: string;
        type?: string;
        function?: {
          name?: string;
          arguments?: string;
        };
      }>;
    };
    finish_reason: string | null;
  }>;
}

/**
 * Adapter for OpenAI-compatible APIs
 */
export class OpenAIAdapter extends BaseAPIAdapter {
  readonly id = 'openai';
  readonly displayName = 'OpenAI-Compatible';

  /**
   * Fetch models from remote API
   */
  protected async fetchModels(): Promise<ModelInfo[]> {
    if (!this.configManager) {
      throw new Error('ConfigManager not initialized');
    }

    const config = await this.configManager.getProviderConfig(this.id);
    if (!config) {
      throw new Error('Provider not configured. Please configure Base URL and Token first.');
    }

    // Fetch models from API
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
    this.cachedModels = this.parseModelsFromAPI(data, this.id);

    for (const model of this.cachedModels) {
      this.log(`  - ${model.name}: ${model.maxInputTokens} input, ${model.maxOutputTokens} output tokens`);
    }

    return this.cachedModels;
  }

  /**
   * Send a chat request with streaming support
   */
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

    const config = await this.configManager.getProviderConfig(this.id);
    if (!config) {
      throw new Error(
        `${this.displayName} not configured. Please run "Tingly Box: Manage Settings" to configure.`
      );
    }

    // Extract model name (remove provider prefix if present)
    const modelName = model.includes(':') ? model.split(':')[1] : model;

    this.log(`Starting chat with model: ${modelName}`);
    this.log(`Messages count: ${messages.length}`);

    try {
      const requestBody = this.formatRequest(modelName, messages, options);

      // Build API URL
      const apiUrl = config.baseUrl.endsWith('/')
        ? `${config.baseUrl}chat/completions`
        : `${config.baseUrl}/chat/completions`;

      this.log(`Chat API URL: ${apiUrl}`);

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
   * Validate API key format for OpenAI
   */
  protected validateApiKey(key: string): boolean {
    return key.length >= 20;
  }

  /**
   * Format request for OpenAI API
   */
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

  /**
   * Parse streaming chunk from OpenAI API response
   */
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

      // Handle tool calls if present
      const toolCalls = parsed.choices[0]?.delta?.tool_calls;
      if (toolCalls && toolCalls.length > 0) {
        // For now, we'll log tool calls but not process them
        // Tool call support requires VSCode's LanguageModelToolCallPart
        this.log(`Tool call detected: ${JSON.stringify(toolCalls)}`);
      }

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
