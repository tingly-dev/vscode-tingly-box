/**
 * Unit tests for StatusBarManager
 * Tests status bar display and API style toggling
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

  beforeEach(() => {
    mockSecretStorage = new MockSecretStorage();
    mockOutputChannel = new MockOutputChannel();
    configManager = new ConfigManager(mockSecretStorage as any, mockOutputChannel as any);
    statusBarManager = new StatusBarManager(configManager, mockOutputChannel as any);
  });

  afterEach(() => {
    mockSecretStorage.clear();
    mockOutputChannel.clearLines();
    statusBarManager.dispose();
  });

  describe('initialize', () => {
    it('should update status bar on initialization', async () => {
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

  describe('update with configuration', () => {
    beforeEach(async () => {
      const config: ProviderConfig = {
        baseUrl: 'https://api.example.com/v1',
        token: 'test-token',
        apiStyle: 'openai',
      };
      await configManager.setProviderConfig('default', config);
    });

    it('should show OpenAI style', async () => {
      await statusBarManager.update();

      const lines = mockOutputChannel.getLines();
      assert.ok(lines.some(line => line.includes('OpenAI')));
    });

    it('should show Anthropic style', async () => {
      await configManager.updateAPIStyle('default', 'anthropic');
      await statusBarManager.update();

      const lines = mockOutputChannel.getLines();
      assert.ok(lines.some(line => line.includes('Anthropic')));
    });
  });

  describe('toggleStyle', () => {
    beforeEach(async () => {
      const config: ProviderConfig = {
        baseUrl: 'https://api.example.com/v1',
        token: 'test-token',
        apiStyle: 'openai',
      };
      await configManager.setProviderConfig('default', config);
    });

    it('should toggle from OpenAI to Anthropic', async () => {
      await statusBarManager.toggleStyle();

      const config = await configManager.getProviderConfig('default');
      assert.strictEqual(config?.apiStyle, 'anthropic');
    });

    it('should toggle from Anthropic to OpenAI', async () => {
      await configManager.updateAPIStyle('default', 'anthropic');
      await statusBarManager.initialize();

      await statusBarManager.toggleStyle();

      const config = await configManager.getProviderConfig('default');
      assert.strictEqual(config?.apiStyle, 'openai');
    });

    it('should log toggle action', async () => {
      await statusBarManager.toggleStyle();

      const lines = mockOutputChannel.getLines();
      assert.ok(lines.some(line => line.includes('Toggling style')));
    });

    it('should handle errors gracefully', async () => {
      // Remove configuration to trigger error
      await configManager.removeProviderConfig('default');

      // Should not throw
      await statusBarManager.toggleStyle();

      const lines = mockOutputChannel.getLines();
      assert.ok(lines.some(line => line.includes('Error')) || lines.length > 0);
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
});
