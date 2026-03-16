/**
 * Anthropic-compatible provider adapter
 * Implements chat functionality using Anthropic-compatible APIs
 * Handles Anthropic-style streaming responses including thinking and tool use
 */

import type { ModelInfo, ProviderMessage, ChatOptions } from '../../types/index.js';
import { BaseAPIAdapter, OpenAIModelsResponse } from './BaseAPIAdapter.js';
import { MessageConverter } from '../../utils/MessageConverter.js';
import { ErrorHandler } from '../../utils/ErrorHandler.js';

/**
 * Anthropic streaming event types
 */
type AnthropicEvent =
  | { type: 'message_start'; message: { id: string; role: string; content: unknown[] } }
  | { type: 'message_delta'; delta: { stop_reason: string | null }; usage: unknown }
  | { type: 'message_stop' }
  | { type: 'content_block_start'; index: number; content_block: { type: string; text?: string; name?: string } }
  | { type: 'content_block_delta'; index: number; delta: { type: string; text?: string; thinking?: string; partial_json?: string } }
  | { type: 'content_block_stop'; index: number }
  | { type: 'error'; error: { type: string; message: string } }
  | { type: 'ping' };

/**
 * Adapter for Anthropic-compatible APIs
 */
export class AnthropicAdapter extends BaseAPIAdapter {
  readonly id = 'anthropic';
  readonly displayName = 'Anthropic-Compatible';

  /**
   * Fetch models from remote API
   * Always fetch from provider endpoint - no fallback
   */
  protected async fetchModels(): Promise<ModelInfo[]> {
    if (!this.configManager) {
      throw new Error('ConfigManager not initialized');
    }

    const config = await this.configManager.getProviderConfig(this.id);
    if (!config) {
      throw new Error('Provider not configured. Please configure Base URL and Token first.');
    }

    // Try to fetch models from the provider's models endpoint
    const modelsUrl = config.baseUrl.endsWith('/')
      ? `${config.baseUrl}models`
      : `${config.baseUrl}/models`;

    this.log(`Fetching models from: ${modelsUrl}`);

    const response = await fetch(modelsUrl, {
      method: 'GET',
      headers: {
        'x-api-key': config.token,
      },
    });

    this.log(`Models API response status: ${response.status} ${response.statusText}`);

    if (!response.ok) {
      const body = await response.text();
      this.log(`Models API error response: ${body.substring(0, 200)}`);
      const error = await ErrorHandler.createAPIError(response, body);
      throw error;
    }

    const data = await response.json() as OpenAIModelsResponse;
    this.log(`Received ${data.data.length} models from API`);
    this.cachedModels = this.parseModelsFromAPI(data, this.id);
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
      // Extract system message and convert messages to Anthropic format
      const [systemMessage, filteredMessages] = MessageConverter.extractSystemMessage(messages);
      const anthropicMessages = MessageConverter.toAnthropicFormat(filteredMessages);

      // Build request body for Anthropic-style API
      const requestBody: Record<string, unknown> = {
        model: modelName,
        messages: anthropicMessages,
        max_tokens: options.maxTokens || 4096,
        temperature: options.temperature ?? 0.7,
        stream: true,
      };

      // Add system message if present
      if (systemMessage) {
        requestBody.system = systemMessage;
        this.log(`System message included: ${systemMessage.substring(0, 50)}...`);
      }

      // Build API URL
      const apiUrl = config.baseUrl.endsWith('/')
        ? `${config.baseUrl}messages`
        : `${config.baseUrl}/messages`;

      this.log(`Anthropic API URL: ${apiUrl}`);

      const response = await fetch(apiUrl, {
        method: 'POST',
        headers: {
          'x-api-key': config.token,
          'anthropic-version': '2023-06-01',
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(requestBody),
        signal,
      });

      this.log(`Anthropic API response status: ${response.status} ${response.statusText}`);

      if (!response.ok) {
        const body = await response.text();
        this.log(`Anthropic API error response: ${body.substring(0, 200)}`);
        const error = await ErrorHandler.createAPIError(response, body);
        throw error;
      }

      // Parse Anthropic SSE stream
      await this.parseAnthropicStream(response, onChunk, signal);
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
   * Validate API key format for Anthropic
   */
  protected validateApiKey(key: string): boolean {
    // Anthropic API keys start with 'sk-ant-' and are longer than 20 chars
    return key.length >= 20;
  }

  /**
   * Format request for Anthropic API (not used directly, chat handles it)
   */
  protected formatRequest(
    model: string,
    messages: ProviderMessage[],
    options: ChatOptions
  ): Record<string, unknown> {
    // This is implemented in the chat method directly
    return { model, messages, options };
  }

  /**
   * Parse streaming chunk from Anthropic API response
   * Not used directly, parseAnthropicStream handles the full event parsing
   */
  protected parseChunk(chunk: string): string | null {
    // Anthropic uses event-based streaming, not simple chunks
    return null;
  }

  /**
   * Parse Anthropic-style Server-Sent Events stream
   * Handles all Anthropic streaming event types
   */
  private async parseAnthropicStream(
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

          const data = trimmed.slice(5).trim();

          if (data === '[DONE]') {
            continue;
          }

          try {
            const parsed = JSON.parse(data) as AnthropicEvent;

            // Handle different Anthropic event types
            switch (parsed.type) {
              case 'message_start':
                // Message initialization event
                this.log('Anthropic: message_start event received');
                break;

              case 'message_delta':
                // Message completion event (contains usage info)
                this.log(`Anthropic: message_delta event - stop_reason: ${parsed.delta?.stop_reason}`);
                break;

              case 'message_stop':
                // Message completion event
                this.log('Anthropic: message_stop event received');
                break;

              case 'content_block_start':
                // Content block initialization
                if (parsed.content_block?.type === 'text') {
                  this.log('Anthropic: text content block started');
                } else if (parsed.content_block?.type === 'tool_use') {
                  this.log(`Anthropic: tool_use block started - ${parsed.content_block.name}`);
                } else if (parsed.content_block?.type === 'thinking') {
                  this.log('Anthropic: thinking block started (extended thinking)');
                }
                break;

              case 'content_block_delta':
                // Content delta updates
                if (parsed.delta?.type === 'text_delta' && parsed.delta?.text) {
                  // Regular text content
                  onChunk(parsed.delta.text);
                } else if (parsed.delta?.type === 'thinking_delta' && parsed.delta?.thinking) {
                  // Extended thinking content (not shown to user)
                  this.log(`Anthropic: thinking content received (${parsed.delta.thinking.length} chars)`);
                } else if (parsed.delta?.type === 'input_json_delta' && parsed.delta?.partial_json) {
                  // Tool arguments being streamed
                  this.log(`Anthropic: tool arguments partial: ${parsed.delta.partial_json}`);
                }
                break;

              case 'content_block_stop':
                // Content block completion
                this.log('Anthropic: content_block_stop event received');
                break;

              case 'error':
                // Error event
                this.log(`Anthropic: error event - ${parsed.error?.message}`);
                throw new Error(parsed.error?.message || 'Anthropic API error');

              case 'ping':
                // Keep-alive ping
                this.log('Anthropic: ping event received');
                break;

              default:
                this.log(`Anthropic: unknown event type: ${(parsed as { type: string }).type}`);
            }
          } catch (parseError) {
            // Ignore parse errors for individual events
            this.log(`Anthropic: failed to parse event: ${parseError}`);
          }
        }
      }
    } finally {
      reader.releaseLock();
    }
  }
}
