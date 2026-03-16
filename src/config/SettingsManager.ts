/**
 * Settings manager
 * Provides UI for managing Tingly Box configuration
 */

import * as vscode from 'vscode';
import { ConfigManager } from './ConfigManager.js';

/**
 * Manages the settings UI for configuring providers
 */
export class SettingsManager {
  constructor(
    private readonly config: ConfigManager,
    private readonly output: vscode.OutputChannel
  ) {}

  /**
   * Open the settings management UI
   */
  async openSettingsUI(): Promise<void> {
    this.output.appendLine('[Settings] Opening settings UI');

    const providerId = 'default';
    const provider = { displayName: 'Tingly Box' };

    await this.configureProvider(providerId, provider);
  }

  /**
   * Configure a specific provider
   */
  private async configureProvider(providerId: string, provider: any): Promise<void> {
    const hasConfig = await this.config.hasConfiguredProvider(providerId);

    // Show options for this provider
    const actions = hasConfig
      ? ['Update Configuration', 'Remove Configuration', 'Cancel']
      : ['Add Configuration', 'Cancel'];

    const action = await vscode.window.showQuickPick(actions, {
      placeHolder: `Manage ${provider.displayName} configuration`,
    });

    if (!action || action === 'Cancel') {
      return;
    }

    switch (action) {
      case 'Add Configuration':
      case 'Update Configuration':
        await this.promptForConfiguration(providerId, provider);
        break;

      case 'Remove Configuration':
        await this.removeConfiguration(providerId, provider);
        break;
    }
  }

  /**
   * Prompt user to enter base URL and token
   */
  private async promptForConfiguration(providerId: string, provider: any): Promise<void> {
    // Step 1: Get base URL
    const currentConfig = await this.config.getProviderConfig(providerId);
    const baseUrl = await vscode.window.showInputBox({
      prompt: 'Enter your API Base URL',
      placeHolder: 'http://localhost:12580/tingly/openai',
      value: currentConfig?.baseUrl || 'http://localhost:12580/tingly/openai',
      validateInput: (value) => {
        if (!value || value.trim().length === 0) {
          return 'Base URL cannot be empty';
        }

        try {
          const url = new URL(value.trim());
          if (url.protocol !== 'http:' && url.protocol !== 'https:') {
            return 'URL must use http or https protocol';
          }
          return null;
        } catch {
          return 'Invalid URL format';
        }
      },
    });

    if (!baseUrl) {
      return; // User cancelled
    }

    // Step 2: Get API style
    const apiStyle = await vscode.window.showQuickPick(
      [
        { label: 'OpenAI Style', description: 'Use OpenAI-compatible message format', value: 'openai' },
        { label: 'Anthropic Style', description: 'Use Anthropic/Claude message format', value: 'anthropic' }
      ],
      {
        placeHolder: 'Select API message style',
        title: 'Tingly Box For VS Code - API Style Selection',
      }
    );

    if (!apiStyle) {
      return; // User cancelled
    }

    // Step 3: Get token (optional)
    const token = await vscode.window.showInputBox({
      prompt: 'Enter your API Token (optional - leave empty if not required)',
      password: true,
      placeHolder: 'sk-... or Bearer token (press Enter to skip)',
      value: currentConfig?.token || '',
    });

    if (token === undefined) {
      return; // User cancelled (explicitly pressed Esc)
    }

    // Save configuration
    try {
      await this.config.setProviderConfig(providerId, {
        baseUrl: baseUrl.trim(),
        token: token.trim(),
        apiStyle: apiStyle.value as 'anthropic' | 'openai',
      });

      vscode.window.showInformationMessage(
        `${provider.displayName} configuration saved successfully (API style: ${apiStyle.label}).`
      );
      this.output.appendLine(
        `[Settings] Configuration saved for ${provider.displayName} (API style: ${apiStyle.value})`
      );
    } catch (error) {
      vscode.window.showErrorMessage(
        `Failed to save configuration: ${error instanceof Error ? error.message : String(error)}`
      );
    }
  }

  /**
   * Remove configuration for a provider
   */
  private async removeConfiguration(providerId: string, provider: any): Promise<void> {
    const confirmed = await vscode.window.showWarningMessage(
      `Are you sure you want to remove the ${provider.displayName} configuration?`,
      { modal: true },
      'Remove',
      'Cancel'
    );

    if (confirmed !== 'Remove') {
      return;
    }

    try {
      await this.config.removeProviderConfig(providerId);
      vscode.window.showInformationMessage(
        `${provider.displayName} configuration has been removed.`
      );
      this.output.appendLine(
        `[Settings] Configuration removed for ${provider.displayName}`
      );
    } catch (error) {
      vscode.window.showErrorMessage(
        `Failed to remove configuration: ${error instanceof Error ? error.message : String(error)}`
      );
    }
  }

  /**
   * Show configuration status
   */
  async showStatus(): Promise<void> {
    const providerId = 'default';
    const config = await this.config.getProviderConfig(providerId);

    if (config) {
      const url = new URL(config.baseUrl);
      const host = url.hostname;
      const style = config.apiStyle === 'anthropic' ? 'Anthropic' : 'OpenAI';
      const tokenStatus = config.token ? 'configured' : 'not set';

      vscode.window.showInformationMessage(
        `Tingly Box For VS Code: $(check) Configured\nHost: ${host}\nAPI Style: ${style}\nToken: ${tokenStatus}`,
        { modal: true }
      );
    } else {
      vscode.window.showInformationMessage(
        'Tingly Box For VS Code: $(circle-large-outline) Not configured',
        { modal: true }
      );
    }
  }

  /**
   * Toggle API style for a provider
   */
  async toggleAPIStyle(providerId: string): Promise<void> {
    const config = await this.config.getProviderConfig(providerId);
    if (!config) {
      vscode.window.showWarningMessage('Provider not configured. Please configure it first.');
      return;
    }

    const newStyle = config.apiStyle === 'anthropic' ? 'openai' : 'anthropic';
    await this.config.updateAPIStyle(providerId, newStyle);

    vscode.window.showInformationMessage(
      `API style changed to ${newStyle === 'anthropic' ? 'Anthropic' : 'OpenAI'}.`
    );
    this.output.appendLine(`[Settings] API style toggled to ${newStyle} for ${providerId}`);
  }

  /**
   * Reset all configuration with one-step confirmation
   * Non-modal warning message at bottom right with Reset/Cancel options
   */
  async resetAllConfiguration(): Promise<void> {
    this.output.appendLine('[Settings] Initiating configuration reset...');

    // Single confirmation - non-modal message at bottom right
    const confirmation = await vscode.window.showWarningMessage(
      'This will remove all your configuration in Tingly Box For VS Code. This action cannot be undone.',
      'Reset',
      'Cancel'
    );

    if (confirmation !== 'Reset') {
      this.output.appendLine('[Settings] Reset cancelled');
      return;
    }

    // Perform the reset
    try {
      await this.config.clearAllConfig();

      // Prompt user to reload window to clear VSCode's cached model list
      const shouldReload = await vscode.window.showInformationMessage(
        'All Tingly Box For VS Code configuration has been reset. Please reload the window to clear the model list.',
        'Reload Window',
        'Later'
      );

      if (shouldReload === 'Reload Window') {
        await vscode.commands.executeCommand('workbench.action.reloadWindow');
      }

      this.output.appendLine('[Settings] All configuration reset successfully');
    } catch (error) {
      vscode.window.showErrorMessage(
        `Failed to reset configuration: ${error instanceof Error ? error.message : String(error)}`
      );
      this.output.appendLine(`[Settings] Error resetting configuration: ${error}`);
    }
  }
}
