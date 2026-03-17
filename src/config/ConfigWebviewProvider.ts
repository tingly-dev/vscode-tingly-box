/**
 * Configuration Webview Provider
 * Provides a webview-based UI for configuring Tingly Box
 */

import * as vscode from 'vscode';
import * as fs from 'fs';
import * as path from 'path';
import type { APIStyle } from '../types/index.js';
import { NoticeHelper } from '../utils/NoticeHelper.js';
import { ConfigManager } from './ConfigManager.js';

/**
 * Webview message types
 */
export interface WebviewMessage {
    type: 'save' | 'test' | 'clear' | 'fetchModels' | 'startServer' | 'stopServer' | 'openWebUI';
    baseUrl?: string;
    token?: string;
    apiStyle?: APIStyle;
}

/**
 * Save message from webview
 */
export interface SaveMessage extends WebviewMessage {
    type: 'save';
    baseUrl: string;
    token: string;
    apiStyle: APIStyle;
}

/**
 * Test message from webview
 */
export interface TestMessage extends WebviewMessage {
    type: 'test';
    baseUrl: string;
    token: string;
}

/**
 * Clear message from webview
 */
export interface ClearMessage extends WebviewMessage {
    type: 'clear';
}

/**
 * FetchModels message from webview
 */
export interface FetchModelsMessage extends WebviewMessage {
    type: 'fetchModels';
}

/**
 * StartServer message from webview
 */
export interface StartServerMessage extends WebviewMessage {
    type: 'startServer';
}

/**
 * StopServer message from webview
 */
export interface StopServerMessage extends WebviewMessage {
    type: 'stopServer';
}

/**
 * Type guard for SaveMessage
 */
function isSaveMessage(msg: WebviewMessage): msg is SaveMessage {
    return msg.type === 'save' &&
        typeof msg.baseUrl === 'string' &&
        typeof msg.token === 'string' &&
        (msg.apiStyle === 'anthropic' || msg.apiStyle === 'openai');
}

/**
 * Type guard for TestMessage
 */
function isTestMessage(msg: WebviewMessage): msg is TestMessage {
    return msg.type === 'test' &&
        typeof msg.baseUrl === 'string' &&
        typeof msg.token === 'string';
}

/**
 * Type guard for ClearMessage
 */
function isClearMessage(msg: WebviewMessage): msg is ClearMessage {
    return msg.type === 'clear';
}

/**
 * Type guard for FetchModelsMessage
 */
function isFetchModelsMessage(msg: WebviewMessage): msg is FetchModelsMessage {
    return msg.type === 'fetchModels';
}

/**
 * Type guard for StartServerMessage
 */
function isStartServerMessage(msg: WebviewMessage): msg is StartServerMessage {
    return msg.type === 'startServer';
}

/**
 * Type guard for StopServerMessage
 */
function isStopServerMessage(msg: WebviewMessage): msg is StopServerMessage {
    return msg.type === 'stopServer';
}

/**
 * OpenWebUI message from webview
 */
export interface OpenWebUIMessage extends WebviewMessage {
    type: 'openWebUI';
}

/**
 * Type guard for OpenWebUIMessage
 */
function isOpenWebUIMessage(msg: WebviewMessage): msg is OpenWebUIMessage {
    return msg.type === 'openWebUI';
}

export class ConfigWebviewProvider {
    private currentPanel?: vscode.WebviewPanel;
    private disposables: vscode.Disposable[] = [];

    constructor(
        private readonly config: ConfigManager,
        private readonly outputChannel: vscode.OutputChannel,
        private readonly extensionUri: vscode.Uri
    ) { }

    /**
     * Show or create the configuration webview
     */
    async show(): Promise<void> {
        if (this.currentPanel) {
            this.currentPanel.reveal();
            return;
        }

        this.currentPanel = vscode.window.createWebviewPanel(
            'tinglybox.config',
            'Tingly Box Configuration',
            vscode.ViewColumn.One,
            {
                enableScripts: true,
                localResourceRoots: [vscode.Uri.joinPath(this.extensionUri, 'dist')]
            }
        );

        this.currentPanel.webview.html = this.getWebviewContent();

        // Handle messages from the webview
        this.currentPanel.webview.onDidReceiveMessage(
            async (message) => {
                await this.handleMessage(message);
            },
            undefined,
            this.disposables
        );

        // Handle panel close
        this.currentPanel.onDidDispose(
            () => {
                this.currentPanel = undefined;
                this.disposables.forEach(d => d.dispose());
                this.disposables = [];
            },
            undefined,
            this.disposables
        );

        // Send current config to webview
        await this.sendCurrentConfig();
    }

    /**
     * Get the webview HTML content
     */
    private getWebviewContent(): string {
        const htmlPath = vscode.Uri.joinPath(this.extensionUri, 'media', 'config.html').fsPath;
        try {
            return fs.readFileSync(htmlPath, 'utf-8');
        } catch (error) {
            this.outputChannel.appendLine(`[Webview] Failed to read HTML file: ${error}`);
            return `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <title>Error</title>
</head>
<body>
  <h1>Error loading configuration page</h1>
  <p>Could not load the webview HTML file. Please check the extension installation.</p>
</body>
</html>`;
        }
    }

    /**
     * Handle messages from the webview
     */
    private async handleMessage(message: unknown): Promise<void> {
        // Validate message structure
        if (!message || typeof message !== 'object') {
            this.outputChannel.appendLine(`[Webview] Invalid message received: not an object`);
            this.sendMessage('error', { message: 'Invalid message format' });
            return;
        }

        const msg = message as WebviewMessage;
        this.outputChannel.appendLine(`[Webview] Received message: ${msg.type}`);

        switch (msg.type) {
            case 'save':
                if (isSaveMessage(msg)) {
                    await this.handleSave(msg);
                } else {
                    this.sendMessage('error', { message: 'Invalid save message format' });
                }
                break;

            case 'test':
                if (isTestMessage(msg)) {
                    await this.handleTest(msg);
                } else {
                    this.sendMessage('error', { message: 'Invalid test message format' });
                }
                break;

            case 'clear':
                if (isClearMessage(msg)) {
                    await this.handleClear();
                } else {
                    this.sendMessage('error', { message: 'Invalid clear message format' });
                }
                break;

            case 'fetchModels':
                if (isFetchModelsMessage(msg)) {
                    await this.handleFetchModels();
                } else {
                    this.sendMessage('error', { message: 'Invalid fetchModels message format' });
                }
                break;

            case 'startServer':
                if (isStartServerMessage(msg)) {
                    await this.handleStartServer();
                } else {
                    this.sendMessage('error', { message: 'Invalid startServer message format' });
                }
                break;

            case 'stopServer':
                if (isStopServerMessage(msg)) {
                    await this.handleStopServer();
                } else {
                    this.sendMessage('error', { message: 'Invalid stopServer message format' });
                }
                break;

            case 'openWebUI':
                if (isOpenWebUIMessage(msg)) {
                    await this.handleOpenWebUI();
                } else {
                    this.sendMessage('error', { message: 'Invalid openWebUI message format' });
                }
                break;

            default:
                this.outputChannel.appendLine(`[Webview] Unknown message type: ${msg.type}`);
                this.sendMessage('error', { message: `Unknown message type: ${(msg as { type: string }).type}` });
        }
    }

    /**
     * Handle save configuration
     */
    private async handleSave(message: { baseUrl: string; token: string; apiStyle: APIStyle }): Promise<void> {
        try {
            await this.config.setProviderConfig('default', {
                baseUrl: message.baseUrl.trim(),
                token: message.token.trim(),
                apiStyle: message.apiStyle,
            });

            this.sendMessage('saved');
            await this.sendStatus();

            // Prompt user to reload window to refresh model list
            await NoticeHelper.promptReload('Configuration saved successfully.');
        } catch (error) {
            this.sendMessage('error', {
                message: error instanceof Error ? error.message : String(error)
            });
        }
    }

    /**
     * Handle test connection
     */
    private async handleTest(message: { baseUrl: string; token: string }): Promise<void> {
        try {
            const baseUrl = message.baseUrl.trim();

            // Validate URL format
            if (!baseUrl || baseUrl.length === 0) {
                throw new Error('Base URL cannot be empty');
            }

            let url: URL;
            try {
                url = new URL(baseUrl);
            } catch {
                throw new Error('Invalid URL format');
            }

            if (url.protocol !== 'http:' && url.protocol !== 'https:') {
                throw new Error('URL must use http or https protocol');
            }

            // Temporarily save config for testing
            await this.config.setProviderConfig('default', {
                baseUrl,
                token: message.token.trim(),
                apiStyle: 'openai',
            });

            // Try to fetch models
            const config = await this.config.getProviderConfig('default');
            if (!config) {
                throw new Error('Configuration not found');
            }

            // Test by making a request to the models endpoint
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

            this.sendMessage('testResult', { success: true, modelCount });
        } catch (error) {
            this.sendMessage('testResult', {
                success: false,
                error: error instanceof Error ? error.message : String(error)
            });
        }
    }

    /**
     * Handle clear configuration
     */
    private async handleClear(): Promise<void> {
        try {
            await this.config.clearAllConfig();
            this.sendMessage('cleared');
            await this.sendCurrentConfig();
            await this.sendStatus();

            // Prompt user to reload window to clear VSCode's cached model list
            await NoticeHelper.promptReload('Configuration cleared successfully.');
        } catch (error) {
            this.sendMessage('error', {
                message: error instanceof Error ? error.message : String(error)
            });
        }
    }

    /**
     * Handle fetch models - trigger the fetchModels command
     */
    private async handleFetchModels(): Promise<void> {
        try {
            // Notify webview that fetch is starting
            this.sendMessage('fetchModelsStart');

            // Execute the fetchModels command
            await vscode.commands.executeCommand('tinglybox.fetchModels');

            // Notify webview that fetch is complete
            this.sendMessage('fetchModelsEnd');
        } catch (error) {
            this.sendMessage('fetchModelsEnd');
            this.sendMessage('error', {
                message: error instanceof Error ? error.message : String(error)
            });
        }
    }

    /**
     * Handle start server - trigger the startServer command
     */
    private async handleStartServer(): Promise<void> {
        try {
            // Execute the startServer command
            await vscode.commands.executeCommand('tinglybox.startServer');
        } catch (error) {
            this.sendMessage('error', {
                message: error instanceof Error ? error.message : String(error)
            });
        }
    }

    /**
     * Handle stop server - trigger the stopServer command
     */
    private async handleStopServer(): Promise<void> {
        try {
            // Execute the stopServer command
            await vscode.commands.executeCommand('tinglybox.stopServer');
        } catch (error) {
            this.sendMessage('error', {
                message: error instanceof Error ? error.message : String(error)
            });
        }
    }

    /**
     * Handle open web UI - trigger the openWebUI command
     */
    private async handleOpenWebUI(): Promise<void> {
        try {
            // Execute the openWebUI command
            await vscode.commands.executeCommand('tinglybox.openWebUI');
        } catch (error) {
            this.sendMessage('error', {
                message: error instanceof Error ? error.message : String(error)
            });
        }
    }

    /**
     * Send current configuration to webview
     */
    private async sendCurrentConfig(): Promise<void> {
        const config = await this.config.getProviderConfig('default');
        this.sendMessage('config', { config });
    }

    /**
     * Send status information to webview
     */
    private async sendStatus(): Promise<void> {
        const config = await this.config.getProviderConfig('default');

        let html: string;
        if (config) {
            const url = new URL(config.baseUrl);
            const styleLabel = config.apiStyle === 'anthropic' ? 'Anthropic' : 'OpenAI';
            const tokenStatus = config.token ? '✅ Set' : '⚠️ Not set';

            html = `<p><strong>Base URL:</strong> ${url.hostname}:${url.port || '80'}</p>
        <p><strong>API Style:</strong> ${styleLabel}</p>
        <p><strong>Token:</strong> ${tokenStatus}</p>
        <p><strong>Provider ID:</strong> default</p>`;
        } else {
            html = '<p><strong>⚠️ Status:</strong> Not configured</p>';
        }

        this.sendMessage('status', { html });
    }

    /**
     * Send message to webview
     */
    private sendMessage(type: string, data?: any): void {
        this.currentPanel?.webview.postMessage({ type, ...data });
    }

    /**
     * Dispose of resources
     */
    dispose(): void {
        this.currentPanel?.dispose();
        this.disposables.forEach(d => d.dispose());
    }
}
