/**
 * Tingly Box - Main Language Model Chat Provider
 * Implements VSCode's LanguageModelChatProvider interface
 */

import * as vscode from 'vscode';
import type { ModelInfo, Tool } from '../types/index.js';
import { ConfigManager } from '../config/ConfigManager.js';
import { ProviderRegistry } from './ProviderRegistry.js';
import { MessageConverter } from '../utils/MessageConverter.js';
import { TokenCounter } from '../utils/TokenCounter.js';
import { ErrorHandler } from '../utils/ErrorHandler.js';

/**
 * Main provider implementation for VSCode Language Model Chat API
 */
export class TinglyBoxProvider implements vscode.LanguageModelChatProvider {
  private cachedModels: vscode.LanguageModelChatInformation[] | null = null;

  constructor(
    private readonly config: ConfigManager,
    private readonly output: vscode.OutputChannel
  ) {}

  /**
   * Clear cached models to force a refresh
   */
  clearModelCache(): void {
    this.output.appendLine('[Provider] Clearing model cache');
    this.cachedModels = null;
  }

  /**
   * Provide information about available language models
   * VSCode calls this to discover what models are available
   */
  async provideLanguageModelChatInformation(
    options: { silent: boolean },
    token: vscode.CancellationToken
  ): Promise<vscode.LanguageModelChatInformation[]> {
    // Return cached models if available
    if (this.cachedModels && this.cachedModels.length > 0) {
      this.output.appendLine(`[Provider] Returning ${this.cachedModels.length} cached models`);
      return this.cachedModels;
    }

    const models: vscode.LanguageModelChatInformation[] = [];

    try {
      this.output.appendLine('[Provider] Fetching available models...');

      for (const provider of ProviderRegistry.list()) {
        // Check if cancellation was requested
        if (token.isCancellationRequested) {
          this.output.appendLine('[Provider] Model fetch cancelled');
          break;
        }

        // Check if provider is configured
        const hasConfig = await this.config.hasConfiguredProvider(provider.id);

        if (!hasConfig) {
          this.output.appendLine(
            `[Provider] Provider '${provider.id}' not configured, skipping`
          );

          // If not in silent mode, prompt user to configure
          if (!options.silent) {
            const shouldConfigure = await vscode.window.showWarningMessage(
              `${provider.displayName} is not configured. Would you like to set it up now?`,
              'Configure',
              'Skip'
            );

            if (shouldConfigure === 'Configure') {
              await vscode.commands.executeCommand('tinglybox.manage');
            }
          }
          continue;
        }

        // Get models from this provider
        try {
          const providerModels = await provider.getModels();

          for (const model of providerModels) {
            const modelInfo = this.toVSCodeModelInfo(model);
            // Skip if model with same ID already exists (deduplication)
            if (!models.some(m => m.id === modelInfo.id)) {
              models.push(modelInfo);
              this.output.appendLine(`[Provider] Found model: ${model.name} (${model.id})`);
            } else {
              this.output.appendLine(`[Provider] Skipping duplicate model: ${model.name} (${model.id})`);
            }
          }
        } catch (error) {
          this.output.appendLine(
            `[Provider] Error fetching models from ${provider.id}: ${error}`
          );
        }
      }

      this.output.appendLine(`[Provider] Returning ${models.length} unique models`);

      // Cache the models for future calls
      if (models.length > 0) {
        this.cachedModels = models;
      }

      return models;
    } catch (error) {
      ErrorHandler.handle(error, this.output);
      return [];
    }
  }

  /**
   * Provide a chat response
   * VSCode calls this when the user sends a message
   */
  async provideLanguageModelChatResponse(
    model: vscode.LanguageModelChatInformation,
    messages: readonly vscode.LanguageModelChatRequestMessage[],
    options: vscode.ProvideLanguageModelChatResponseOptions,
    progress: vscode.Progress<vscode.LanguageModelResponsePart>,
    token: vscode.CancellationToken
  ): Promise<void> {
    try {
      this.output.appendLine(`[Chat] Starting chat with model: ${model.id}`);

      // Get the provider for this model
      const provider = ProviderRegistry.getByModelId(model.id);

      if (!provider) {
        throw new Error(`No provider found for model: ${model.id}`);
      }

      // Check if provider is configured
      const hasConfig = await this.config.hasConfiguredProvider(provider.id);

      if (!hasConfig) {
        throw new Error(
          `${provider.displayName} is not configured. Please run "Tingly Box: Manage Settings" to configure.`
        );
      }

      // Convert messages to provider format
      const providerMessages = MessageConverter.toProviderMessages(messages);

      this.output.appendLine(
        `[Chat] Processing ${providerMessages.length} messages`
      );

      // Convert VSCode tools to internal Tool format
      const tools: Tool[] = (options.tools || []).map(vscodeTool => ({
        name: vscodeTool.name,
        description: vscodeTool.description,
        inputSchema: vscodeTool.inputSchema as Record<string, unknown>,
      }));

      if (tools.length > 0) {
        this.output.appendLine(`[Chat] Passing ${tools.length} tools to provider`);
      }

      // Create abort controller for cancellation
      const abortController = new AbortController();

      // Hook up VSCode's cancellation token to our abort controller
      token.onCancellationRequested(() => {
        this.output.appendLine('[Chat] Request cancelled by user');
        abortController.abort();
      });

      // Call the provider's chat method
      await provider.chat(
        model.id,
        providerMessages,
        {
          // VSCode doesn't provide tokenOptions in the current API version
          // Use default temperature for now
          // temperature: 0.7,
          maxTokens: model.maxOutputTokens,
          tools: tools.length > 0 ? tools : undefined,
        },
        (part) => {
          // Route based on part type
          if (part.type === 'text') {
            progress.report(new vscode.LanguageModelTextPart(part.text));
          } else if (part.type === 'tool_call') {
            progress.report(new vscode.LanguageModelToolCallPart(
              part.id,
              part.name,
              part.arguments
            ));
          }
        },
        abortController.signal
      );

      this.output.appendLine('[Chat] Chat completed successfully');
    } catch (error) {
      this.output.appendLine(`[Chat] Error: ${error}`);
      ErrorHandler.handle(error, this.output);
      throw error;
    }
  }

  /**
   * Provide token count for text or messages
   * VSCode calls this to estimate token usage for cost tracking
   */
  async provideTokenCount(
    _model: vscode.LanguageModelChatInformation,
    text: string | vscode.LanguageModelChatRequestMessage,
    _token: vscode.CancellationToken
  ): Promise<number> {
    try {
      let count = 0;

      if (typeof text === 'string') {
        // Simple text token count
        count = TokenCounter.estimate(text);
      } else {
        // Chat message token count
        count = TokenCounter.estimateVSCodeMessage(text);
      }

      // Skip logging for small token counts to reduce noise
      if (count > 10) {
        this.output.appendLine(
          `[TokenCount] Estimated ${count} tokens for ${typeof text === 'string' ? 'text' : 'message'}`
        );
      }

      return count;
    } catch (error) {
      this.output.appendLine(`[TokenCount] Error: ${error}`);
      return 0;
    }
  }

  /**
   * Convert internal ModelInfo to VSCode LanguageModelChatInformation
   */
  private toVSCodeModelInfo(
    model: ModelInfo
  ): vscode.LanguageModelChatInformation {
    return {
      id: model.id,
      name: model.name,
      family: model.family,
      version: model.version,
      maxInputTokens: model.maxInputTokens,
      maxOutputTokens: model.maxOutputTokens,
      capabilities: model.capabilities,
    };
  }
}
