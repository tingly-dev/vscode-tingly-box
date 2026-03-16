/**
 * Settings manager
 * Provides UI for managing provider configurations
 */

import * as vscode from 'vscode';
import { ConfigManager } from './ConfigManager.js';
import { ProviderRegistry } from '../provider/ProviderRegistry.js';

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

    const providers = ProviderRegistry.list();

    if (providers.length === 0) {
      vscode.window.showInformationMessage('No providers available.');
      return;
    }

    // Create quick pick items for each provider
    const items = await Promise.all(
      providers.map(async (provider) => ({
        label: provider.displayName,
        description: await this.config.hasConfiguredProvider(provider.id)
          ? '$(check) Configured'
          : '$(circle-large-outline) Not configured',
        providerId: provider.id,
        provider,
      }))
    );

    const selected = await vscode.window.showQuickPick(items, {
      placeHolder: 'Select a provider to configure',
      title: 'Tingly Box VSCode - Provider Settings',
    });

    if (!selected) {
      return; // User cancelled
    }

    await this.configureProvider(selected.providerId, selected.provider);
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

    // Step 2: Get token
    const token = await vscode.window.showInputBox({
      prompt: 'Enter your API Token',
      password: true,
      placeHolder: 'sk-... or Bearer token',
      value: '',
      validateInput: (value) => {
        if (!value || value.trim().length === 0) {
          return 'Token cannot be empty';
        }

        if (value.trim().length < 10) {
          return 'Token appears to be too short';
        }

        return null;
      },
    });

    if (!token) {
      return; // User cancelled
    }

    // Save configuration
    try {
      await this.config.setProviderConfig(providerId, {
        baseUrl: baseUrl.trim(),
        token: token.trim(),
      });

      vscode.window.showInformationMessage(
        `${provider.displayName} configuration saved successfully.`
      );
      this.output.appendLine(
        `[Settings] Configuration saved for ${provider.displayName}`
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
    const providers = ProviderRegistry.list();

    if (providers.length === 0) {
      vscode.window.showInformationMessage('No providers available.');
      return;
    }

    let message = 'Tingly Box VSCode - Provider Status:\n\n';

    for (const provider of providers) {
      const config = await this.config.getProviderConfig(provider.id);
      if (config) {
        // Show partial URL for privacy
        const url = new URL(config.baseUrl);
        const host = url.hostname;
        message += `${provider.displayName}: $(check) Configured (${host})\n`;
      } else {
        message += `${provider.displayName}: $(circle-large-outline) Not configured\n`;
      }
    }

    vscode.window.showInformationMessage(message, { modal: true });
  }
}
