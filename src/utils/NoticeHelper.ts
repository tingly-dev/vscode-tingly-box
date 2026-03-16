/**
 * Notice utility functions
 * Provides reusable notification/notice helpers
 */

import * as vscode from 'vscode';

/**
 * Notice utility class for common VSCode notification interactions
 */
export class NoticeHelper {
  /**
   * Constants for reload prompt messages
   */
  private static readonly RELOAD_BUTTON = 'Reload Window';
  private static readonly LATER_BUTTON = 'Later';

  /**
   * Show a reload prompt to the user after a configuration change
   * @param message - The message to display (default: generic message about reloading)
   * @returns Promise that resolves when user makes a selection
   */
  static async promptReload(message?: string): Promise<void> {
    const defaultMsg = 'Please reload the window to refresh the model list and activate the changes.';
    const fullMessage = message
      ? `${message}\n\n${defaultMsg}`
      : `Configuration saved. ${defaultMsg}`;

    const shouldReload = await vscode.window.showInformationMessage(
      fullMessage,
      NoticeHelper.RELOAD_BUTTON,
      NoticeHelper.LATER_BUTTON
    );

    if (shouldReload === NoticeHelper.RELOAD_BUTTON) {
      await vscode.commands.executeCommand('workbench.action.reloadWindow');
    }
  }

  /**
   * Show a success message with optional reload prompt
   * @param message - The success message
   * @param promptReload - Whether to prompt for reload (default: false)
   */
  static async showSuccess(message: string, promptReload = false): Promise<void> {
    if (promptReload) {
      await NoticeHelper.promptReload(message);
    } else {
      await vscode.window.showInformationMessage(message);
    }
  }

  /**
   * Show an error message with optional action button
   * @param message - The error message
   * @param action - Optional action button label and command
   */
  static async showError(
    message: string,
    action?: { label: string; command: string }
  ): Promise<void> {
    if (action) {
      const selection = await vscode.window.showErrorMessage(message, action.label);
      if (selection === action.label) {
        await vscode.commands.executeCommand(action.command);
      }
    } else {
      await vscode.window.showErrorMessage(message);
    }
  }
}
