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

    // Add option to add a new provider (for future extensibility)
    items.push({
      label: 'Learn more about providers',
      description: '$(info) Documentation',
      providerId: 'learn-more',
      provider: null as any,
    });

    const selected = await vscode.window.showQuickPick(items, {
      placeHolder: 'Select a provider to configure',
      title: 'Tingly Box - Provider Settings',
    });

    if (!selected) {
      return; // User cancelled
    }

    if (selected.providerId === 'learn-more') {
      // Open documentation (placeholder)
      vscode.env.openExternal(
        vscode.Uri.parse('https://github.com/your-repo/vscode-tingly-box#configuration')
      );
      return;
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
      ? ['Update API Key', 'Remove API Key', 'Cancel']
      : ['Add API Key', 'Cancel'];

    const action = await vscode.window.showQuickPick(actions, {
      placeHolder: `Manage ${provider.displayName} configuration`,
    });

    if (!action || action === 'Cancel') {
      return;
    }

    switch (action) {
      case 'Add API Key':
      case 'Update API Key':
        await this.promptForApiKey(providerId, provider);
        break;

      case 'Remove API Key':
        await this.removeApiKey(providerId, provider);
        break;
    }
  }

  /**
   * Prompt user to enter API key
   */
  private async promptForApiKey(providerId: string, provider: any): Promise<void> {
    const apiKey = await vscode.window.showInputBox({
      prompt: `Enter your ${provider.displayName} API key`,
      password: true,
      placeHolder: this.getPlaceholderForKey(providerId),
      validateInput: (value) => {
        if (!value || value.length === 0) {
          return 'API key cannot be empty';
        }

        // Basic validation
        if (providerId === 'openai' && !value.startsWith('sk-')) {
          return 'OpenAI API keys must start with "sk-"';
        }

        if (providerId === 'anthropic' && !value.startsWith('sk-ant-')) {
          return 'Anthropic API keys must start with "sk-ant-"';
        }

        if (value.length < 20) {
          return 'API key appears to be too short';
        }

        return null;
      },
    });

    if (!apiKey) {
      return; // User cancelled
    }

    try {
      await this.config.setApiKey(providerId, apiKey);
      vscode.window.showInformationMessage(
        `${provider.displayName} API key saved successfully.`
      );
      this.output.appendLine(
        `[Settings] API key saved for ${provider.displayName}`
      );
    } catch (error) {
      vscode.window.showErrorMessage(
        `Failed to save API key: ${error instanceof Error ? error.message : String(error)}`
      );
    }
  }

  /**
   * Remove API key for a provider
   */
  private async removeApiKey(providerId: string, provider: any): Promise<void> {
    const confirmed = await vscode.window.showWarningMessage(
      `Are you sure you want to remove the ${provider.displayName} API key?`,
      { modal: true },
      'Remove',
      'Cancel'
    );

    if (confirmed !== 'Remove') {
      return;
    }

    try {
      await this.config.removeApiKey(providerId);
      vscode.window.showInformationMessage(
        `${provider.displayName} API key has been removed.`
      );
      this.output.appendLine(
        `[Settings] API key removed for ${provider.displayName}`
      );
    } catch (error) {
      vscode.window.showErrorMessage(
        `Failed to remove API key: ${error instanceof Error ? error.message : String(error)}`
      );
    }
  }

  /**
   * Get placeholder text for API key input
   */
  private getPlaceholderForKey(providerId: string): string {
    switch (providerId) {
      case 'openai':
        return 'sk-...';
      case 'anthropic':
        return 'sk-ant-...';
      default:
        return 'Enter API key';
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

    let message = 'Tingly Box Provider Status:\n\n';

    for (const provider of providers) {
      const configured = await this.config.hasConfiguredProvider(provider.id);
      const status = configured ? '$(check) Configured' : '$(circle-large-outline) Not configured';
      message += `${provider.displayName}: ${status}\n`;
    }

    vscode.window.showInformationMessage(message, { modal: true });
  }
}
