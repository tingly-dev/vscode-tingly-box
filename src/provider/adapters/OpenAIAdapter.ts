/**
 * OpenAI-compatible provider adapter
 * Implements chat functionality using official OpenAI SDK
 * Handles OpenAI-style streaming responses including tool calls
 */

import OpenAI from 'openai';
import * as vscode from 'vscode';
import type { ChatOptions, ModelInfo, ResponsePart } from '../../types/index.js';
import { MessageConverter } from '../../utils/MessageConverter.js';
import { DEFAULT_TOKEN_LIMITS } from '../../constants/ModelLimits.js';
import { BaseAPIAdapter } from './BaseAPIAdapter.js';
import { ChatCompletionStream } from 'openai/lib/ChatCompletionStream.js';

/**
 * Adapter for OpenAI-compatible APIs using official OpenAI SDK
 */
export class OpenAIAdapter extends BaseAPIAdapter {
  readonly id = 'default';
  readonly apiStyle = 'openai' as const;
  readonly displayName = 'Tingly Box (OpenAI Style)';

  private client?: OpenAI;

  /**
   * Get or create OpenAI client instance
   */
  private async getClient(): Promise<OpenAI> {
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
      this.client = new OpenAI({
        baseURL: config.baseUrl,
        apiKey: config.token || 'dummy', // OpenAI SDK requires a key
      });
    }

    return this.client;
  }

  /**
   * Fetch models from remote API
   * Uses OpenAI SDK's models.list() method
   */
  protected async fetchModels(): Promise<ModelInfo[]> {
    if (!this.configManager) {
      throw new Error('ConfigManager not initialized');
    }

    const config = await this.configManager.getProviderConfig(this.id);
    if (!config) {
      throw new Error('Provider not configured. Please configure Base URL and Token first.');
    }

    this.log(`Fetching models from: ${config.baseUrl}`);

    try {
      const client = await this.getClient();

      // Use OpenAI SDK to list models
      const models = await client.models.list();

      this.log(`Received ${models.data.length} models from API`);

      // Convert API response to ModelInfo format
      this.cachedModels = models.data.map((model: OpenAI.Model) => {
        const modelId = `${this.id}:${model.id}`;

        // Use default token limits as fallback
        // TODO: Should be provided by the API
        const maxInputTokens = DEFAULT_TOKEN_LIMITS.MAX_INPUT_TOKENS;
        const maxOutputTokens = DEFAULT_TOKEN_LIMITS.MAX_OUTPUT_TOKENS;

        // Version from creation timestamp
        const version = new Date(model.created * 1000).toISOString().split('T')[0];

        return {
          id: modelId,
          name: model.id,
          provider: this.id,
          family: 'unknown', // Should be provided by API
          version,
          maxInputTokens,
          maxOutputTokens,
          capabilities: {
            imageInput: false, // Should be provided by API
            toolCalling: true, // Assume true for now
          },
        };
      });

      for (const model of this.cachedModels) {
        this.log(`  - ${model.name}: ${model.maxInputTokens} input, ${model.maxOutputTokens} output tokens`);
      }

      return this.cachedModels;
    } catch (error) {
      this.log(`Failed to fetch models: ${error}`);
      this.log(`Returning empty model list for OpenAI-style API`);

      // Return empty array on error
      this.cachedModels = [];
      return this.cachedModels;
    }
  }

  /**
   * Send a chat request with streaming support using OpenAI SDK
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

      // Convert VSCode messages to OpenAI format
      const { messages: openaiMessages } = MessageConverter.toOpenAIFormat(messages);

      this.log(`Converted ${openaiMessages.length} messages for OpenAI`);

      // Prepare tools
      const tools = options.tools?.map(tool => ({
        type: 'function' as const,
        function: {
          name: tool.name,
          description: tool.description || '',
          parameters: tool.inputSchema || { type: 'object', properties: {} },
        },
      }));

      if (tools && tools.length > 0) {
        this.log(`Including ${tools.length} tools`);
      }

      // Use ChatCompletionStream helper for simplified streaming
      const stream = ChatCompletionStream.createChatCompletion(
        client as OpenAI,
        {
          model: modelName,
          messages: openaiMessages as any,
          temperature: options.temperature ?? 0.7,
          max_tokens: options.maxTokens,
          stop: options.stop,
          tools: tools as any,
        },
        { signal }
      );

      let textChunkCount = 0;
      let toolCallCount = 0;

      // Track tool call IDs by index
      const toolCallIds = new Map<number, string>();

      // Listen to content events for text streaming
      stream.on('content', (contentDelta) => {
        textChunkCount++;
        onPart({ type: 'text', text: contentDelta });
      });

      // Listen to chunk events to capture tool call IDs
      stream.on('chunk', (chunk) => {
        const toolCalls = chunk.choices[0]?.delta?.tool_calls;
        if (toolCalls) {
          for (const tc of toolCalls) {
            if (tc.id) {
              toolCallIds.set(tc.index, tc.id);
            }
          }
        }
      });

      // Listen to tool call completion events
      stream.on('tool_calls.function.arguments.done', (props) => {
        toolCallCount++;
        const toolCallId = toolCallIds.get(props.index) || `tool_${props.index}`;
        onPart({
          type: 'tool_call',
          id: toolCallId,
          name: props.name,
          arguments: typeof props.arguments === 'string'
            ? JSON.parse(props.arguments)
            : props.parsed_arguments ?? props.arguments,
        });
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
   * Validate API key format for OpenAI
   * TODO: API should provide validation requirements
   */
  protected validateApiKey(key: string): boolean {
    return key.length >= 0;
  }
}
