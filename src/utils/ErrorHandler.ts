/**
 * Error handler utility
 * Converts various error types into user-friendly messages
 */

import * as vscode from 'vscode';
import { APIError } from '../types/index.js';

/**
 * Utility class for handling errors and displaying user-friendly messages
 */
export class ErrorHandler {
  /**
   * Handle an error and display appropriate message to user
   * @param error - The error to handle
   * @param output - Output channel for detailed logging
   */
  static handle(error: unknown, output: vscode.OutputChannel): void {
    if (error instanceof APIError) {
      ErrorHandler.handleAPIError(error, output);
    } else if (error instanceof Error) {
      ErrorHandler.handleGenericError(error, output);
    } else {
      ErrorHandler.handleUnknownError(error, output);
    }
  }

  /**
   * Handle API errors with status codes
   */
  private static handleAPIError(error: APIError, output: vscode.OutputChannel): void {
    // Log to output channel
    output.appendLine(`[API Error] Status: ${error.statusCode}, Message: ${error.message}`);

    switch (error.statusCode) {
      case 401:
      case 403:
        vscode.window
          .showErrorMessage(
            'Authentication failed. Please check your API key.',
            'Open Settings'
          )
          .then((selection) => {
            if (selection === 'Open Settings') {
              vscode.commands.executeCommand('tinglybox.manage');
            }
          });
        break;

      case 429:
        const retryAfter = error.headers?.['retry-after'];
        const message = retryAfter
          ? `Rate limit exceeded. Please retry after ${retryAfter} seconds.`
          : 'Rate limit exceeded. Please try again later.';
        vscode.window.showWarningMessage(message);
        break;

      case 400:
        vscode.window.showErrorMessage(
          `Invalid request: ${error.message}. Please check your input.`
        );
        break;

      case 404:
        vscode.window.showErrorMessage(
          'Model not found. Please check that the model is available.'
        );
        break;

      case 500:
      case 502:
      case 503:
        vscode.window.showWarningMessage(
          'The AI service is temporarily unavailable. Please try again later.'
        );
        break;

      default:
        vscode.window.showErrorMessage(`API Error (${error.statusCode}): ${error.message}`);
    }

    output.show(true);
  }

  /**
   * Handle generic errors
   */
  private static handleGenericError(error: Error, output: vscode.OutputChannel): void {
    output.appendLine(`[Error] ${error.name}: ${error.message}`);
    if (error.stack) {
      output.appendLine(error.stack);
    }
    output.show(true);

    vscode.window.showErrorMessage(
      'An error occurred. Check the "Tingly Box" output channel for details.'
    );
  }

  /**
   * Handle unknown error types
   */
  private static handleUnknownError(error: unknown, output: vscode.OutputChannel): void {
    output.appendLine(`[Unknown Error] ${String(error)}`);
    output.show(true);

    vscode.window.showErrorMessage('An unexpected error occurred.');
  }

  /**
   * Create an API error from a fetch response
   * @param response - The fetch response
   * @param body - Response body text
   * @returns APIError instance
   */
  static async createAPIError(
    response: Response,
    body?: string
  ): Promise<APIError> {
    let message = response.statusText;
    let code: string | undefined;

    if (body) {
      try {
        const json = JSON.parse(body);
        message = json.error?.message || json.message || message;
        code = json.error?.code;
      } catch {
        // Not JSON, use body as message
        message = body.substring(0, 200);
      }
    }

    // Extract headers manually since Headers.entries() might not be available
    const headers: Record<string, string> = {};
    response.headers.forEach((value, key) => {
      headers[key] = value;
    });

    const error = new APIError(message, response.status, code, headers);
    return error;
  }
}
