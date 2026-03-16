/**
 * Provider registry
 * Manages registration and retrieval of AI provider adapters
 */

import type { BaseProviderAdapter } from './BaseProvider.js';

/**
 * Registry for managing AI provider adapters
 * Providers register themselves and can be retrieved by ID
 */
export class ProviderRegistry {
  private static readonly providers = new Map<string, BaseProviderAdapter>();

  /**
   * Register a provider adapter
   * @param provider - The provider adapter to register
   */
  static register(provider: BaseProviderAdapter): void {
    ProviderRegistry.providers.set(provider.id, provider);
  }

  /**
   * Get a provider adapter by ID
   * @param providerId - The provider identifier
   * @returns The provider adapter or undefined if not found
   */
  static get(providerId: string): BaseProviderAdapter | undefined {
    return ProviderRegistry.providers.get(providerId);
  }

  /**
   * Get all registered providers
   * @returns Array of all registered provider adapters
   */
  static list(): BaseProviderAdapter[] {
    return Array.from(ProviderRegistry.providers.values());
  }

  /**
   * Check if a provider is registered
   * @param providerId - The provider identifier
   * @returns True if the provider is registered
   */
  static has(providerId: string): boolean {
    return ProviderRegistry.providers.has(providerId);
  }

  /**
   * Get a provider by model ID
   * Model IDs are in format 'providerId:modelName'
   * @param modelId - The full model identifier
   * @returns The provider adapter or undefined if not found
   */
  static getByModelId(modelId: string): BaseProviderAdapter | undefined {
    const providerId = modelId.split(':')[0];
    return ProviderRegistry.get(providerId);
  }

  /**
   * Extract provider ID from model ID
   * @param modelId - The full model identifier
   * @returns The provider ID
   */
  static extractProviderId(modelId: string): string {
    return modelId.split(':')[0];
  }

  /**
   * Extract model name from model ID
   * @param modelId - The full model identifier
   * @returns The model name (without provider prefix)
   */
  static extractModelName(modelId: string): string {
    const parts = modelId.split(':');
    return parts.length > 1 ? parts.slice(1).join(':') : modelId;
  }
}
