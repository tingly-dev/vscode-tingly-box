/**
 * AI SDK Message Converter
 * Converts between VSCode/provider formats and AI SDK format
 *
 * Note: Tool calling is handled by the AI SDK via providerOptions.
 * This converter extracts text content from messages for the chat history.
 * The AI SDK manages tool call/response flow internally.
 */

import type { ProviderMessage, TextPart } from '../types/index.js';

/**
 * Convert provider messages to a format compatible with AI SDK
 * AI SDK accepts either simple string content or structured content
 *
 * IMPORTANT: Tool calling is handled via providerOptions in the adapters.
 * This converter focuses on extracting text content for conversation history.
 * The AI SDK will handle tool calls/responses separately based on the tools provided.
 */
export class AISDKMessageConverter {
  /**
   * Convert provider messages to AI SDK compatible format
   * Extracts text content while preserving conversation flow
   *
   * Note: Messages with only tool calls/results (no text) are skipped
   * because the AI SDK handles tool conversations via providerOptions
   */
  static toAISDKMessages(messages: ProviderMessage[]): Array<{
    role: 'system' | 'user' | 'assistant';
    content: string;
  }> {
    const result: Array<{ role: 'system' | 'user' | 'assistant'; content: string }> = [];

    for (const msg of messages) {
      // Only process system, user, and assistant messages
      // Tool messages are handled by AI SDK via providerOptions
      if (msg.role !== 'system' && msg.role !== 'user' && msg.role !== 'assistant') {
        continue;
      }

      let content = '';
      let hasToolContent = false;

      if (typeof msg.content === 'string') {
        content = msg.content;
      } else if (Array.isArray(msg.content)) {
        // Extract all text parts from the content
        const textParts = msg.content.filter((part): part is TextPart => part.type === 'text');

        // Check if there are tool-related parts (for logging/debugging)
        hasToolContent = msg.content.some(
          part => part.type === 'tool_call' || part.type === 'tool_result'
        );

        // Join all text content
        content = textParts.map(part => part.text).join('\n').trim();
      }

      // Skip messages with empty content
      if (!content || content.length === 0) {
        // Log that we're skipping a message with only tool content
        if (hasToolContent) {
          // Message has tool calls/results but no text - AI SDK handles this
          continue;
        }
        continue;
      }

      result.push({
        role: msg.role,
        content,
      });
    }

    return result;
  }

  /**
   * Extract system message from messages array
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
}
