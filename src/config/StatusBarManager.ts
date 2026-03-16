/**
 * Status Bar Manager
 * Manages the status bar item for displaying and toggling API style
 */

import * as vscode from 'vscode';
import { ConfigManager } from './ConfigManager.js';
import type { APIStyle } from '../types/index.js';

/**
 * Manages the status bar item for API style display and toggling
 */
export class StatusBarManager implements vscode.Disposable {
  private statusBarItem: vscode.StatusBarItem;
  private currentStyle: APIStyle = 'openai';

  constructor(
    private readonly config: ConfigManager,
    private readonly output: vscode.OutputChannel
  ) {
    // Create status bar item
    this.statusBarItem = vscode.window.createStatusBarItem(
      vscode.StatusBarAlignment.Right,
      100
    );
    this.statusBarItem.name = 'Tingly Box API Style';

    // Set up click handler to toggle style
    this.statusBarItem.command = 'tinglybox.toggleStyle';

    this.output.appendLine('[StatusBar] Status bar item created');
  }

  /**
   * Initialize the status bar (show after provider is configured)
   */
  async initialize(): Promise<void> {
    await this.update();
  }

  /**
   * Update the status bar display
   */
  async update(): Promise<void> {
    try {
      const config = await this.config.getProviderConfig('default');
      if (!config) {
        this.statusBarItem.hide();
        this.output.appendLine('[StatusBar] Hiding status bar (provider not configured)');
        return;
      }

      this.currentStyle = config.apiStyle;
      const styleLabel = this.currentStyle === 'anthropic' ? 'Anthropic' : 'OpenAI';

      this.statusBarItem.text = `$(chip) Tingly Box: ${styleLabel}`;
      this.statusBarItem.tooltip = `Click to switch API style (current: ${styleLabel})`;
      this.statusBarItem.show();

      this.output.appendLine(`[StatusBar] Updated display: ${styleLabel}`);
    } catch (error) {
      this.output.appendLine(`[StatusBar] Error updating: ${error}`);
    }
  }

  /**
   * Toggle the API style
   */
  async toggleStyle(): Promise<void> {
    try {
      const newStyle: APIStyle = this.currentStyle === 'anthropic' ? 'openai' : 'anthropic';
      this.output.appendLine(`[StatusBar] Toggling style from ${this.currentStyle} to ${newStyle}`);

      await this.config.updateAPIStyle('default', newStyle);
      this.currentStyle = newStyle;

      // Update the display
      await this.update();

      // Show notification
      const styleLabel = newStyle === 'anthropic' ? 'Anthropic' : 'OpenAI';
      vscode.window.showInformationMessage(`API style switched to ${styleLabel}`);
    } catch (error) {
      this.output.appendLine(`[StatusBar] Error toggling style: ${error}`);
      vscode.window.showErrorMessage(
        `Failed to toggle API style: ${error instanceof Error ? error.message : String(error)}`
      );
    }
  }

  /**
   * Dispose of the status bar item
   */
  dispose(): void {
    this.statusBarItem.dispose();
    this.output.appendLine('[StatusBar] Status bar item disposed');
  }
}
