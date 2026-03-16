// VSCode Extension API
import { ChildProcess, spawn, exec } from 'child_process';
import * as vscode from 'vscode';

// Extension components
import { ConfigManager } from './config/ConfigManager.js';
import { ConfigWebviewProvider } from './config/ConfigWebviewProvider.js';
import { SettingsManager } from './config/SettingsManager.js';
import { StatusBarManager } from './config/StatusBarManager.js';
import { ProviderRegistry } from './provider/ProviderRegistry.js';
import { TinglyBoxProvider } from './provider/TinglyBoxProvider.js';
import { UnifiedAdapter } from './provider/adapters/UnifiedAdapter.js';
import { ErrorHandler } from './utils/ErrorHandler.js';
import { NoticeHelper } from './utils/NoticeHelper.js';

/**
 * Extension activation function
 * Called when VSCode activates the extension
 */
export function activate(context: vscode.ExtensionContext) {
    console.log('[Tingly Box] Extension is being activated...');

    // Create output channel for logging
    const output = vscode.window.createOutputChannel('Tingly Box');
    context.subscriptions.push(output);
    output.appendLine('[Tingly Box] Extension activated');

    // Track server process for cleanup
    let serverProcess: ChildProcess | null = null;

    try {
        // Initialize and register unified adapter
        const unifiedAdapter = new UnifiedAdapter();
        ProviderRegistry.register(unifiedAdapter);
        output.appendLine('[Tingly Box] Registered unified provider adapter');

        // Create configuration manager
        const config = new ConfigManager(context.secrets, output);

        // Create main provider
        const provider = new TinglyBoxProvider(config, output);

        // Listen for configuration changes to refresh models
        config.on(ConfigManager.CONFIG_CHANGED, async () => {
            output.appendLine('[Tingly Box] Configuration changed, clearing model cache...');
            provider.clearModelCache();

            // Clear adapter's model cache
            if (typeof (unifiedAdapter as any).clearModelCache === 'function') {
                (unifiedAdapter as any).clearModelCache();
            }

            // Update status bar
            await statusBar.update();
        });

        // Inject config manager into adapter
        unifiedAdapter.setConfigManager(config);
        unifiedAdapter.setOutputChannel(output);

        // Create settings manager
        const settings = new SettingsManager(config, output);

        // Create webview provider
        const webviewProvider = new ConfigWebviewProvider(config, output, context.extensionUri);

        // Create status bar manager
        const statusBar = new StatusBarManager(config, output);
        context.subscriptions.push(statusBar);
        output.appendLine('[Tingly Box] Registered status bar manager');

        // Register the language model provider with VSCode
        const providerRegistration = vscode.lm.registerLanguageModelChatProvider(
            'tinglybox-vscode',
            provider
        );
        context.subscriptions.push(providerRegistration);
        output.appendLine('[Tingly Box] Registered LanguageModelChatProvider with VSCode');

        // Register management command
        const manageCommand = vscode.commands.registerCommand(
            'tinglybox.manage',
            () => settings.openSettingsUI()
        );
        context.subscriptions.push(manageCommand);
        output.appendLine('[Tingly Box] Registered management command');

        // Register status command
        const statusCommand = vscode.commands.registerCommand(
            'tinglybox.status',
            () => settings.showStatus()
        );
        context.subscriptions.push(statusCommand);
        output.appendLine('[Tingly Box] Registered status command');

        // Register fetch models command
        const fetchModelsCommand = vscode.commands.registerCommand(
            'tinglybox.fetchModels',
            async () => {
                try {
                    output.appendLine('[Tingly Box] Fetching models from API...');
                    output.show(true);

                    // Clear cache to force fresh fetch
                    unifiedAdapter.clearModelCache();

                    // Fetch models
                    const models = await unifiedAdapter.getModels();

                    output.appendLine(`[Tingly Box] Successfully fetched ${models.length} models:`);
                    for (const model of models) {
                        output.appendLine(`  - ${model.name} (${model.family}, ${model.version})`);
                        output.appendLine(`    ID: ${model.id}`);
                        output.appendLine(`    Input: ${model.maxInputTokens}, Output: ${model.maxOutputTokens} tokens`);
                        output.appendLine(`    Capabilities: ${model.capabilities.imageInput ? 'Vision ' : ''}${model.capabilities.toolCalling ? 'Tools' : ''}`);
                    }

                    // Prompt user to reload window to refresh VSCode's model list
                    await NoticeHelper.promptReload(`Successfully fetched ${models.length} models.`);
                } catch (error) {
                    output.appendLine(`[Tingly Box] Error fetching models: ${error}`);
                    ErrorHandler.handle(error, output);
                }
            }
        );
        context.subscriptions.push(fetchModelsCommand);
        output.appendLine('[Tingly Box] Registered fetch models command');

        // Register manage language models command
        const manageLanguageModelsCommand = vscode.commands.registerCommand(
            'tinglybox.manageLanguageModels',
            async () => {
                output.appendLine('[Tingly Box] Opening VSCode language model management...');
                try {
                    await vscode.commands.executeCommand('workbench.action.chat.manage');
                } catch (error) {
                    output.appendLine(`[Tingly Box] Error opening language model management: ${error}`);
                    vscode.window.showWarningMessage(
                        'Unable to open Language Model management. This feature may not be available in your VSCode version.'
                    );
                }
            }
        );
        context.subscriptions.push(manageLanguageModelsCommand);
        output.appendLine('[Tingly Box] Registered manage language models command');

        // Register reset configuration command
        const resetConfigCommand = vscode.commands.registerCommand(
            'tinglybox.resetConfig',
            async () => {
                await settings.resetAllConfiguration();
            }
        );
        context.subscriptions.push(resetConfigCommand);
        output.appendLine('[Tingly Box] Registered reset configuration command');

        // Register open configuration webview command
        const openWebviewCommand = vscode.commands.registerCommand(
            'tinglybox.openConfigWebview',
            async () => {
                await webviewProvider.show();
            }
        );
        context.subscriptions.push(openWebviewCommand);
        output.appendLine('[Tingly Box] Registered configuration webview command');

        // Register start server command
        const startServerCommand = vscode.commands.registerCommand(
            'tinglybox.startServer',
            async () => {
                try {
                    output.appendLine('[Tingly Box] Starting tingly-box server...');
                    output.show(true);

                    // Start the server process using npx
                    serverProcess = spawn('npx', ['tingly-box@latest'], {
                        stdio: 'pipe',
                        shell: true
                    });

                    // Handle server output
                    if (serverProcess.stdout) {
                        serverProcess.stdout.on('data', (data) => {
                            const message = data.toString();
                            output.append(message);
                        });
                    }

                    if (serverProcess.stderr) {
                        serverProcess.stderr.on('data', (data) => {
                            const message = data.toString();
                            output.append(`[Server Error] ${message}`);
                        });
                    }

                    // Handle server exit
                    serverProcess.on('close', (code) => {
                        if (code !== 0) {
                            output.appendLine(`[Tingly Box] Server process exited with code ${code}`);
                            vscode.window.showErrorMessage(`Tingly Box server exited with code ${code}`);
                        } else {
                            output.appendLine('[Tingly Box] Server process exited normally');
                        }
                        serverProcess = null;
                    });

                    serverProcess.on('error', (error) => {
                        output.appendLine(`[Tingly Box] Server error: ${error.message}`);
                        vscode.window.showErrorMessage(`Failed to start Tingly Box server: ${error.message}`);
                        serverProcess = null;
                    });

                    vscode.window.showInformationMessage('Tingly Box server started successfully!');
                } catch (error) {
                    output.appendLine(`[Tingly Box] Failed to start server: ${error}`);
                    vscode.window.showErrorMessage(
                        `Failed to start Tingly Box server: ${error instanceof Error ? error.message : String(error)}`
                    );
                }
            }
        );
        context.subscriptions.push(startServerCommand);
        output.appendLine('[Tingly Box] Registered start server command');

        // Register stop server command
        const stopServerCommand = vscode.commands.registerCommand(
            'tinglybox.stopServer',
            async () => {
                try {
                    output.appendLine('[Tingly Box] Stopping tingly-box server...');
                    output.show(true);

                    // Execute npx tingly-box@latest stop
                    exec('npx tingly-box@latest stop', { encoding: 'utf-8' }, (error: unknown, stdout: string, stderr: string) => {
                        if (error) {
                            output.appendLine(`[Tingly Box] Stop command error: ${error instanceof Error ? error.message : String(error)}`);
                            vscode.window.showErrorMessage(`Failed to stop Tingly Box server: ${error instanceof Error ? error.message : String(error)}`);
                        } else {
                            output.appendLine('[Tingly Box] Server stopped successfully');
                            vscode.window.showInformationMessage('Tingly Box server stopped successfully!');
                        }

                        if (stdout) {
                            output.append(`[Server] ${stdout}`);
                        }
                        if (stderr) {
                            output.append(`[Server Error] ${stderr}`);
                        }
                    });
                } catch (error) {
                    output.appendLine(`[Tingly Box] Failed to stop server: ${error}`);
                    vscode.window.showErrorMessage(
                        `Failed to stop Tingly Box server: ${error instanceof Error ? error.message : String(error)}`
                    );
                }
            }
        );
        context.subscriptions.push(stopServerCommand);
        output.appendLine('[Tingly Box] Registered stop server command');

        // Register open web UI command
        const openWebUICommand = vscode.commands.registerCommand(
            'tinglybox.openWebUI',
            async () => {
                try {
                    output.appendLine('[Tingly Box] Opening Tingly Box web UI...');
                    output.show(true);

                    // Execute npx tingly-box open
                    exec('npx tingly-box open', { encoding: 'utf-8' }, (error: unknown, stdout: string, stderr: string) => {
                        if (error) {
                            const errorMsg = error instanceof Error ? error.message : String(error);
                            output.appendLine(`[Tingly Box] Open web UI error: ${errorMsg}`);
                            vscode.window.showErrorMessage(`Failed to open Tingly Box web UI: ${errorMsg}`);
                        } else {
                            output.appendLine('[Tingly Box] Web UI opened successfully');
                        }

                        if (stdout) {
                            output.append(`[Server] ${stdout}`);
                        }
                        if (stderr) {
                            output.append(`[Server Error] ${stderr}`);
                        }
                    });
                } catch (error) {
                    output.appendLine(`[Tingly Box] Failed to open web UI: ${error}`);
                    vscode.window.showErrorMessage(
                        `Failed to open Tingly Box web UI: ${error instanceof Error ? error.message : String(error)}`
                    );
                }
            }
        );
        context.subscriptions.push(openWebUICommand);
        output.appendLine('[Tingly Box] Registered open web UI command');

        // Auto-fetch models on activation ONLY if already configured
        (async () => {
            try {
                // Check if provider is configured BEFORE attempting to fetch
                const hasConfig = await config.hasConfiguredProvider('default');
                if (!hasConfig) {
                    output.appendLine('[Tingly Box] Not configured. Run "Tingly Box: Manage Settings" to configure.');
                } else {
                    // Clear cache to force fresh fetch
                    unifiedAdapter.clearModelCache();

                    try {
                        output.appendLine('[Tingly Box] Fetching models...');
                        const models = await unifiedAdapter.getModels();
                        output.appendLine(`[Tingly Box] Loaded ${models.length} models`);
                        for (const model of models) {
                            output.appendLine(`  - ${model.name}`);
                        }
                    } catch (error) {
                        output.appendLine(`[Tingly Box] Could not fetch models: ${error}`);
                    }
                }

                // Initialize and update status bar after configuration is confirmed
                await statusBar.initialize();
            } catch (error) {
                output.appendLine(`[Tingly Box] Could not fetch models: ${error}`);
            }
        })();

        // Show welcome message on first activation
        const hasShownWelcome = context.globalState.get<boolean>('hasShownWelcome');
        if (!hasShownWelcome) {
            vscode.window
                .showInformationMessage(
                    'Tingly Box For VS Code is now active! Please configure your Base URL and Token to get started.',
                    'Configure'
                )
                .then((selection) => {
                    if (selection === 'Configure') {
                        vscode.commands.executeCommand('tinglybox.openConfigWebview');
                    }
                });
            context.globalState.update('hasShownWelcome', true);
        }

        output.appendLine('[Tingly Box] Activation complete');
    } catch (error) {
        output.appendLine(`[Tingly Box] Activation error: ${error}`);
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
    console.log('[Tingly Box] Extension is being deactivated');
    // Cleanup is handled automatically via context.subscriptions
}
