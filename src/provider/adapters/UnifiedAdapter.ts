/**
 * Unified adapter that delegates to the appropriate style-based adapter
 * Switches between OpenAI and Anthropic implementations based on configuration
 */

import type { ModelInfo, ProviderMessage, ChatOptions } from '../../types/index.js';
import { BaseProviderAdapter } from '../BaseProvider.js';
import { ConfigManager } from '../../config/ConfigManager.js';
import { OpenAIAdapter } from './OpenAIAdapter.js';
import { AnthropicAdapter } from './AnthropicAdapter.js';

/**
 * Unified adapter that delegates to style-specific adapters
 */
export class UnifiedAdapter extends BaseProviderAdapter {
  readonly id = 'default';
  readonly displayName = 'Tingly Box';

  private configManager?: ConfigManager;
  private outputChannel?: import('vscode').OutputChannel;
  private cachedModels: ModelInfo[] | null = null;

  private openAIAdapter: OpenAIAdapter;
  private anthropicAdapter: AnthropicAdapter;

  constructor() {
    super();
    this.openAIAdapter = new OpenAIAdapter();
    this.anthropicAdapter = new AnthropicAdapter();
  }

  /**
   * Set the config manager
   */
  setConfigManager(config: ConfigManager): void {
    this.configManager = config;
    this.openAIAdapter.setConfigManager(config);
    this.anthropicAdapter.setConfigManager(config);
  }

  /**
   * Set output channel for logging
   */
  setOutputChannel(output: import('vscode').OutputChannel): void {
    this.outputChannel = output;
    this.openAIAdapter.setOutputChannel(output);
    this.anthropicAdapter.setOutputChannel(output);
  }

  /**
   * Clear cached models
   */
  clearModelCache(): void {
    this.openAIAdapter.clearModelCache();
    this.anthropicAdapter.clearModelCache();
    this.cachedModels = null;
    this.log('Model cache cleared');
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

    const adapter = await this.getActiveAdapter();
    const models = await adapter.getModels();
    this.cachedModels = models;
    return models;
  }

  /**
   * Send a chat request using the active adapter
   */
  async chat(
    model: string,
    messages: ProviderMessage[],
    options: ChatOptions,
    onChunk: (chunk: string) => void,
    signal: AbortSignal
  ): Promise<void> {
    const adapter = await this.getActiveAdapter();
    return adapter.chat(model, messages, options, onChunk, signal);
  }

  /**
   * Count tokens using the active adapter
   */
  async countTokens(text: string): Promise<number> {
    const adapter = await this.getActiveAdapter();
    return adapter.countTokens(text);
  }

  /**
   * Get the active adapter based on current API style
   */
  private async getActiveAdapter(): Promise<OpenAIAdapter | AnthropicAdapter> {
    if (!this.configManager) {
      throw new Error('ConfigManager not initialized');
    }

    const config = await this.configManager.getProviderConfig('default');
    if (!config) {
      throw new Error('Provider not configured');
    }

    return config.apiStyle === 'anthropic' ? this.anthropicAdapter : this.openAIAdapter;
  }

  /**
   * Log debug message
   */
  private log(message: string): void {
    if (this.outputChannel) {
      this.outputChannel.appendLine(`[UnifiedAdapter] ${message}`);
    }
  }

  // Abstract method implementations (stub - not used in delegation pattern)

  protected validateApiKey(_key: string): boolean {
    // This is handled by the actual adapters (OpenAI/Anthropic)
    // Not used in unified adapter since we delegate all operations
    return true;
  }

  protected formatRequest(
    _model: string,
    _messages: ProviderMessage[],
    _options: ChatOptions
  ): Record<string, unknown> {
    // This is handled by the actual adapters (OpenAI/Anthropic)
    // Not used in unified adapter since we delegate all operations
    return {};
  }

  protected parseChunk(_chunk: string): string | null {
    // This is handled by the actual adapters (OpenAI/Anthropic)
    // Not used in unified adapter since we delegate all operations
    return null;
  }
}
