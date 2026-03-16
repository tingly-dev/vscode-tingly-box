/**
 * Message format converter
 * Converts between VSCode Language Model Chat format and provider-specific formats
 */

import * as vscode from 'vscode';
import type {
  ProviderMessage,
  OpenAIMessage,
  TextPart,
  ImagePart,
  ToolCallPart,
  ToolResultPart
} from '../types/index.js';

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
    return messages.map((msg) => {
      const result: OpenAIMessage = {
        role: msg.role,
      };

      if (typeof msg.content === 'string') {
        result.content = msg.content;
      } else if (Array.isArray(msg.content)) {
        // Check if this is a tool result message
        const toolResult = msg.content.find((part): part is ToolResultPart => part.type === 'tool_result');
        if (toolResult) {
          result.role = 'tool';
          result.tool_call_id = toolResult.id;
          result.content = typeof toolResult.content === 'string'
            ? toolResult.content
            : toolResult.content.map(p => p.text).join('');
        } else {
          // Handle tool calls
          const toolCalls = msg.content.filter((part): part is ToolCallPart => part.type === 'tool_call');
          if (toolCalls.length > 0) {
            result.tool_calls = toolCalls.map(tc => ({
              id: tc.id,
              type: 'function',
              function: {
                name: tc.name,
                arguments: JSON.stringify(tc.arguments),
              },
            }));
          }

          // Handle text content
          const textParts = msg.content.filter((part): part is TextPart => part.type === 'text');
          if (textParts.length > 0) {
            result.content = textParts.map(part => part.text).join('');
          }
        }
      }

      return result;
    });
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

  /**
   * Extract system message from messages array
   * @param messages - Provider messages
   * @returns Tuple of [systemMessage, remainingMessages]
   */
  static extractSystemMessage(messages: ProviderMessage[]): [string | null, ProviderMessage[]] {
    const systemMsg = messages.find(msg => msg.role === 'system');
    const remaining = messages.filter(msg => msg.role !== 'system');

    let systemContent: string | null = null;
    if (systemMsg) {
      if (typeof systemMsg.content === 'string') {
        systemContent = systemMsg.content;
      } else if (Array.isArray(systemMsg.content)) {
        const textParts = systemMsg.content.filter((part): part is TextPart => part.type === 'text');
        systemContent = textParts.map(p => p.text).join('\n');
      }
    }

    return [systemContent, remaining];
  }

  /**
   * Convert provider messages to Anthropic format
   * @param messages - Provider messages (without system messages)
   * @returns Anthropic-compatible messages
   */
  static toAnthropicFormat(messages: ProviderMessage[]): Array<{ role: string; content: string }> {
    const result: Array<{ role: string; content: string }> = [];

    for (const msg of messages) {
      let content = '';
      if (typeof msg.content === 'string') {
        content = msg.content;
      } else if (Array.isArray(msg.content)) {
        // Concatenate text parts
        content = msg.content
          .filter((part): part is TextPart => part.type === 'text')
          .map(part => part.text)
          .join('\n');
      }

      result.push({
        role: msg.role,
        content,
      });
    }

    return result;
  }
}
