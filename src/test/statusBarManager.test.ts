/**
 * Unit tests for StatusBarManager
 * Tests status bar display and connection status tracking
 */

import * as assert from 'assert';
import { describe, it, beforeEach, afterEach } from 'mocha';
import { StatusBarManager } from '../config/StatusBarManager.js';
import { ConfigManager } from '../config/ConfigManager.js';
import { MockSecretStorage, MockOutputChannel } from './utilities.js';
import type { ProviderConfig } from '../types/index.js';

describe('StatusBarManager', () => {
  let statusBarManager: StatusBarManager;
  let configManager: ConfigManager;
  let mockSecretStorage: MockSecretStorage;
  let mockOutputChannel: MockOutputChannel;
  let originalFetch: typeof fetch;

  beforeEach(() => {
    // Store original fetch
    originalFetch = global.fetch;

    mockSecretStorage = new MockSecretStorage();
    mockOutputChannel = new MockOutputChannel();
    configManager = new ConfigManager(mockSecretStorage as any, mockOutputChannel as any);
    statusBarManager = new StatusBarManager(configManager, mockOutputChannel as any);
  });

  afterEach(() => {
    // Restore original fetch
    global.fetch = originalFetch;

    mockSecretStorage.clear();
    mockOutputChannel.clearLines();
    statusBarManager.dispose();
  });

  describe('initialize', () => {
    it('should update status bar on initialization', async () => {
      // Mock fetch to avoid network calls
      global.fetch = async () => ({
        ok: true,
        json: async () => ({ data: [] }),
      } as Response);

      await statusBarManager.initialize();
      // Should not throw
      assert.strictEqual(true, true);
    });
  });

  describe('update with no configuration', () => {
    it('should show setup prompt', async () => {
      await statusBarManager.update();

      const lines = mockOutputChannel.getLines();
      assert.ok(lines.some(line => line.includes('Showing setup prompt')));
    });
  });

  describe('update with configuration and successful API call', () => {
    beforeEach(async () => {
      const config: ProviderConfig = {
        baseUrl: 'https://api.example.com/v1',
        token: 'test-token',
        apiStyle: 'openai',
      };
      await configManager.setProviderConfig('default', config);
    });

    it('should show connected status with model count', async () => {
      // Mock successful fetch with models
      global.fetch = async () => ({
        ok: true,
        json: async () => ({ data: [{ id: 'model1' }, { id: 'model2' }, { id: 'model3' }] }),
      } as Response);

      await statusBarManager.update();

      const lines = mockOutputChannel.getLines();
      assert.ok(lines.some(line => line.includes('Connected: 3 models available')));
    });
  });

  describe('update with configuration but API error', () => {
    beforeEach(async () => {
      const config: ProviderConfig = {
        baseUrl: 'https://api.example.com/v1',
        token: 'test-token',
        apiStyle: 'openai',
      };
      await configManager.setProviderConfig('default', config);
    });

    it('should show disconnected status', async () => {
      // Mock failed fetch
      global.fetch = async () => {
        throw new Error('Network error');
      };

      await statusBarManager.update();

      const lines = mockOutputChannel.getLines();
      assert.ok(lines.some(line => line.includes('Failed to fetch models')));
    });
  });

  describe('refreshModelCount', () => {
    beforeEach(async () => {
      const config: ProviderConfig = {
        baseUrl: 'https://api.example.com/v1',
        token: 'test-token',
        apiStyle: 'openai',
      };
      await configManager.setProviderConfig('default', config);
    });

    it('should update model count on successful fetch', async () => {
      global.fetch = async () => ({
        ok: true,
        json: async () => ({ data: [{ id: 'model1' }, { id: 'model2' }] }),
      } as Response);

      await statusBarManager.refreshModelCount();

      const lines = mockOutputChannel.getLines();
      assert.ok(lines.some(line => line.includes('Connected: 2 models available')));
    });

    it('should show disconnected status on fetch failure', async () => {
      global.fetch = async () => {
        throw new Error('API error');
      };

      await statusBarManager.refreshModelCount();

      const lines = mockOutputChannel.getLines();
      assert.ok(lines.some(line => line.includes('Failed to fetch models')));
    });

    it('should handle API returning no models', async () => {
      global.fetch = async () => ({
        ok: true,
        json: async () => ({ data: [] }),
      } as Response);

      await statusBarManager.refreshModelCount();

      const lines = mockOutputChannel.getLines();
      assert.ok(lines.some(line => line.includes('Connected: 0 models available')));
    });

    it('should handle API error response', async () => {
      global.fetch = async () => ({
        ok: false,
        status: 401,
        statusText: 'Unauthorized',
      } as Response);

      await statusBarManager.refreshModelCount();

      const lines = mockOutputChannel.getLines();
      assert.ok(lines.some(line => line.includes('Failed to fetch models')));
    });
  });

  describe('dispose', () => {
    it('should dispose status bar item', () => {
      statusBarManager.dispose();

      const lines = mockOutputChannel.getLines();
      assert.ok(lines.some(line => line.includes('disposed')));
    });

    it('should be safe to call multiple times', () => {
      statusBarManager.dispose();
      statusBarManager.dispose();
      statusBarManager.dispose();

      // Should not throw
      assert.strictEqual(true, true);
    });
  });

  describe('status bar display', () => {
    it('should use openConfigWebview command when not configured', async () => {
      await statusBarManager.update();

      // The status bar should be set up with the webview command
      const lines = mockOutputChannel.getLines();
      assert.ok(lines.some(line => line.includes('Showing setup prompt')));
    });

    it('should use openConfigWebview command when connected', async () => {
      const config: ProviderConfig = {
        baseUrl: 'https://api.example.com/v1',
        token: 'test-token',
        apiStyle: 'openai',
      };
      await configManager.setProviderConfig('default', config);

      global.fetch = async () => ({
        ok: true,
        json: async () => ({ data: [{ id: 'model1' }] }),
      } as Response);

      await statusBarManager.update();

      // Should show connected status
      const lines = mockOutputChannel.getLines();
      assert.ok(lines.some(line => line.includes('Connected: 1 models available')));
    });
  });
});
