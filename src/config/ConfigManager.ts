/**
 * Configuration manager for API keys and settings
 * Uses VSCode SecretStorage for secure credential storage
 */

import * as vscode from 'vscode';

/**
 * Manages secure storage of API keys and configuration
 */
export class ConfigManager {
  private static readonly STORAGE_PREFIX = 'tinglybox.';

  constructor(private readonly secrets: vscode.SecretStorage) {}

  /**
   * Get API key for a specific provider
   * @param providerId - The provider identifier (e.g., 'openai', 'anthropic')
   * @returns The API key or undefined if not configured
   */
  async getApiKey(providerId: string): Promise<string | undefined> {
    const key = `${ConfigManager.STORAGE_PREFIX}${providerId}.apiKey`;
    return await this.secrets.get(key);
  }

  /**
   * Store API key for a specific provider
   * @param providerId - The provider identifier
   * @param apiKey - The API key to store
   * @throws Error if API key format is invalid
   */
  async setApiKey(providerId: string, apiKey: string): Promise<void> {
    // Validate format before storing
    if (!this.validateApiKeyFormat(providerId, apiKey)) {
      throw new Error(`Invalid API key format for ${providerId}`);
    }

    const key = `${ConfigManager.STORAGE_PREFIX}${providerId}.apiKey`;
    await this.secrets.store(key, apiKey);
  }

  /**
   * Remove API key for a specific provider
   * @param providerId - The provider identifier
   */
  async removeApiKey(providerId: string): Promise<void> {
    const key = `${ConfigManager.STORAGE_PREFIX}${providerId}.apiKey`;
    await this.secrets.delete(key);
  }

  /**
   * Check if a provider has been configured with an API key
   * @param providerId - The provider identifier
   * @returns True if the provider has a configured API key
   */
  async hasConfiguredProvider(providerId: string): Promise<boolean> {
    const apiKey = await this.getApiKey(providerId);
    return apiKey !== undefined && apiKey.length > 0;
  }

  /**
   * Validate API key format for a specific provider
   * @param providerId - The provider identifier
   * @param apiKey - The API key to validate
   * @returns True if the format is valid
   */
  private validateApiKeyFormat(providerId: string, apiKey: string): boolean {
    if (!apiKey || apiKey.length === 0) {
      return false;
    }

    switch (providerId) {
      case 'openai':
        // OpenAI keys start with 'sk-' and are typically 40+ characters
        return apiKey.startsWith('sk-') && apiKey.length >= 40;

      case 'anthropic':
        // Anthropic keys start with 'sk-ant-' and are typically 40+ characters
        return apiKey.startsWith('sk-ant-') && apiKey.length >= 40;

      default:
        // For unknown providers, just check minimum length
        return apiKey.length >= 20;
    }
  }

  /**
   * Get all configured provider IDs
   * @returns Array of provider IDs that have API keys configured
   */
  async getConfiguredProviders(): Promise<string[]> {
    const providers: string[] = [];

    // Check common providers
    const commonProviders = ['openai', 'anthropic'];
    for (const providerId of commonProviders) {
      if (await this.hasConfiguredProvider(providerId)) {
        providers.push(providerId);
      }
    }

    return providers;
  }
}
