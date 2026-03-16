/**
 * Message format converter
 * Converts between VSCode Language Model Chat format and provider-specific formats
 */

import * as vscode from 'vscode';
import type { ProviderMessage, OpenAIMessage, TextPart, ImagePart } from '../types/index.js';

/**
 * Utility class for converting message formats
 */
export class MessageConverter {
  /**
   * Convert VSCode messages to provider-agnostic format
   * @param messages - VSCode chat request messages
   * @returns Array of provider messages
   */
  static toProviderMessages(
    messages: readonly vscode.LanguageModelChatRequestMessage[]
  ): ProviderMessage[] {
    return messages.map((msg) => ({
      role: msg.role === vscode.LanguageModelChatMessageRole.User
        ? 'user'
        : 'assistant',
      content: MessageConverter.extractContent(
        msg.content as readonly vscode.LanguageModelInputPart[]
      ),
    }));
  }

  /**
   * Convert provider messages to OpenAI format
   * @param messages - Provider messages
   * @returns OpenAI-compatible messages
   */
  static toOpenAIFormat(messages: ProviderMessage[]): OpenAIMessage[] {
    return messages.map((msg) => ({
      role: msg.role,
      content:
        typeof msg.content === 'string'
          ? msg.content
          : msg.content
              .map((part) => (part.type === 'text' ? part.text : '[image]'))
              .join(''),
    }));
  }

  /**
   * Extract text content from VSCode message parts
   * @param parts - VSCode input parts (text, images, etc.)
   * @returns Concatenated text content
   */
  private static extractContent(
    parts: readonly vscode.LanguageModelInputPart[]
  ): string {
    return parts
      .filter((part) => part instanceof vscode.LanguageModelTextPart)
      .map((part) => (part as vscode.LanguageModelTextPart).value)
      .join('');
  }

  /**
   * Convert a single text string to provider message
   * @param text - The text content
   * @param role - The message role
   * @returns Provider message
   */
  static textToMessage(text: string, role: 'user' | 'assistant' = 'user'): ProviderMessage {
    return {
      role,
      content: text,
    };
  }
}
