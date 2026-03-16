/**
 * Test utilities for VSCode extension testing
 * Provides mocks and helpers for testing extension functionality
 */

import * as vscode from 'vscode';

/**
 * Mock OutputChannel for testing
 */
export class MockOutputChannel {
  readonly name = 'Tingly Box';
  private _lines: string[] = [];

  append(value: string): void {
    this._lines.push(value);
  }

  appendLine(value: string): void {
    this._lines.push(value + '\n');
  }

  replace(value: string): void {
    this._lines = [value];
  }

  clear(): void {
    this._lines = [];
  }

  show(_preserveFocus?: boolean): void;
  show(_column?: vscode.ViewColumn, _preserveFocus?: boolean): void;
  show(_preserveFocusOrColumn?: boolean | vscode.ViewColumn, _preserveFocus?: boolean): void {
    // Mock implementation
  }

  hide(): void {
    // Mock implementation
  }

  dispose(): void {
    this._lines = [];
  }

  /**
   * Get all logged lines for testing
   */
  getLines(): string[] {
    return this._lines;
  }

  /**
   * Get the last line logged
   */
  getLastLine(): string | undefined {
    return this._lines[this._lines.length - 1];
  }

  /**
   * Clear lines for testing
   */
  clearLines(): void {
    this._lines = [];
  }
}

/**
 * Mock SecretStorage for testing
 */
export class MockSecretStorage {
  private _storage = new Map<string, string>();
  private readonly _onDidChange = new vscode.EventEmitter<{ key: string }>();

  get onDidChange(): vscode.Event<{ key: string }> {
    return this._onDidChange.event;
  }

  async get(key: string): Promise<string | undefined> {
    return this._storage.get(key);
  }

  async store(key: string, value: string): Promise<void> {
    this._storage.set(key, value);
    this._onDidChange.fire({ key });
  }

  async delete(key: string): Promise<void> {
    this._storage.delete(key);
    this._onDidChange.fire({ key });
  }

  keys(): readonly string[] {
    return Array.from(this._storage.keys());
  }

  /**
   * Get all stored keys for testing
   */
  getKeys(): string[] {
    return Array.from(this._storage.keys());
  }

  /**
   * Clear all stored values for testing
   */
  clear(): void {
    this._storage.clear();
  }
}

/**
 * Mock Memento for state management
 */
export class MockMemento {
  private _storage = new Map<string, any>();

  keys(): readonly string[] {
    return Array.from(this._storage.keys());
  }

  get<T>(_key: string, _defaultValue?: T): T | undefined {
    // Mock implementation
    return undefined;
  }

  update(_key: string, _value: any): Thenable<void> {
    // Mock implementation
    return Promise.resolve();
  }

  clear(): void {
    this._storage.clear();
  }
}

/**
 * Mock Memento with setKeysForSync for testing
 */
class MockMementoWithKeys extends MockMemento {
  setKeysForSync(_keys: readonly string[]): void {
    // Mock implementation
  }
}

/**
 * Mock ExtensionContext for testing
 */
export class MockExtensionContext {
  readonly globalState = new MockMementoWithKeys();
  readonly workspaceState = new MockMementoWithKeys();
  readonly secrets = new MockSecretStorage();
  readonly extensionMode = vscode.ExtensionMode.Test;

  subscriptions: { dispose(): void }[] = [];

  asAbsolutePath(_relativePath: string): string {
    return '/mock/path/' + _relativePath;
  }

  storagePath = '/mock/storage';
  globalStoragePath = '/mock/global/storage';
  logUri = vscode.Uri.parse('file:///mock/log');
  extensionUri = vscode.Uri.parse('file:///mock/extension');

  dispose(): void {
    this.subscriptions.forEach(sub => sub.dispose());
  }
}

/**
 * Mock CancellationToken for testing cancellation
 */
export class MockCancellationToken {
  private _isCancellationRequested = false;
  private readonly _onCancellationRequested = new vscode.EventEmitter<any>();

  get isCancellationRequested(): boolean {
    return this._isCancellationRequested;
  }

  onCancellationRequested(
    _listener: (...args: any[]) => any,
    _thisArgs?: any,
    _disposables?: vscode.Disposable[]
  ): vscode.Disposable {
    return {
      dispose: () => {
        // Mock dispose
      },
    };
  }

  /**
   * Trigger cancellation for testing
   */
  cancel(): void {
    this._isCancellationRequested = true;
    this._onCancellationReserved?.fire();
  }

  /**
   * Reset cancellation state for testing
   */
  reset(): void {
    this._isCancellationRequested = false;
  }

  private readonly _onCancellationReserved = new vscode.EventEmitter<void>();
}

/**
 * Mock Progress for testing progress reporting
 */
export class MockProgress<T> implements vscode.Progress<T> {
  private _reports: T[] = [];

  report(value: T): void {
    this._reports.push(value);
  }

  /**
   * Get all progress reports for testing
   */
  getReports(): T[] {
    return this._reports;
  }

  /**
   * Get the last progress report
   */
  getLastReport(): T | undefined {
    return this._reports[this._reports.length - 1];
  }

  /**
   * Clear reports for testing
   */
  clearReports(): void {
    this._reports = [];
  }
}

/**
 * Create a mock VSCode LanguageModelChatRequestMessage
 */
export function createMockChatMessage(
  role: 'user' | 'assistant',
  content: string
): vscode.LanguageModelChatRequestMessage {
  return {
    name: undefined,
    role: role as any,
    content: [new vscode.LanguageModelTextPart(content)],
  } as any;
}

/**
 * Create a mock VSCode model information
 */
export function createMockModelInfo(
  id: string,
  name: string,
  family: string
): vscode.LanguageModelChatInformation {
  return {
    id,
    name,
    family,
    version: '1.0.0',
    maxInputTokens: 128000,
    maxOutputTokens: 4096,
    capabilities: {
      imageInput: false,
      toolCalling: false,
    },
  };
}

/**
 * Wait for async operations to complete
 */
export async function waitFor(ms: number): Promise<void> {
  return new Promise(resolve => setTimeout(resolve, ms));
}

/**
 * Flush all pending promises
 */
export async function flushPromises(): Promise<void> {
  return new Promise(resolve => setImmediate(resolve));
}
