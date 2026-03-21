/**
 * OpenAI-compatible provider adapter
 * Implements chat functionality using official OpenAI SDK
 * Handles OpenAI-style streaming responses including tool calls
 */

import OpenAI from 'openai';
import type { ChatOptions, ModelInfo, ProviderMessage, ResponsePart } from '../../types/index.js';
import { MessageConverter } from '../../utils/MessageConverter.js';
import { API_KEY_REQUIREMENTS } from '../../constants/ModelLimits.js';
import { BaseAPIAdapter } from './BaseAPIAdapter.js';

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
        } else if (modelName.includes('deepseek')) {
          family = 'deepseek';
        } else if (modelName.includes('gemini')) {
          family = 'gemini';
        }

        // Determine capabilities
        const supportsVision = modelName.includes('vision') || modelName.includes('gpt-4o') || modelName.includes('claude-3');
        const supportsTools = true; // Most OpenAI-compatible models support tools

        // Get token limits based on model family
        let maxInputTokens = 128000;
        let maxOutputTokens = 4096;

        if (modelName.includes('gpt-4')) {
          if (modelName.includes('mini')) {
            maxInputTokens = 128000;
            maxOutputTokens = 16384;
          } else {
            maxInputTokens = 128000;
            maxOutputTokens = 4096;
          }
        } else if (modelName.includes('gpt-3.5')) {
          maxInputTokens = 16385;
          maxOutputTokens = 4096;
        } else if (modelName.includes('claude-3')) {
          maxInputTokens = 200000;
          maxOutputTokens = 8192;
        } else if (modelName.includes('deepseek-r1')) {
          maxInputTokens = 64000;
          maxOutputTokens = 8000;
        }

        // Version from creation timestamp
        const version = new Date(model.created * 1000).toISOString().split('T')[0];

        return {
          id: modelId,
          name: model.id,
          provider: this.id,
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

      // Convert provider messages to OpenAI format
      const openaiMessages = MessageConverter.toOpenAIFormat(messages);

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

      // Create abort controller for cancellation
      const abortController = new AbortController();

      // Hook up VSCode's cancellation token to our abort controller
      signal.addEventListener('abort', () => {
        this.log('Chat request cancelled by user');
        abortController.abort();
      }, { once: true });

      // Use OpenAI SDK for streaming chat
      const stream = await client.chat.completions.create({
        model: modelName,
        messages: openaiMessages as any, // Type cast for OpenAI SDK compatibility
        temperature: options.temperature ?? 0.7,
        max_tokens: options.maxTokens,
        stop: options.stop,
        tools: tools as any,
        stream: true,
      }, {
        signal: abortController.signal,
      });

      // Stream the text chunks and tool calls
      let chunkCount = 0;
      let toolCallCount = 0;

      // Accumulate tool calls across chunks
      const toolCallsBuffer = new Map<number, {
        id: string;
        type: string;
        function: {
          name: string;
          arguments: string;
        };
      }>();

      for await (const chunk of stream) {
        const delta = chunk.choices[0]?.delta;

        // Handle text content
        if (delta?.content) {
          chunkCount++;
          onPart({ type: 'text', text: delta.content });
        }

        // Handle tool calls (streaming accumulation)
        if (delta?.tool_calls && delta.tool_calls.length > 0) {
          for (const toolCall of delta.tool_calls) {
            const index = toolCall.index;

            if (!toolCallsBuffer.has(index)) {
              // Clone the tool call to avoid mutation
              toolCallsBuffer.set(index, {
                id: toolCall.id || '',
                type: toolCall.type || 'function',
                function: {
                  name: toolCall.function?.name || '',
                  arguments: toolCall.function?.arguments || '',
                },
              });
            } else {
              // Accumulate arguments
              const existing = toolCallsBuffer.get(index)!;
              if (toolCall.function?.arguments) {
                existing.function.arguments += toolCall.function.arguments;
              }
              if (toolCall.id && !existing.id) {
                existing.id = toolCall.id;
              }
              if (toolCall.function?.name && !existing.function.name) {
                existing.function.name = toolCall.function.name;
              }
            }
          }
        }

        // Check if stream ended with tool calls
        if (chunk.choices[0]?.finish_reason === 'tool_calls' && toolCallsBuffer.size > 0) {
          // Report all completed tool calls
          for (const toolCall of toolCallsBuffer.values()) {
            if (toolCall.id && toolCall.function.name) {
              try {
                toolCallCount++;
                onPart({
                  type: 'tool_call',
                  id: toolCall.id,
                  name: toolCall.function.name,
                  arguments: JSON.parse(toolCall.function.arguments || '{}'),
                });
              } catch (e) {
                this.log(`Failed to parse tool arguments: ${e}`);
              }
            }
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
   * Validate API key format for OpenAI
   */
  protected validateApiKey(key: string): boolean {
    return key.length >= API_KEY_REQUIREMENTS.OPENAI_MIN_LENGTH;
  }
}
