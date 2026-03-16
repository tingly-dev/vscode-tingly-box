/**
 * Status Bar Manager
 * Manages the status bar item for displaying connection status and model count
 */

import * as vscode from 'vscode';
import { ConfigManager } from './ConfigManager.js';

/**
 * Connection status enum
 */
enum ConnectionStatus {
  Connected = 'connected',
  Disconnected = 'disconnected',
  NotConfigured = 'not_configured'
}

/**
 * Status bar state interface
 */
interface StatusBarState {
  status: ConnectionStatus;
  modelCount: number | null;
  lastUpdated: Date;
}

/**
 * Manages the status bar item for connection status and model count display
 */
export class StatusBarManager implements vscode.Disposable {
  private statusBarItem: vscode.StatusBarItem;
  private state: StatusBarState = {
    status: ConnectionStatus.NotConfigured,
    modelCount: null,
    lastUpdated: new Date()
  };

  constructor(
    private readonly config: ConfigManager,
    private readonly output: vscode.OutputChannel
  ) {
    // Create status bar item
    this.statusBarItem = vscode.window.createStatusBarItem(
      vscode.StatusBarAlignment.Left,
      100
    );
    this.statusBarItem.name = 'Tingly Box';

    this.output.appendLine('[StatusBar] Status bar item created');
  }

  /**
   * Initialize the status bar
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
        this.updateDisplay(ConnectionStatus.NotConfigured, null);
        this.output.appendLine('[StatusBar] Showing setup prompt');
        return;
      }

      // Try to fetch model count to determine connection status
      await this.refreshModelCount();
    } catch (error) {
      this.output.appendLine(`[StatusBar] Error updating: ${error}`);
    }
  }

  /**
   * Refresh model count by fetching from the API
   */
  async refreshModelCount(): Promise<void> {
    try {
      const config = await this.config.getProviderConfig('default');
      if (!config) {
        this.updateDisplay(ConnectionStatus.NotConfigured, null);
        return;
      }

      // Try to fetch models from the API
      const modelsUrl = config.baseUrl.endsWith('/')
        ? `${config.baseUrl}models`
        : `${config.baseUrl}/models`;

      const response = await fetch(modelsUrl, {
        headers: config.token ? { 'Authorization': `Bearer ${config.token}` } : {}
      });

      if (!response.ok) {
        throw new Error(`HTTP ${response.status}: ${response.statusText}`);
      }

      const data = await response.json();
      const modelCount = data.data?.length || 0;

      this.updateDisplay(ConnectionStatus.Connected, modelCount);
      this.output.appendLine(`[StatusBar] Connected: ${modelCount} models available`);
    } catch (error) {
      this.output.appendLine(`[StatusBar] Failed to fetch models: ${error}`);
      this.updateDisplay(ConnectionStatus.Disconnected, null);
    }
  }

  /**
   * Update the status bar display based on connection status and model count
   */
  private updateDisplay(status: ConnectionStatus, modelCount: number | null): void {
    this.state = {
      status,
      modelCount,
      lastUpdated: new Date()
    };

    switch (status) {
      case ConnectionStatus.NotConfigured:
        this.statusBarItem.text = '$(warning) Tingly Box: Setup Required';
        this.statusBarItem.tooltip = 'Tingly Box: Not configured\nClick to setup Base URL and Token';
        this.statusBarItem.command = 'tinglybox.openConfigWebview';
        break;

      case ConnectionStatus.Connected:
        if (modelCount !== null && modelCount > 0) {
          this.statusBarItem.text = `$(check) Tingly Box: ${modelCount} Models`;
          this.statusBarItem.tooltip = `Tingly Box: Connected\n${modelCount} models available\nClick to configure`;
        } else {
          this.statusBarItem.text = '$(check) Tingly Box: Connected';
          this.statusBarItem.tooltip = 'Tingly Box: Connected\nClick to configure';
        }
        this.statusBarItem.command = 'tinglybox.openConfigWebview';
        break;

      case ConnectionStatus.Disconnected:
        this.statusBarItem.text = '$(circle-small) Tingly Box: Disconnected';
        this.statusBarItem.tooltip = 'Tingly Box: Disconnected\nCheck your configuration\nClick to setup';
        this.statusBarItem.command = 'tinglybox.openConfigWebview';
        break;
    }

    this.statusBarItem.show();
  }

  /**
   * Dispose of the status bar item
   */
  dispose(): void {
    this.statusBarItem.dispose();
    this.output.appendLine('[StatusBar] Status bar item disposed');
  }
}
