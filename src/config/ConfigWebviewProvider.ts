/**
 * Configuration Webview Provider
 * Provides a webview-based UI for configuring Tingly Box
 */

import * as vscode from 'vscode';
import { ConfigManager } from './ConfigManager.js';
import type { APIStyle } from '../types/index.js';

/**
 * Webview message types
 */
export interface WebviewMessage {
  type: 'save' | 'test' | 'clear';
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

export class ConfigWebviewProvider {
  private currentPanel?: vscode.WebviewPanel;
  private disposables: vscode.Disposable[] = [];

  constructor(
    private readonly config: ConfigManager,
    private readonly outputChannel: vscode.OutputChannel,
    private readonly extensionUri: vscode.Uri
  ) {}

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
    return `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Tingly Box For VS Code</title>
  <style>
    * {
      box-sizing: border-box;
      margin: 0;
      padding: 0;
    }

    body {
      font-family: var(--vscode-font-family);
      font-size: var(--vscode-font-size);
      color: var(--vscode-foreground);
      background: var(--vscode-editor-background);
      padding: 20px;
      line-height: 1.6;
    }

    .container {
      max-width: 800px;
      margin: 0 auto;
    }

    h1 {
      font-size: 24px;
      margin-bottom: 20px;
      color: var(--vscode-foreground);
    }

    h2 {
      font-size: 18px;
      margin-top: 24px;
      margin-bottom: 12px;
      color: var(--vscode-foreground);
    }

    .section {
      background: var(--vscode-editor-background);
      border: 1px solid var(--vscode-panel-border);
      border-radius: 4px;
      padding: 16px;
      margin-bottom: 16px;
    }

    .form-group {
      margin-bottom: 16px;
    }

    label {
      display: block;
      margin-bottom: 6px;
      font-weight: 500;
      color: var(--vscode-foreground);
    }

    input[type="text"],
    input[type="password"],
    select {
      width: 100%;
      padding: 8px 12px;
      background: var(--vscode-input-background);
      border: 1px solid var(--vscode-input-border);
      border-radius: 2px;
      color: var(--vscode-input-foreground);
      font-size: var(--vscode-font-size);
    }

    input:focus,
    select:focus {
      outline: 1px solid var(--vscode-focusBorder);
    }

    .button-group {
      display: flex;
      gap: 12px;
      margin-top: 20px;
    }

    button {
      padding: 8px 16px;
      background: var(--vscode-button-background);
      color: var(--vscode-button-foreground);
      border: none;
      border-radius: 2px;
      cursor: pointer;
      font-size: var(--vscode-font-size);
    }

    button:hover {
      background: var(--vscode-button-hoverBackground);
    }

    button.secondary {
      background: var(--vscode-button-secondaryBackground);
      color: var(--vscode-button-secondaryForeground);
    }

    button.secondary:hover {
      background: var(--vscode-button-secondaryHoverBackground);
    }

    button:disabled {
      opacity: 0.5;
      cursor: not-allowed;
    }

    .status {
      padding: 12px;
      border-radius: 4px;
      margin-bottom: 16px;
    }

    .status.success {
      background: var(--vscode-diffEditor-insertedTextBackground);
      color: var(--vscode-testingIconPassedForeground);
    }

    .status.error {
      background: var(--vscode-errorBackground);
      color: var(--vscode-errorForeground);
    }

    .status.info {
      background: var(--vscode-infoBackground);
      color: var(--vscode-infoForeground);
    }

    .status.hidden {
      display: none;
    }

    .radio-group {
      display: flex;
      gap: 16px;
    }

    .radio-option {
      display: flex;
      align-items: center;
      gap: 8px;
    }

    .radio-option input[type="radio"] {
      margin: 0;
    }

    .guide {
      background: var(--vscode-textBlockQuote-background);
      border-left: 4px solid var(--vscode-textBlockQuote-border);
      padding: 12px 16px;
      margin-bottom: 16px;
    }

    .guide h3 {
      margin-bottom: 8px;
      color: var(--vscode-foreground);
    }

    .guide ol {
      margin-left: 20px;
    }

    .guide li {
      margin-bottom: 8px;
    }

    .guide code {
      background: var(--vscode-textCodeBlock-background);
      padding: 2px 6px;
      border-radius: 2px;
      font-family: var(--vscode-editor-font-family);
    }

    /* Tab Navigation */
    .tabs {
      display: flex;
      border-bottom: 1px solid var(--vscode-panel-border);
      margin-bottom: 20px;
    }

    .tab {
      padding: 10px 20px;
      cursor: pointer;
      border: none;
      background: transparent;
      color: var(--vscode-foreground);
      font-size: var(--vscode-font-size);
      border-bottom: 2px solid transparent;
      transition: all 0.2s;
    }

    .tab:hover {
      background: var(--vscode-toolbar-hoverBackground);
    }

    .tab.active {
      border-bottom-color: var(--vscode-textLink-foreground);
      color: var(--vscode-textLink-foreground);
      font-weight: 500;
    }

    .tab-content {
      display: none;
    }

    .tab-content.active {
      display: block;
    }

    .warning-box {
      background: var(--vscode-editorWarning-background);
      border-left: 4px solid var(--vscode-editorWarning-foreground);
      padding: 12px 16px;
      margin-bottom: 16px;
    }

    .warning-box h3 {
      margin-bottom: 8px;
      color: var(--vscode-editorWarning-foreground);
    }

    .warning-box ul {
      margin-left: 20px;
    }

    .warning-box li {
      margin-bottom: 6px;
    }
  </style>
</head>
<body>
  <div class="container">
    <h1>🎯 Tingly Box Configuration</h1>

    <!-- Status Message -->
    <div id="status" class="status hidden"></div>

    <!-- Tab Navigation -->
    <div class="tabs">
      <button class="tab active" data-tab="with-tb">Using with Tingly Box</button>
      <button class="tab" data-tab="custom">Custom Provider</button>
    </div>

    <!-- Tab: Using with Tingly Box -->
    <div id="tab-with-tb" class="tab-content active">
      <div class="section">
        <h2>📖 Setup Guide</h2>
        <div class="guide">
          <h3>Quick Start</h3>
          <ol>
            <li>Install and start <a href="https://github.com/tingly-dev/tingly-box" target="_blank">Tingly Box</a>: <code>npx tingly-box@latest</code></li>
            <li>Enter your Tingly Box Base URL below (default: <code>http://localhost:12580/tingly/openai</code>)</li>
            <li>Enter your API Token if required (optional for some setups)</li>
            <li>Select your API Style (OpenAI or Anthropic)</li>
            <li>Click "Save Configuration"</li>
          </ol>
        </div>
        <p><strong>Need help?</strong> Visit <a href="https://github.com/tingly-dev/vscode-tingly-box" target="_blank">vscode-tingly-box</a> or <a href="https://github.com/tingly-dev/tingly-box" target="_blank">tingly-box</a></p>
      </div>
    </div>

    <!-- Tab: Custom Provider -->
    <div id="tab-custom" class="tab-content">
      <div class="warning-box">
        <h3>⚠️ Recommendation: Use Tingly Box</h3>
        <p>While you can use custom providers, we strongly recommend using <a href="https://github.com/tingly-dev/tingly-box" target="_blank">Tingly Box</a> for the best experience.</p>
        <ul>
          <li><strong>Provider Compatibility:</strong> Some providers may not follow standard API formats</li>
          <li><strong>Model List API:</strong> Not all providers expose a models endpoint</li>
          <li><strong>Frequent Switching:</strong> You may need to switch providers often</li>
          <li><strong>Authentication:</strong> Different auth methods can cause issues</li>
          <li><strong>Rate Limiting:</strong> Provider-specific limits may affect usage</li>
        </ul>
        <p><strong>Tingly Box</strong> handles all these complexities for you with a unified interface.</p>
      </div>

      <div class="section">
        <h2>🔧 Custom Provider Configuration</h2>
        <div class="guide">
          <h3>Setup Instructions</h3>
          <ol>
            <li>Enter your provider's Base URL below</li>
            <li>Enter your API Token if required</li>
            <li>Select the appropriate API Style for your provider</li>
            <li>Click "Test Connection" to verify</li>
            <li>Click "Save Configuration" when done</li>
          </ol>
        </div>
        <p><strong>Note:</strong> Make sure your provider supports the <code>/models</code> endpoint for automatic model discovery.</p>
      </div>
    </div>

    <!-- Configuration Form (shared) -->
    <div class="section">
      <h2>⚙️ Configuration</h2>
      <form id="configForm">
        <div class="form-group">
          <label for="baseUrl">Base URL *</label>
          <input
            type="text"
            id="baseUrl"
            placeholder="http://localhost:12580/tingly/openai"
            required
          />
        </div>

        <div class="form-group">
          <label for="token">API Token (Optional)</label>
          <input
            type="password"
            id="token"
            placeholder="sk-... or Bearer token (leave empty if not required)"
          />
        </div>

        <div class="form-group">
          <label>API Style *</label>
          <p style="color: var(--vscode-descriptionForeground); font-size: 0.9em; margin-bottom: 8px;">
            Note: If using Tingly Box, either style works fine.
          </p>
          <div class="radio-group">
            <div class="radio-option">
              <input type="radio" id="styleOpenAI" name="apiStyle" value="openai" checked>
              <label for="styleOpenAI">OpenAI Style</label>
            </div>
            <div class="radio-option">
              <input type="radio" id="styleAnthropic" name="apiStyle" value="anthropic">
              <label for="styleAnthropic">Anthropic Style</label>
            </div>
          </div>
        </div>

        <!-- Current Status (inside form) -->
        <div class="section" style="margin-top: 20px;">
          <h2>📊 Current Status</h2>
          <div id="currentStatus">
            <p><em>Waiting for connection...</em></p>
          </div>
        </div>

        <div class="button-group">
          <button type="submit" id="saveBtn">💾 Save Configuration</button>
          <button type="button" id="testBtn" class="secondary">🔍 Test Connection</button>
          <button type="button" id="clearBtn" class="secondary">🗑️ Clear Configuration</button>
        </div>
      </form>
    </div>
  </div>

  <script>
    const vscode = acquireVsCodeApi();

    // UI Elements
    const statusEl = document.getElementById('status');
    const form = document.getElementById('configForm');
    const baseUrlInput = document.getElementById('baseUrl');
    const tokenInput = document.getElementById('token');
    const saveBtn = document.getElementById('saveBtn');
    const testBtn = document.getElementById('testBtn');
    const clearBtn = document.getElementById('clearBtn');
    const currentStatusEl = document.getElementById('currentStatus');

    // Tab Navigation
    const tabs = document.querySelectorAll('.tab');
    const tabContents = document.querySelectorAll('.tab-content');

    tabs.forEach(tab => {
      tab.addEventListener('click', () => {
        const targetTab = tab.getAttribute('data-tab');

        // Remove active class from all tabs and contents
        tabs.forEach(t => t.classList.remove('active'));
        tabContents.forEach(c => c.classList.remove('active'));

        // Add active class to clicked tab and corresponding content
        tab.classList.add('active');
        document.getElementById('tab-' + targetTab).classList.add('active');
      });
    });

    // Show status message
    function showStatus(message, type = 'info') {
      statusEl.textContent = message;
      statusEl.className = 'status ' + type;
      statusEl.classList.remove('hidden');

      setTimeout(() => {
        statusEl.classList.add('hidden');
      }, 5000);
    }

    // Send message to extension
    function sendMessage(type, data) {
      vscode.postMessage({ type, ...data });
    }

    // Handle form submission
    form.addEventListener('submit', (e) => {
      e.preventDefault();
      const apiStyle = document.querySelector('input[name="apiStyle"]:checked').value;

      sendMessage('save', {
        baseUrl: baseUrlInput.value,
        token: tokenInput.value,
        apiStyle: apiStyle
      });
    });

    // Test connection
    testBtn.addEventListener('click', () => {
      sendMessage('test', {
        baseUrl: baseUrlInput.value,
        token: tokenInput.value
      });
    });

    // Clear configuration
    clearBtn.addEventListener('click', () => {
      if (confirm('Are you sure you want to clear the configuration?')) {
        sendMessage('clear');
      }
    });

    // Receive messages from extension
    window.addEventListener('message', (event) => {
      const message = event.data;

      switch (message.type) {
        case 'config':
          // Update form with current config
          if (message.config) {
            baseUrlInput.value = message.config.baseUrl || '';
            tokenInput.value = message.config.token || '';
            const radio = document.querySelector(\`input[name="apiStyle"][value="\${message.config.apiStyle}"]\`);
            if (radio) radio.checked = true;
          } else {
            // Set default values for new users
            baseUrlInput.value = 'http://localhost:12580/tingly/openai';
          }
          break;

        case 'status':
          // Update current status display
          currentStatusEl.innerHTML = message.html;
          break;

        case 'saved':
          showStatus('✅ Configuration saved successfully!', 'success');
          break;

        case 'error':
          showStatus('❌ ' + message.message, 'error');
          break;

        case 'testResult':
          // Clear previous content
          currentStatusEl.innerHTML = '';

          const p = document.createElement('p');
          if (message.success) {
            p.style.color = 'var(--vscode-testingIconPassedForeground)';
            p.textContent = '✅ Connection successful! Found ' + message.modelCount + ' models.';
          } else {
            p.style.color = 'var(--vscode-errorForeground)';
            p.textContent = '❌ Connection failed: ' + message.error;
          }
          currentStatusEl.appendChild(p);
          break;
      }
    });
  </script>
</body>
</html>`;
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
      await this.config.removeProviderConfig('default');
      this.sendMessage('cleared');
      await this.sendCurrentConfig();
      await this.sendStatus();
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
