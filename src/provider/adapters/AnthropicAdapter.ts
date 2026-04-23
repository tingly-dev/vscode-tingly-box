/**
 * Anthropic-compatible provider adapter
 * Implements chat functionality using official Anthropic SDK
 * Handles Anthropic-style streaming responses including thinking and tool use
 */

import Anthropic from '@anthropic-ai/sdk';
import * as vscode from 'vscode';
import type { ChatOptions, ModelInfo, ResponsePart } from '../../types/index.js';
import { MessageConverter } from '../../utils/MessageConverter.js';
import { buildApiUrl } from '../../utils/UrlHelper.js';
import { BaseAPIAdapter, OpenAIModelsResponse } from './BaseAPIAdapter.js';
import { MessageStream } from '@anthropic-ai/sdk/lib/MessageStream.js';

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
    messages: readonly vscode.LanguageModelChatRequestMessage[],
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

      // Convert VSCode messages to Anthropic format
      const { messages: anthropicMessages, systemMessage } = MessageConverter.toAnthropicFormat(messages);

      this.log(`Converted ${anthropicMessages.length} messages for Anthropic`);

      // System message is handled separately by Anthropic
      const system = systemMessage || undefined;

      // Prepare tools
      let tools: Array<{ name: string; description: string; input_schema: any }> | undefined;
      if (options.tools && options.tools.length > 0) {
        tools = options.tools.map(tool => {
          // Ensure input_schema has at least type: 'object'
          const inputSchema = tool.inputSchema || { properties: {} };
          if (!inputSchema.type) {
            inputSchema.type = 'object';
          }
          return {
            name: tool.name,
            description: tool.description || '',
            input_schema: inputSchema,
          };
        });
        this.log(`Including ${options.tools.length} tools:`);
        for (const tool of tools) {
          this.log(`  - ${tool.name}: ${JSON.stringify(tool.input_schema).substring(0, 100)}...`);
        }
      }

      // Use MessageStream helper for simplified streaming
      const stream = MessageStream.createMessage(
        client.messages,
        {
          model: modelName,
          messages: anthropicMessages as any,
          system: system,
          temperature: options.temperature ?? 0.7,
          max_tokens: options.maxTokens || 8192,
          stop_sequences: options.stop,
          tools: tools,
        },
        { signal }
      );

      let textChunkCount = 0;
      let toolCallCount = 0;

      // Listen to text events for text streaming
      stream.on('text', (textDelta) => {
        textChunkCount++;
        onPart({ type: 'text', text: textDelta });
      });

      // Listen to content block events for tool calls
      stream.on('contentBlock', (content) => {
        if (content.type === 'tool_use') {
          toolCallCount++;
          onPart({
            type: 'tool_call',
            id: content.id,
            name: content.name,
            arguments: (typeof content.input === 'object' && content.input !== null)
              ? content.input as Record<string, unknown>
              : {},
          });
        }
      });

      // Wait for stream completion
      await stream.done();

      this.log(`Chat request completed successfully (${textChunkCount} text chunks, ${toolCallCount} tool calls)`);
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
   * TODO: API should provide validation requirements
   */
  protected validateApiKey(key: string): boolean {
    return key.length >= 0;
  }
}
