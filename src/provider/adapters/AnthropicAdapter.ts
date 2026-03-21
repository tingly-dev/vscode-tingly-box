/**
 * Anthropic-compatible provider adapter
 * Implements chat functionality using official Anthropic SDK
 * Handles Anthropic-style streaming responses including thinking and tool use
 */

import Anthropic from '@anthropic-ai/sdk';
import type { ChatOptions, ModelInfo, ProviderMessage, ResponsePart } from '../../types/index.js';
import { MessageConverter } from '../../utils/MessageConverter.js';
import { API_KEY_REQUIREMENTS } from '../../constants/ModelLimits.js';
import { buildApiUrl } from '../../utils/UrlHelper.js';
import { BaseAPIAdapter, OpenAIModelsResponse } from './BaseAPIAdapter.js';

/**
 * Adapter for Anthropic-compatible APIs using official Anthropic SDK
 */
export class AnthropicAdapter extends BaseAPIAdapter {
  readonly id = 'default';
  readonly apiStyle = 'anthropic' as const;
  readonly displayName = 'Tingly Box (Anthropic Style)';

  private client?: Anthropic;

  /**
   * Get or create Anthropic client instance
   */
  private async getClient(): Promise<Anthropic> {
    if (!this.configManager) {
      throw new Error('ConfigManager not initialized');
    }

    const config = await this.configManager.getProviderConfig(this.id);
    if (!config) {
      throw new Error(
        `${this.displayName} not configured. Please run "Tingly Box: Manage Settings" to configure.`
      );
    }

    if (!this.client) {
      this.client = new Anthropic({
        baseURL: config.baseUrl,
        apiKey: config.token || '', // Anthropic SDK allows empty key
      });
    }

    return this.client;
  }

  /**
   * Fetch models from remote API
   * Note: Anthropic SDK doesn't have a models.list() method, so we use fetch
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
    const modelsUrl = buildApiUrl(config.baseUrl, 'models');

    this.log(`Fetching models from: ${modelsUrl}`);

    // Build headers with conditional authorization
    const headers: Record<string, string> = {
      'Content-Type': 'application/json',
      'anthropic-version': '2023-06-01',
    };

    if (config.token) {
      headers['x-api-key'] = config.token;
    }

    try {
      const response = await fetch(modelsUrl, {
        method: 'GET',
        headers,
      });

      this.log(`Models API response status: ${response.status} ${response.statusText}`);

      if (!response.ok) {
        const body = await response.text();
        this.log(`Models API error response: ${body.substring(0, 200)}`);
        throw new Error(`HTTP ${response.status}: ${response.statusText}`);
      }

      const data = (await response.json()) as OpenAIModelsResponse;
      this.log(`Received ${data.data.length} models from API`);
      this.cachedModels = this.parseModelsFromAPI(data, this.id);
      return this.cachedModels;
    } catch (error) {
      this.log(`Failed to fetch models: ${error}`);
      this.log(`Returning empty model list for Anthropic-style API`);

      // Return empty array on error
      this.cachedModels = [];
      return this.cachedModels;
    }
  }

  /**
   * Send a chat request with streaming support using Anthropic SDK
   */
  async chat(
    model: string,
    messages: ProviderMessage[],
    options: ChatOptions,
    onPart: (part: ResponsePart) => void,
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
      const client = await this.getClient();

      // Convert provider messages to Anthropic format
      const anthropicMessages = MessageConverter.toAnthropicFormat(messages);

      this.log(`Converted ${anthropicMessages.length} messages for Anthropic`);

      // Extract system message
      const [systemMessage] = MessageConverter.extractSystemMessage(messages);

      // Prepare tools
      let tools: Array<{ name: string; description: string; input_schema: any }> | undefined;
      if (options.tools && options.tools.length > 0) {
        tools = options.tools.map(tool => ({
          name: tool.name,
          description: tool.description || '',
          input_schema: tool.inputSchema || { type: 'object', properties: {} },
        }));
        this.log(`Including ${options.tools.length} tools`);
      }

      // Create abort controller for cancellation
      const abortController = new AbortController();

      // Hook up VSCode's cancellation token to our abort controller
      signal.addEventListener('abort', () => {
        this.log('Chat request cancelled by user');
        abortController.abort();
      }, { once: true });

      // Use Anthropic SDK for streaming chat
      const stream = await client.messages.create({
        model: modelName,
        messages: anthropicMessages as any,
        system: systemMessage || undefined,
        temperature: options.temperature ?? 0.7,
        max_tokens: options.maxTokens || 8192,
        stop_sequences: options.stop,
        tools: tools,
        stream: true,
      }, {
        signal: abortController.signal as any,
      });

      // Stream the text chunks and tool calls
      let chunkCount = 0;
      let toolCallCount = 0;

      // Track current tool_use block being accumulated
      let currentToolUse: {
        id: string;
        name: string;
        input: Record<string, unknown>;
      } | null = null;

      for await (const chunk of stream) {
        if (chunk.type === 'content_block_start') {
          if (chunk.content_block.type === 'tool_use') {
            // Start accumulating a new tool call
            currentToolUse = {
              id: chunk.content_block.id,
              name: chunk.content_block.name,
              input: (chunk.content_block.input || {}) as Record<string, unknown>,
            };
          }
        } else if (chunk.type === 'content_block_delta') {
          const delta = chunk.delta;
          if (delta.type === 'text_delta') {
            chunkCount++;
            onPart({ type: 'text', text: delta.text });
          } else if (delta.type === 'input_json_delta' && currentToolUse) {
            // Accumulate tool input (partial JSON)
            try {
              const partial = JSON.parse(delta.partial_json);
              currentToolUse.input = { ...currentToolUse.input, ...partial };
            } catch {
              // Partial JSON might not be valid yet, skip
            }
          }
        } else if (chunk.type === 'content_block_stop') {
          // Tool use block complete
          if (currentToolUse) {
            toolCallCount++;
            onPart({
              type: 'tool_call',
              id: currentToolUse.id,
              name: currentToolUse.name,
              arguments: currentToolUse.input,
            });
            currentToolUse = null;
          }
        }
      }

      this.log(`Chat request completed successfully (${chunkCount} text chunks, ${toolCallCount} tool calls streamed)`);
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
  }

  /**
   * Validate API key format for Anthropic
   */
  protected validateApiKey(key: string): boolean {
    return key.length >= API_KEY_REQUIREMENTS.ANTHROPIC_MIN_LENGTH;
  }
}
