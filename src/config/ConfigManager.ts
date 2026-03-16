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

  constructor(private readonly secrets: vscode.SecretStorage) {}

  /**
   * Get configuration for a specific provider
   * @param providerId - The provider identifier (e.g., 'default')
   * @returns The provider configuration or undefined if not configured
   */
  async getProviderConfig(providerId: string): Promise<ProviderConfig | undefined> {
    const tokenKey = `${ConfigManager.STORAGE_PREFIX}${providerId}.token`;
    const urlKey = `${ConfigManager.STORAGE_PREFIX}${providerId}.baseUrl`;

    const [token, baseUrl] = await Promise.all([
      this.secrets.get(tokenKey),
      this.secrets.get(urlKey),
    ]);

    if (!token || !baseUrl) {
      return undefined;
    }

    return { token, baseUrl };
  }

  /**
   * Get API token for a specific provider
   * @param providerId - The provider identifier
   * @returns The API token or undefined if not configured
   */
  async getToken(providerId: string): Promise<string | undefined> {
    const key = `${ConfigManager.STORAGE_PREFIX}${providerId}.token`;
    return await this.secrets.get(key);
  }

  /**
   * Get base URL for a specific provider
   * @param providerId - The provider identifier
   * @returns The base URL or undefined if not configured
   */
  async getBaseUrl(providerId: string): Promise<string | undefined> {
    const key = `${ConfigManager.STORAGE_PREFIX}${providerId}.baseUrl`;
    return await this.secrets.get(key);
  }

  /**
   * Store configuration for a provider
   * @param providerId - The provider identifier
   * @param config - The configuration to store
   * @throws Error if validation fails
   */
  async setProviderConfig(providerId: string, config: ProviderConfig): Promise<void> {
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
  }

  /**
   * Remove configuration for a provider
   * @param providerId - The provider identifier
   */
  async removeProviderConfig(providerId: string): Promise<void> {
    const tokenKey = `${ConfigManager.STORAGE_PREFIX}${providerId}.token`;
    const urlKey = `${ConfigManager.STORAGE_PREFIX}${providerId}.baseUrl`;

    await Promise.all([
      this.secrets.delete(tokenKey),
      this.secrets.delete(urlKey),
    ]);
  }

  /**
   * Check if a provider has been configured
   * @param providerId - The provider identifier
   * @returns True if the provider has a complete configuration
   */
  async hasConfiguredProvider(providerId: string): Promise<boolean> {
    const config = await this.getProviderConfig(providerId);
    return config !== undefined;
  }

  /**
   * Validate URL format
   * @param url - The URL to validate
   * @returns True if the URL is valid
   */
  private isValidUrl(url: string): boolean {
    try {
      const parsed = new URL(url);
      return parsed.protocol === 'http:' || parsed.protocol === 'https:';
    } catch {
      return false;
    }
  }
}
