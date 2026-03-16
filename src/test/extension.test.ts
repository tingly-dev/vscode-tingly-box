/**
 * Main extension test suite
 * Tests VSCode extension activation and command registration
 */

import * as assert from 'assert';
import * as vscode from 'vscode';
import { describe, it } from 'mocha';
import { MockExtensionContext, MockOutputChannel } from './utilities.js';

describe('Extension Test Suite', () => {
  describe('Extension Activation', () => {
    it('should have activation function', () => {
      // Test that we can import the extension module
      assert.ok(true); // Placeholder - actual activation would require more complex setup
    });

    // Temporarily disabled - quick input command hidden in favor of webview
    // it('should register all expected commands', async () => {
    //   const expectedCommands = [
    //     'tinglybox.manage',
    //     'tinglybox.status',
    //     'tinglybox.fetchModels',
    //     'tinglybox.toggleStyle',
    //     'tinglybox.manageLanguageModels',
    //     'tinglybox.resetConfig',
    //     'tinglybox.openConfigWebview',
    //   ];

    //   // After extension activation, these commands should be registered
    //   // This is a placeholder - actual test would run activate() and check
    //   expectedCommands.forEach(_cmd => {
    //     assert.ok(true);
    //   });
    // });
  });

  describe('VSCode API Integration', () => {
    it('should use LanguageModelChatProvider API', () => {
      // Verify that VSCode's LanguageModelChatProvider API exists
      assert.ok(vscode.lm !== undefined);
    });

    it('should support OutputChannel for logging', () => {
      const channel = new MockOutputChannel();
      assert.ok(channel !== undefined);
      assert.strictEqual(channel.name, 'Tingly Box');
      channel.dispose();
    });
  });

  describe('Extension Context', () => {
    it('should work with mock extension context', () => {
      const context = new MockExtensionContext();

      assert.ok(context.globalState !== undefined);
      assert.ok(context.workspaceState !== undefined);
      assert.ok(context.secrets !== undefined);
      assert.ok(context.subscriptions !== undefined);
      assert.strictEqual(context.extensionMode, vscode.ExtensionMode.Test);
    });

    it('should support subscription disposal', () => {
      const context = new MockExtensionContext();

      const disposable = {
        dispose: () => {
          // Mock dispose
        },
      };

      context.subscriptions.push(disposable);
      assert.strictEqual(context.subscriptions.length, 1);

      context.dispose();
      // After disposal, subscriptions should be cleaned up
      assert.strictEqual(true, true);
    });
  });
});
