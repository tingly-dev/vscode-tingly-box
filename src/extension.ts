// VSCode Extension API
import * as vscode from 'vscode';

// Extension components
import { TinglyBoxProvider } from './provider/TinglyBoxProvider.js';
import { ConfigManager } from './config/ConfigManager.js';
import { SettingsManager } from './config/SettingsManager.js';
import { StatusBarManager } from './config/StatusBarManager.js';
import { ProviderRegistry } from './provider/ProviderRegistry.js';
import { OpenAIAdapter } from './provider/adapters/OpenAIAdapter.js';
import { AnthropicAdapter } from './provider/adapters/AnthropicAdapter.js';
import { ErrorHandler } from './utils/ErrorHandler.js';

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
    output.appendLine('[TinglyBox] Registered OpenAI-compatible provider');

    const anthropicAdapter = new AnthropicAdapter();
    ProviderRegistry.register(anthropicAdapter);
    output.appendLine('[TinglyBox] Registered Anthropic-compatible provider');

    // Create configuration manager
    const config = new ConfigManager(context.secrets, output);

    // Create main provider
    const provider = new TinglyBoxProvider(config, output);

    // Listen for configuration changes to refresh models
    config.on(ConfigManager.CONFIG_CHANGED, async () => {
      output.appendLine('[TinglyBox] Configuration changed, clearing model cache...');
      provider.clearModelCache();

      // Clear all adapters' model cache
      for (const adapter of ProviderRegistry.list()) {
        if (typeof (adapter as any).clearModelCache === 'function') {
          (adapter as any).clearModelCache();
        }
      }

      // Update status bar
      await statusBar.update();
    });

    // Inject config manager into providers that need it
    openAIAdapter.setConfigManager(config);
    openAIAdapter.setOutputChannel(output);

    anthropicAdapter.setConfigManager(config);
    anthropicAdapter.setOutputChannel(output);

    // Create settings manager
    const settings = new SettingsManager(config, output);

    // Create status bar manager
    const statusBar = new StatusBarManager(config, output);
    context.subscriptions.push(statusBar);
    output.appendLine('[TinglyBox] Registered status bar manager');

    // Register the language model provider with VSCode
    const providerRegistration = vscode.lm.registerLanguageModelChatProvider(
      'tinglybox-vscode',
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

    // Register fetch models command
    const fetchModelsCommand = vscode.commands.registerCommand(
      'tinglybox.fetchModels',
      async () => {
        try {
          output.appendLine('[TinglyBox] Fetching models from API...');
          output.show(true);

          for (const adapter of ProviderRegistry.list()) {
            try {
              output.appendLine(`[TinglyBox] Fetching from ${adapter.id}...`);

              // Check if adapter has fetchModels method
              if (typeof (adapter as any).fetchModels !== 'function') {
                output.appendLine(`[TinglyBox] ${adapter.id} does not support fetching models`);
                continue;
              }

              // Clear cache to force fresh fetch
              (adapter as any).clearModelCache();

              // Fetch models
              const models = await (adapter as any).fetchModels();

              output.appendLine(`[TinglyBox] Successfully fetched ${models.length} models from ${adapter.id}:`);
              for (const model of models) {
                output.appendLine(`  - ${model.name} (${model.family}, ${model.version})`);
                output.appendLine(`    ID: ${model.id}`);
                output.appendLine(`    Input: ${model.maxInputTokens}, Output: ${model.maxOutputTokens} tokens`);
                output.appendLine(`    Capabilities: ${model.capabilities.imageInput ? 'Vision ' : ''}${model.capabilities.toolCalling ? 'Tools' : ''}`);
              }
            } catch (error) {
              output.appendLine(`[TinglyBox] Error fetching from ${adapter.id}: ${error}`);
            }
          }

          vscode.window.showInformationMessage(
            'Successfully fetched models from all providers. Check output for details.'
          );
        } catch (error) {
          output.appendLine(`[TinglyBox] Error fetching models: ${error}`);
          ErrorHandler.handle(error, output);
        }
      }
    );
    context.subscriptions.push(fetchModelsCommand);
    output.appendLine('[TinglyBox] Registered fetch models command');

    // Register toggle API style command
    const toggleStyleCommand = vscode.commands.registerCommand(
      'tinglybox.toggleStyle',
      async () => {
        await statusBar.toggleStyle();
      }
    );
    context.subscriptions.push(toggleStyleCommand);
    output.appendLine('[TinglyBox] Registered toggle style command');

    // Auto-fetch models on activation ONLY if already configured
    (async () => {
      try {
        for (const adapter of ProviderRegistry.list()) {
          if (typeof (adapter as any).fetchModels !== 'function') {
            continue;
          }

          // Check if provider is configured BEFORE attempting to fetch
          const hasConfig = await config.hasConfiguredProvider(adapter.id);
          if (!hasConfig) {
            output.appendLine(`[TinglyBox] ${adapter.id} not configured. Run "Tingly Box VSCode: Manage Settings" to configure.`);
            continue;
          }

          try {
            output.appendLine(`[TinglyBox] Fetching models from ${adapter.id}...`);
            const models = await (adapter as any).fetchModels();
            output.appendLine(`[TinglyBox] Loaded ${models.length} models from ${adapter.id}:`);
            for (const model of models) {
              output.appendLine(`  - ${model.name}`);
            }
          } catch (error) {
            output.appendLine(`[TinglyBox] Could not fetch models from ${adapter.id}: ${error}`);
          }
        }

        // Initialize and update status bar after configuration is confirmed
        await statusBar.initialize();
      } catch (error) {
        output.appendLine(`[TinglyBox] Could not fetch models: ${error}`);
      }
    })();

    // Show welcome message on first activation
    const hasShownWelcome = context.globalState.get<boolean>('hasShownWelcome');
    if (!hasShownWelcome) {
      vscode.window
        .showInformationMessage(
          'Tingly Box VSCode is now active! Please configure your Base URL and Token to get started.',
          'Configure'
        )
        .then((selection) => {
          if (selection === 'Configure') {
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
