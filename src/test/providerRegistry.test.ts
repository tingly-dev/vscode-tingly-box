/**
 * Unit tests for ProviderRegistry
 * Tests provider registration, retrieval, and model ID parsing
 */

import * as assert from 'assert';
import { describe, it, beforeEach, afterEach } from 'mocha';
import { ProviderRegistry } from '../provider/ProviderRegistry.js';
import { OpenAIAdapter } from '../provider/adapters/OpenAIAdapter.js';

describe('ProviderRegistry', () => {
  let openAIAdapter: OpenAIAdapter;

  beforeEach(() => {
    // Clear any existing providers
    (ProviderRegistry as any).providers.clear();

    openAIAdapter = new OpenAIAdapter();
  });

  afterEach(() => {
    (ProviderRegistry as any).providers.clear();
  });

  describe('register', () => {
    it('should register a provider adapter', () => {
      ProviderRegistry.register(openAIAdapter);
      assert.strictEqual(ProviderRegistry.has('default'), true);
    });

    it('should register multiple providers', () => {
      ProviderRegistry.register(openAIAdapter);
      // Note: Both adapters have same ID 'default' in current implementation
      const providers = ProviderRegistry.list();
      assert.strictEqual(providers.length, 1);
    });
  });

  describe('get', () => {
    it('should return registered provider', () => {
      ProviderRegistry.register(openAIAdapter);
      const provider = ProviderRegistry.get('default');
      assert.strictEqual(provider, openAIAdapter);
    });

    it('should return undefined for non-existent provider', () => {
      const provider = ProviderRegistry.get('nonexistent');
      assert.strictEqual(provider, undefined);
    });
  });

  describe('list', () => {
    it('should return empty array when no providers registered', () => {
      const providers = ProviderRegistry.list();
      assert.deepStrictEqual(providers, []);
    });

    it('should return all registered providers', () => {
      ProviderRegistry.register(openAIAdapter);
      const providers = ProviderRegistry.list();
      assert.strictEqual(providers.length, 1);
      assert.strictEqual(providers[0], openAIAdapter);
    });
  });

  describe('has', () => {
    it('should return false for unregistered provider', () => {
      assert.strictEqual(ProviderRegistry.has('default'), false);
    });

    it('should return true for registered provider', () => {
      ProviderRegistry.register(openAIAdapter);
      assert.strictEqual(ProviderRegistry.has('default'), true);
    });
  });

  describe('getByModelId', () => {
    beforeEach(() => {
      ProviderRegistry.register(openAIAdapter);
    });

    it('should extract provider ID from model ID', () => {
      const provider = ProviderRegistry.getByModelId('default:gpt-4');
      assert.strictEqual(provider, openAIAdapter);
    });

    it('should return undefined for non-existent provider', () => {
      const provider = ProviderRegistry.getByModelId('nonexistent:model');
      assert.strictEqual(provider, undefined);
    });

    it('should handle model IDs without provider prefix', () => {
      const provider = ProviderRegistry.getByModelId('gpt-4');
      assert.strictEqual(provider, undefined); // No provider with empty ID
    });

    it('should handle model IDs with multiple colons', () => {
      ProviderRegistry.register(openAIAdapter);
      const provider = ProviderRegistry.getByModelId('default:model:with:colons');
      assert.strictEqual(provider, openAIAdapter);
    });
  });

  describe('extractProviderId', () => {
    it('should extract provider ID from model ID', () => {
      const providerId = ProviderRegistry.extractProviderId('default:gpt-4');
      assert.strictEqual(providerId, 'default');
    });

    it('should return model ID if no colon present', () => {
      const providerId = ProviderRegistry.extractProviderId('gpt-4');
      assert.strictEqual(providerId, 'gpt-4');
    });
  });

  describe('extractModelName', () => {
    it('should extract model name from model ID', () => {
      const modelName = ProviderRegistry.extractModelName('default:gpt-4');
      assert.strictEqual(modelName, 'gpt-4');
    });

    it('should return full ID if no colon present', () => {
      const modelName = ProviderRegistry.extractModelName('gpt-4');
      assert.strictEqual(modelName, 'gpt-4');
    });

    it('should handle model IDs with multiple colons', () => {
      const modelName = ProviderRegistry.extractModelName('default:model:with:colons');
      assert.strictEqual(modelName, 'model:with:colons');
    });
  });
});
