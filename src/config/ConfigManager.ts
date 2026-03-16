/**
 * Configuration manager for API tokens and base URLs
 * Uses VSCode SecretStorage for secure credential storage
 */

import * as vscode from 'vscode';
import { EventEmitter } from 'events';
import type { ProviderConfig, APIStyle } from '../types/index.js';

/**
 * Configuration change event
 */
export interface ConfigChangeEvent {
  providerId: string;
  action: 'set' | 'remove';
}

/**
 * Manages secure storage of API tokens and base URLs
 */
export class ConfigManager extends EventEmitter {
  private static readonly STORAGE_PREFIX = 'tinglybox.';
  private readonly outputChannel?: vscode.OutputChannel;

  // Event name for configuration changes
  static readonly CONFIG_CHANGED = 'configChanged';

  constructor(private readonly secrets: vscode.SecretStorage, outputChannel?: vscode.OutputChannel) {
    super();
    this.outputChannel = outputChannel;
  }

  /**
   * Log debug message
   */
  private log(message: string): void {
    if (this.outputChannel) {
      this.outputChannel.appendLine(`[ConfigManager] ${message}`);
    }
  }

  /**
   * Get configuration for a specific provider
   * @param providerId - The provider identifier (e.g., 'default')
   * @returns The provider configuration or undefined if not configured
   */
  async getProviderConfig(providerId: string): Promise<ProviderConfig | undefined> {
    const tokenKey = `${ConfigManager.STORAGE_PREFIX}${providerId}.token`;
    const urlKey = `${ConfigManager.STORAGE_PREFIX}${providerId}.baseUrl`;
    const styleKey = `${ConfigManager.STORAGE_PREFIX}${providerId}.apiStyle`;

    this.log(`Reading config for provider: ${providerId}`);

    const [token, baseUrl, apiStyle] = await Promise.all([
      this.secrets.get(tokenKey),
      this.secrets.get(urlKey),
      this.secrets.get(styleKey),
    ]);

    if (!baseUrl) {
      this.log(`Config for ${providerId}: incomplete (baseUrl: ${!!baseUrl})`);
      return undefined;
    }

    // Use 'openai' as default API style if not set (for backwards compatibility)
    const style = (apiStyle as APIStyle) || 'openai';

    // Log base URL (token may be empty)
    const maskedToken = token ? `****${token.slice(-4)}` : '(empty)';
    this.log(`Config for ${providerId}: baseUrl=${baseUrl}, apiStyle=${style}, token=${maskedToken}`);

    return { token: token || '', baseUrl, apiStyle: style };
  }

  /**
   * Get API token for a specific provider
   * @param providerId - The provider identifier
   * @returns The API token or undefined if not configured
   */
  async getToken(providerId: string): Promise<string | undefined> {
    const key = `${ConfigManager.STORAGE_PREFIX}${providerId}.token`;
    const token = await this.secrets.get(key);
    this.log(`Get token for ${providerId}: ${token ? `****${token.slice(-4)}` : 'not found'}`);
    return token;
  }

  /**
   * Get base URL for a specific provider
   * @param providerId - The provider identifier
   * @returns The base URL or undefined if not configured
   */
  async getBaseUrl(providerId: string): Promise<string | undefined> {
    const key = `${ConfigManager.STORAGE_PREFIX}${providerId}.baseUrl`;
    const baseUrl = await this.secrets.get(key);
    this.log(`Get baseUrl for ${providerId}: ${baseUrl || 'not found'}`);
    return baseUrl;
  }

  /**
   * Get API style for a specific provider
   * @param providerId - The provider identifier
   * @returns The API style or 'openai' as default
   */
  async getAPIStyle(providerId: string): Promise<APIStyle> {
    const key = `${ConfigManager.STORAGE_PREFIX}${providerId}.apiStyle`;
    const style = await this.secrets.get(key);
    const result = (style as APIStyle) || 'openai';
    this.log(`Get apiStyle for ${providerId}: ${result}`);
    return result;
  }

  /**
   * Store configuration for a provider
   * @param providerId - The provider identifier
   * @param config - The configuration to store
   * @throws Error if validation fails
   */
  async setProviderConfig(providerId: string, config: ProviderConfig): Promise<void> {
    this.log(`Storing config for ${providerId}: baseUrl=${config.baseUrl}, apiStyle=${config.apiStyle}, token=${config.token ? '****' + config.token.slice(-4) : '(empty)'}`);

    // Validate URL format
    if (!this.isValidUrl(config.baseUrl)) {
      throw new Error('Invalid base URL format');
    }

    // Validate API style
    if (config.apiStyle !== 'anthropic' && config.apiStyle !== 'openai') {
      throw new Error('API style must be either "anthropic" or "openai"');
    }

    const tokenKey = `${ConfigManager.STORAGE_PREFIX}${providerId}.token`;
    const urlKey = `${ConfigManager.STORAGE_PREFIX}${providerId}.baseUrl`;
    const styleKey = `${ConfigManager.STORAGE_PREFIX}${providerId}.apiStyle`;

    await Promise.all([
      this.secrets.store(tokenKey, config.token || ''),
      this.secrets.store(urlKey, config.baseUrl),
      this.secrets.store(styleKey, config.apiStyle),
    ]);

    this.log(`Config stored successfully for ${providerId}`);

    // Emit configuration change event
    this.emit(ConfigManager.CONFIG_CHANGED, { providerId, action: 'set' });
  }

  /**
   * Remove configuration for a provider
   * @param providerId - The provider identifier
   */
  async removeProviderConfig(providerId: string): Promise<void> {
    this.log(`Removing config for ${providerId}`);

    const tokenKey = `${ConfigManager.STORAGE_PREFIX}${providerId}.token`;
    const urlKey = `${ConfigManager.STORAGE_PREFIX}${providerId}.baseUrl`;
    const styleKey = `${ConfigManager.STORAGE_PREFIX}${providerId}.apiStyle`;

    await Promise.all([
      this.secrets.delete(tokenKey),
      this.secrets.delete(urlKey),
      this.secrets.delete(styleKey),
    ]);

    this.log(`Config removed for ${providerId}`);

    // Emit configuration change event
    this.emit(ConfigManager.CONFIG_CHANGED, { providerId, action: 'remove' });
  }

  /**
   * Check if a provider has been configured
   * @param providerId - The provider identifier
   * @returns True if the provider has a complete configuration
   */
  async hasConfiguredProvider(providerId: string): Promise<boolean> {
    const config = await this.getProviderConfig(providerId);
    const isConfigured = config !== undefined;
    this.log(`Provider ${providerId} configured: ${isConfigured}`);
    return isConfigured;
  }

  /**
   * Validate URL format
   * @param url - The URL to validate
   * @returns True if the URL is valid
   */
  private isValidUrl(url: string): boolean {
    try {
      const parsed = new URL(url);
      const isValid = parsed.protocol === 'http:' || parsed.protocol === 'https:';
      this.log(`URL validation for ${url}: ${isValid ? 'valid' : 'invalid'}`);
      return isValid;
    } catch {
      this.log(`URL validation for ${url}: invalid (parse error)`);
      return false;
    }
  }

  /**
   * Update only the API style for a provider
   * @param providerId - The provider identifier
   * @param apiStyle - The new API style
   */
  async updateAPIStyle(providerId: string, apiStyle: APIStyle): Promise<void> {
    this.log(`Updating API style for ${providerId}: ${apiStyle}`);

    if (apiStyle !== 'anthropic' && apiStyle !== 'openai') {
      throw new Error('API style must be either "anthropic" or "openai"');
    }

    const styleKey = `${ConfigManager.STORAGE_PREFIX}${providerId}.apiStyle`;
    await this.secrets.store(styleKey, apiStyle);

    this.log(`API style updated for ${providerId}`);

    // Emit configuration change event
    this.emit(ConfigManager.CONFIG_CHANGED, { providerId, action: 'set' });
  }

  /**
   * Clear all Tingly Box configuration from storage
   * Deletes all SecretStorage keys with the 'tinglybox.' prefix
   */
  async clearAllConfig(): Promise<void> {
    this.log('Clearing all Tingly Box For VS Code configuration...');

    // Known keys to delete
    const keysToDelete = [
      `${ConfigManager.STORAGE_PREFIX}default.token`,
      `${ConfigManager.STORAGE_PREFIX}default.baseUrl`,
      `${ConfigManager.STORAGE_PREFIX}default.apiStyle`,
    ];

    // Delete all known keys
    await Promise.all(keysToDelete.map(key => this.secrets.delete(key)));

    this.log('All configuration cleared');

    // Emit configuration change event for default provider
    this.emit(ConfigManager.CONFIG_CHANGED, { providerId: 'default', action: 'remove' });
  }
}
