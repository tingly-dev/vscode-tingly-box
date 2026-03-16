// VSCode Extension API
import * as vscode from 'vscode';

// Extension components
import { TinglyBoxProvider } from './provider/TinglyBoxProvider.js';
import { ConfigManager } from './config/ConfigManager.js';
import { SettingsManager } from './config/SettingsManager.js';
import { ProviderRegistry } from './provider/ProviderRegistry.js';
import { OpenAIAdapter } from './provider/adapters/OpenAIAdapter.js';

/**
 * Extension activation function
 * Called when VSCode activates the extension
 */
export function activate(context: vscode.ExtensionContext) {
  console.log('[TinglyBox] Extension is being activated...');

  // Create output channel for logging
  const output = vscode.window.createOutputChannel('Tingly Box');
  context.subscriptions.push(output);
  output.appendLine('[TinglyBox] Extension activated');

  try {
    // Initialize and register providers
    const openAIAdapter = new OpenAIAdapter();
    ProviderRegistry.register(openAIAdapter);
    output.appendLine('[TinglyBox] Registered OpenAI provider');

    // Create configuration manager
    const config = new ConfigManager(context.secrets);

    // Inject config manager into providers that need it
    openAIAdapter.setConfigManager(config);

    // Create settings manager
    const settings = new SettingsManager(config, output);

    // Create main provider
    const provider = new TinglyBoxProvider(config, output);

    // Register the language model provider with VSCode
    const providerRegistration = vscode.lm.registerLanguageModelChatProvider(
      'tingly-box',
      provider
    );
    context.subscriptions.push(providerRegistration);
    output.appendLine('[TinglyBox] Registered LanguageModelChatProvider with VSCode');

    // Register management command
    const manageCommand = vscode.commands.registerCommand(
      'tinglybox.manage',
      () => settings.openSettingsUI()
    );
    context.subscriptions.push(manageCommand);
    output.appendLine('[TinglyBox] Registered management command');

    // Register status command
    const statusCommand = vscode.commands.registerCommand(
      'tinglybox.status',
      () => settings.showStatus()
    );
    context.subscriptions.push(statusCommand);
    output.appendLine('[TinglyBox] Registered status command');

    // Show welcome message on first activation
    const hasShownWelcome = context.globalState.get<boolean>('hasShownWelcome');
    if (!hasShownWelcome) {
      vscode.window
        .showInformationMessage(
          'Tingly Box is now active! Configure your API keys to get started.',
          'Open Settings'
        )
        .then((selection) => {
          if (selection === 'Open Settings') {
            vscode.commands.executeCommand('tinglybox.manage');
          }
        });
      context.globalState.update('hasShownWelcome', true);
    }

    output.appendLine('[TinglyBox] Activation complete');
  } catch (error) {
    output.appendLine(`[TinglyBox] Activation error: ${error}`);
    vscode.window.showErrorMessage(
      `Failed to activate Tingly Box: ${error instanceof Error ? error.message : String(error)}`
    );
  }
}

/**
 * Extension deactivation function
 * Called when VSCode deactivates the extension
 */
export function deactivate() {
  console.log('[TinglyBox] Extension is being deactivated');
  // Cleanup is handled automatically via context.subscriptions
}
