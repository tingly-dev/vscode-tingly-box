/**
 * Base adapter with shared functionality
 * Provides common features like model fetching, config management, logging
 */

import type { ModelInfo, ProviderMessage, ChatOptions } from '../../types/index.js';
import { BaseProviderAdapter } from '../BaseProvider.js';
import { ConfigManager } from '../../config/ConfigManager.js';
import { ErrorHandler } from '../../utils/ErrorHandler.js';
import * as vscode from 'vscode';

/**
 * OpenAI models API response
 */
export interface OpenAIModelsResponse {
  object: string;
  data: Array<{
    id: string;
    object: string;
    created: number;
    owned_by: string;
  }>;
}

/**
 * Base adapter with shared functionality for all API-based providers
 */
export abstract class BaseAPIAdapter extends BaseProviderAdapter {
  protected configManager?: ConfigManager;
  protected cachedModels: ModelInfo[] | null = null;
  protected outputChannel?: vscode.OutputChannel;

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
   * Clear cached models
   */
  clearModelCache(): void {
    this.log('Clearing model cache');
    this.cachedModels = null;
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
   * Must be implemented by subclasses
   */
  protected abstract fetchModels(): Promise<ModelInfo[]>;

  /**
   * Log debug message
   */
  protected log(message: string): void {
    if (this.outputChannel) {
      this.outputChannel.appendLine(`[${this.id}] ${message}`);
    }
  }

  /**
   * Parse models from OpenAI-compatible API response
   */
  protected parseModelsFromAPI(response: OpenAIModelsResponse, providerId: string): ModelInfo[] {
    return response.data.map((model) => {
      const modelId = `${providerId}:${model.id}`;

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
      } else if (modelName.includes('deepseek')) {
        family = 'deepseek';
      } else if (modelName.includes('gemini')) {
        family = 'gemini';
      }

      // Determine capabilities based on model name
      const supportsVision = modelName.includes('vision') ||
                            modelName.includes('gpt-4o') ||
                            modelName.includes('claude-3');

      const supportsTools = !modelName.includes('instruct') &&
                           !modelName.includes('base');

      // Estimate token limits
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
      } else if (modelName.includes('deepseek-r1')) {
        maxInputTokens = 64000;
        maxOutputTokens = 8000;
      } else if (modelName.includes('deepseek')) {
        maxInputTokens = 128000;
        maxOutputTokens = 4096;
      }

      // Version from creation timestamp
      const version = new Date(model.created * 1000).toISOString().split('T')[0];

      return {
        id: modelId,
        name: model.id,
        provider: providerId,
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

  /**
   * Count tokens using character-based estimation
   */
  async countTokens(text: string, model?: string): Promise<number> {
    if (!text || text.length === 0) {
      return 0;
    }
    return Math.ceil(text.length / 4);
  }
}
