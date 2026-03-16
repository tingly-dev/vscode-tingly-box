/**
 * Unit tests for ConfigManager
 * Tests configuration storage, retrieval, and validation
 */

import * as assert from 'assert';
import { describe, it, beforeEach, afterEach } from 'mocha';
import { ConfigManager } from '../config/ConfigManager.js';
import { MockSecretStorage, MockOutputChannel } from './utilities.js';
import type { ProviderConfig, APIStyle } from '../types/index.js';

describe('ConfigManager', () => {
  let configManager: ConfigManager;
  let mockSecretStorage: MockSecretStorage;
  let mockOutputChannel: MockOutputChannel;

  beforeEach(() => {
    mockSecretStorage = new MockSecretStorage();
    mockOutputChannel = new MockOutputChannel();
    configManager = new ConfigManager(mockSecretStorage as any, mockOutputChannel as any);
  });

  afterEach(() => {
    mockSecretStorage.clear();
    mockOutputChannel.clearLines();
  });

  describe('setProviderConfig', () => {
    it('should store configuration with valid URL', async () => {
      const config: ProviderConfig = {
        baseUrl: 'https://api.example.com/v1',
        token: 'test-token-12345',
        apiStyle: 'openai',
      };

      await configManager.setProviderConfig('default', config);

      const retrieved = await configManager.getProviderConfig('default');
      assert.deepStrictEqual(retrieved, config);
    });

    it('should reject invalid URL format', async () => {
      const config: ProviderConfig = {
        baseUrl: 'not-a-valid-url',
        token: 'test-token',
        apiStyle: 'openai',
      };

      await assert.rejects(
        async () => await configManager.setProviderConfig('default', config),
        /Invalid base URL format/
      );
    });

    it('should reject non-HTTP/HTTPS URLs', async () => {
      const config: ProviderConfig = {
        baseUrl: 'ftp://example.com',
        token: 'test-token',
        apiStyle: 'openai',
      };

      await assert.rejects(
        async () => await configManager.setProviderConfig('default', config),
        /Invalid base URL format/
      );
    });

    it('should reject invalid API style', async () => {
      const config: ProviderConfig = {
        baseUrl: 'https://api.example.com/v1',
        token: 'test-token',
        apiStyle: 'invalid' as APIStyle,
      };

      await assert.rejects(
        async () => await configManager.setProviderConfig('default', config),
        /API style must be either "anthropic" or "openai"/
      );
    });

    it('should accept empty token', async () => {
      const config: ProviderConfig = {
        baseUrl: 'https://api.example.com/v1',
        token: '',
        apiStyle: 'openai',
      };

      await configManager.setProviderConfig('default', config);

      const retrieved = await configManager.getProviderConfig('default');
      assert.strictEqual(retrieved?.token, '');
    });

    it('should emit CONFIG_CHANGED event on set', async () => {
      let eventFired = false;
      configManager.on(ConfigManager.CONFIG_CHANGED, () => {
        eventFired = true;
      });

      const config: ProviderConfig = {
        baseUrl: 'https://api.example.com/v1',
        token: 'test-token',
        apiStyle: 'openai',
      };

      await configManager.setProviderConfig('default', config);
      assert.strictEqual(eventFired, true);
    });
  });

  describe('getProviderConfig', () => {
    it('should return undefined for non-existent provider', async () => {
      const result = await configManager.getProviderConfig('nonexistent');
      assert.strictEqual(result, undefined);
    });

    it('should return stored configuration', async () => {
      const config: ProviderConfig = {
        baseUrl: 'https://api.example.com/v1',
        token: 'test-token',
        apiStyle: 'anthropic',
      };

      await configManager.setProviderConfig('default', config);

      const retrieved = await configManager.getProviderConfig('default');
      assert.deepStrictEqual(retrieved, config);
    });

    it('should return undefined if baseUrl is missing', async () => {
      // Simulate partial storage
      await mockSecretStorage.store('tinglybox.default.token', 'test-token');
      await mockSecretStorage.store('tinglybox.default.apiStyle', 'openai');

      const result = await configManager.getProviderConfig('default');
      assert.strictEqual(result, undefined);
    });

    it('should default to openai style if not set', async () => {
      await mockSecretStorage.store('tinglybox.default.baseUrl', 'https://api.example.com/v1');
      await mockSecretStorage.store('tinglybox.default.token', 'test-token');

      const result = await configManager.getProviderConfig('default');
      assert.strictEqual(result?.apiStyle, 'openai');
    });
  });

  describe('removeProviderConfig', () => {
    it('should remove existing configuration', async () => {
      const config: ProviderConfig = {
        baseUrl: 'https://api.example.com/v1',
        token: 'test-token',
        apiStyle: 'openai',
      };

      await configManager.setProviderConfig('default', config);
      assert.strictEqual(await configManager.hasConfiguredProvider('default'), true);

      await configManager.removeProviderConfig('default');
      assert.strictEqual(await configManager.hasConfiguredProvider('default'), false);
    });

    it('should emit CONFIG_CHANGED event on remove', async () => {
      const config: ProviderConfig = {
        baseUrl: 'https://api.example.com/v1',
        token: 'test-token',
        apiStyle: 'openai',
      };

      await configManager.setProviderConfig('default', config);

      let eventFired = false;
      let action: 'set' | 'remove' | undefined;
      configManager.on(ConfigManager.CONFIG_CHANGED, (e) => {
        eventFired = true;
        action = e.action;
      });

      await configManager.removeProviderConfig('default');
      assert.strictEqual(eventFired, true);
      assert.strictEqual(action, 'remove');
    });
  });

  describe('hasConfiguredProvider', () => {
    it('should return false for unconfigured provider', async () => {
      const result = await configManager.hasConfiguredProvider('default');
      assert.strictEqual(result, false);
    });

    it('should return true for configured provider', async () => {
      const config: ProviderConfig = {
        baseUrl: 'https://api.example.com/v1',
        token: 'test-token',
        apiStyle: 'openai',
      };

      await configManager.setProviderConfig('default', config);
      const result = await configManager.hasConfiguredProvider('default');
      assert.strictEqual(result, true);
    });
  });

  describe('updateAPIStyle', () => {
    it('should update API style for existing config', async () => {
      const config: ProviderConfig = {
        baseUrl: 'https://api.example.com/v1',
        token: 'test-token',
        apiStyle: 'openai',
      };

      await configManager.setProviderConfig('default', config);
      await configManager.updateAPIStyle('default', 'anthropic');

      const retrieved = await configManager.getProviderConfig('default');
      assert.strictEqual(retrieved?.apiStyle, 'anthropic');
    });

    it('should reject invalid API style', async () => {
      await assert.rejects(
        async () => await configManager.updateAPIStyle('default', 'invalid' as APIStyle),
        /API style must be either "anthropic" or "openai"/
      );
    });

    it('should emit CONFIG_CHANGED event on update', async () => {
      const config: ProviderConfig = {
        baseUrl: 'https://api.example.com/v1',
        token: 'test-token',
        apiStyle: 'openai',
      };

      await configManager.setProviderConfig('default', config);

      let eventFired = false;
      configManager.on(ConfigManager.CONFIG_CHANGED, () => {
        eventFired = true;
      });

      await configManager.updateAPIStyle('default', 'anthropic');
      assert.strictEqual(eventFired, true);
    });
  });

  describe('clearAllConfig', () => {
    it('should remove all configuration', async () => {
      const config: ProviderConfig = {
        baseUrl: 'https://api.example.com/v1',
        token: 'test-token',
        apiStyle: 'openai',
      };

      await configManager.setProviderConfig('default', config);
      assert.strictEqual(await configManager.hasConfiguredProvider('default'), true);

      await configManager.clearAllConfig();
      assert.strictEqual(await configManager.hasConfiguredProvider('default'), false);
    });

    it('should emit CONFIG_CHANGED event', async () => {
      const config: ProviderConfig = {
        baseUrl: 'https://api.example.com/v1',
        token: 'test-token',
        apiStyle: 'openai',
      };

      await configManager.setProviderConfig('default', config);

      let eventFired = false;
      configManager.on(ConfigManager.CONFIG_CHANGED, () => {
        eventFired = true;
      });

      await configManager.clearAllConfig();
      assert.strictEqual(eventFired, true);
    });
  });

  describe('getToken', () => {
    it('should return undefined for missing token', async () => {
      const token = await configManager.getToken('default');
      assert.strictEqual(token, undefined);
    });

    it('should return stored token', async () => {
      const config: ProviderConfig = {
        baseUrl: 'https://api.example.com/v1',
        token: 'my-secret-token',
        apiStyle: 'openai',
      };

      await configManager.setProviderConfig('default', config);
      const token = await configManager.getToken('default');
      assert.strictEqual(token, 'my-secret-token');
    });
  });

  describe('getBaseUrl', () => {
    it('should return undefined for missing baseUrl', async () => {
      const url = await configManager.getBaseUrl('default');
      assert.strictEqual(url, undefined);
    });

    it('should return stored baseUrl', async () => {
      const config: ProviderConfig = {
        baseUrl: 'https://api.example.com/v1',
        token: 'test-token',
        apiStyle: 'openai',
      };

      await configManager.setProviderConfig('default', config);
      const url = await configManager.getBaseUrl('default');
      assert.strictEqual(url, 'https://api.example.com/v1');
    });
  });

  describe('getAPIStyle', () => {
    it('should return openai as default', async () => {
      const style = await configManager.getAPIStyle('default');
      assert.strictEqual(style, 'openai');
    });

    it('should return stored style', async () => {
      const config: ProviderConfig = {
        baseUrl: 'https://api.example.com/v1',
        token: 'test-token',
        apiStyle: 'anthropic',
      };

      await configManager.setProviderConfig('default', config);
      const style = await configManager.getAPIStyle('default');
      assert.strictEqual(style, 'anthropic');
    });
  });
});
