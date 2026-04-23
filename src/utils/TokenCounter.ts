/**
 * Token counting utility
 * Provides token estimation for cost tracking
 */

import * as vscode from 'vscode';

/**
 * Utility class for estimating token counts
 * Note: Uses character-based estimation which is approximate.
 * For accurate counts, provider-specific tokenizers should be used.
 */
export class TokenCounter {
  /**
   * Estimate token count using character-based estimation
   * This is a rough approximation - actual token counts vary by model and language
   * @param text - The text to estimate tokens for
   * @returns Estimated token count
   */
  static estimate(text: string): number {
    if (!text || text.length === 0) {
      return 0;
    }
    // Rough estimate: ~4 characters per token for English text
    return Math.ceil(text.length / 4);
  }

  /**
   * Estimate tokens for a VSCode chat message
   * @param message - VSCode chat request message
   * @returns Estimated token count
   */
  static estimateVSCodeMessage(message: vscode.LanguageModelChatRequestMessage): number {
    let textContent = '';

    for (const part of message.content) {
      if (part instanceof vscode.LanguageModelTextPart) {
        textContent += part.value;
      }
      // Add token overhead for other parts (images, etc.)
      else {
        textContent += ' [image]';
      }
    }

    return TokenCounter.estimate(textContent);
  }

  /**
   * Estimate input tokens for a chat request
   * Accounts for both messages and overhead
   * @param messages - Array of chat messages
   * @returns Estimated input token count
   */
  static estimateInputTokens(
    messages: vscode.LanguageModelChatRequestMessage[]
  ): number {
    let total = 0;

    for (const msg of messages) {
      total += TokenCounter.estimateVSCodeMessage(msg);
      // Add small overhead per message for metadata
      total += 4;
    }

    return total;
  }
}
