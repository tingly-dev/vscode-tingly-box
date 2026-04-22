/**
 * Base adapter with shared functionality
 * Provides common features like model fetching, config management, logging
 */

import * as vscode from 'vscode';
import { ConfigManager } from '../../config/ConfigManager.js';
import { DEFAULT_TOKEN_LIMITS } from '../../constants/ModelLimits.js';
import type { ModelInfo } from '../../types/index.js';
import { BaseProviderAdapter } from '../BaseProvider.js';

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
     * Uses fallback defaults for family and token limits
     * TODO: API should provide family, capabilities, maxInputTokens, and maxOutputTokens
     */
    protected parseModelsFromAPI(response: OpenAIModelsResponse, providerId: string): ModelInfo[] {
        return response.data.map((model) => {
            const modelId = `${providerId}:${model.id}`;

            // Use default token limits as fallback
            const maxInputTokens = DEFAULT_TOKEN_LIMITS.MAX_INPUT_TOKENS;
            const maxOutputTokens = DEFAULT_TOKEN_LIMITS.MAX_OUTPUT_TOKENS;

            // Version from creation timestamp
            const version = new Date(model.created * 1000).toISOString().split('T')[0];

            return {
                id: modelId,
                name: model.id,
                provider: providerId,
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
