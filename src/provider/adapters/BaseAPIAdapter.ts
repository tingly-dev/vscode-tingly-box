/**
 * Base adapter with shared functionality
 * Provides common features like model fetching, config management, logging
 */

import type { ModelInfo } from '../../types/index.js';
import { BaseProviderAdapter } from '../BaseProvider.js';
import { ConfigManager } from '../../config/ConfigManager.js';
import {
  DEFAULT_TOKEN_LIMITS,
  MODEL_FAMILY_LIMITS,
  MODEL_PATTERNS,
} from '../../constants/ModelLimits.js';
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
      const supportsVision = MODEL_PATTERNS.VISION.some(pattern =>
        modelName.includes(pattern)
      );

      const supportsTools = !MODEL_PATTERNS.TOOLS_EXCLUDED.some(pattern =>
        modelName.includes(pattern)
      );

      // Get token limits from configuration or use defaults
      let maxInputTokens = DEFAULT_TOKEN_LIMITS.MAX_INPUT_TOKENS;
      let maxOutputTokens = DEFAULT_TOKEN_LIMITS.MAX_OUTPUT_TOKENS;

      // Adjust based on model family
      if (modelName.includes('gpt-4')) {
        const limits = modelName.includes('mini')
          ? MODEL_FAMILY_LIMITS['gpt-4-mini']
          : MODEL_FAMILY_LIMITS['gpt-4'];
        maxInputTokens = limits.maxInputTokens;
        maxOutputTokens = limits.maxOutputTokens;
      } else if (modelName.includes('gpt-3.5')) {
        const limits = MODEL_FAMILY_LIMITS['gpt-3.5'];
        maxInputTokens = limits.maxInputTokens;
        maxOutputTokens = limits.maxOutputTokens;
      } else if (modelName.includes('claude-3')) {
        const limits = MODEL_FAMILY_LIMITS['claude-3'];
        maxInputTokens = limits.maxInputTokens;
        maxOutputTokens = limits.maxOutputTokens;
      } else if (modelName.includes('claude-2')) {
        const limits = MODEL_FAMILY_LIMITS['claude-2'];
        maxInputTokens = limits.maxInputTokens;
        maxOutputTokens = limits.maxOutputTokens;
      } else if (modelName.includes('deepseek-r1')) {
        const limits = MODEL_FAMILY_LIMITS['deepseek-r1'];
        maxInputTokens = limits.maxInputTokens;
        maxOutputTokens = limits.maxOutputTokens;
      } else if (modelName.includes('deepseek')) {
        const limits = MODEL_FAMILY_LIMITS['deepseek'];
        maxInputTokens = limits.maxInputTokens;
        maxOutputTokens = limits.maxOutputTokens;
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
  async countTokens(text: string): Promise<number> {
    if (!text || text.length === 0) {
      return 0;
    }
    return Math.ceil(text.length / 4);
  }
}
