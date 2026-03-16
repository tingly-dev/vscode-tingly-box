/**
 * Configuration manager for API tokens and base URLs
 * Uses VSCode SecretStorage for secure credential storage
 */

import * as vscode from 'vscode';
import type { ProviderConfig } from '../types/index.js';

/**
 * Manages secure storage of API tokens and base URLs
 */
export class ConfigManager {
  private static readonly STORAGE_PREFIX = 'tinglybox.';
  private readonly outputChannel?: vscode.OutputChannel;

  constructor(private readonly secrets: vscode.SecretStorage, outputChannel?: vscode.OutputChannel) {
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

    this.log(`Reading config for provider: ${providerId}`);

    const [token, baseUrl] = await Promise.all([
      this.secrets.get(tokenKey),
      this.secrets.get(urlKey),
    ]);

    if (!token || !baseUrl) {
      this.log(`Config for ${providerId}: incomplete (token: ${!!token}, baseUrl: ${!!baseUrl})`);
      return undefined;
    }

    // Log base URL (but mask token)
    this.log(`Config for ${providerId}: baseUrl=${baseUrl}, token=****${token.slice(-4)}`);

    return { token, baseUrl };
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
   * Store configuration for a provider
   * @param providerId - The provider identifier
   * @param config - The configuration to store
   * @throws Error if validation fails
   */
  async setProviderConfig(providerId: string, config: ProviderConfig): Promise<void> {
    this.log(`Storing config for ${providerId}: baseUrl=${config.baseUrl}, token=****${config.token.slice(-4)}`);

    // Validate URL format
    if (!this.isValidUrl(config.baseUrl)) {
      throw new Error('Invalid base URL format');
    }

    // Validate token
    if (!config.token || config.token.length === 0) {
      throw new Error('Token cannot be empty');
    }

    const tokenKey = `${ConfigManager.STORAGE_PREFIX}${providerId}.token`;
    const urlKey = `${ConfigManager.STORAGE_PREFIX}${providerId}.baseUrl`;

    await Promise.all([
      this.secrets.store(tokenKey, config.token),
      this.secrets.store(urlKey, config.baseUrl),
    ]);

    this.log(`Config stored successfully for ${providerId}`);
  }

  /**
   * Remove configuration for a provider
   * @param providerId - The provider identifier
   */
  async removeProviderConfig(providerId: string): Promise<void> {
    this.log(`Removing config for ${providerId}`);

    const tokenKey = `${ConfigManager.STORAGE_PREFIX}${providerId}.token`;
    const urlKey = `${ConfigManager.STORAGE_PREFIX}${providerId}.baseUrl`;

    await Promise.all([
      this.secrets.delete(tokenKey),
      this.secrets.delete(urlKey),
    ]);

    this.log(`Config removed for ${providerId}`);
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
}
