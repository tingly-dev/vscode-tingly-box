/**
 * Message format converter
 * Converts between VSCode Language Model Chat format and provider SDK formats
 */

import * as vscode from 'vscode';

/**
 * Utility class for converting message formats
 */
export class MessageConverter {
  /**
   * Convert VSCode messages to OpenAI format
   * @param messages - VSCode chat request messages
   * @param includeSystemMessage - Whether to include system messages (default: false)
   * @returns OpenAI-compatible messages and optional system message
   */
  static toOpenAIFormat(
    messages: readonly vscode.LanguageModelChatRequestMessage[],
    includeSystemMessage: boolean = false
  ): { messages: OpenAIMessage[]; systemMessage?: string } {
    const openaiMessages: OpenAIMessage[] = [];
    let systemMessage: string | undefined;

    for (const msg of messages) {
      const role = msg.role === vscode.LanguageModelChatMessageRole.User
        ? 'user'
        : 'assistant';

      const content = msg.content as readonly vscode.LanguageModelInputPart[];

      // Check for system message (via metadata or special marker)
      const metadata = (msg as any).metadata;
      if (metadata?.role === 'system' || metadata?.__system__) {
        const systemContent = this.extractContent(content);
        if (systemContent) {
          systemMessage = systemContent;
        }
        if (includeSystemMessage) {
          openaiMessages.push({ role: 'system', content: systemContent });
        }
        continue;
      }

      // Check for tool result parts (from VSCode after tool execution)
      const toolResults = content.filter(
        (part): part is vscode.LanguageModelToolResultPart =>
          part instanceof vscode.LanguageModelToolResultPart
      );

      if (toolResults.length > 0) {
        // VSCode sends tool results as user messages with ToolResultPart
        // Convert to OpenAI tool message format
        for (const tr of toolResults) {
          const toolContent = tr.content.map(c => {
            if (c instanceof vscode.LanguageModelTextPart) {
              return c.value;
            }
            return '';
          }).join('');

          openaiMessages.push({
            role: 'tool',
            tool_call_id: tr.callId,
            content: toolContent,
          });
        }
        continue;
      }

      // Check for tool call parts (from previous assistant messages)
      const toolCalls = content.filter(
        (part): part is vscode.LanguageModelToolCallPart =>
          part instanceof vscode.LanguageModelToolCallPart
      );

      if (toolCalls.length > 0) {
        const openaiMessage: OpenAIMessage = {
          role: 'assistant',
          content: '',
        };

        openaiMessage.tool_calls = toolCalls.map(tc => ({
          id: tc.callId,
          type: 'function',
          function: {
            name: tc.name,
            arguments: typeof tc.input === 'object' ? JSON.stringify(tc.input) : '{}',
          },
        }));

        // Add any text content
        const textContent = this.extractContent(content);
        if (textContent) {
          openaiMessage.content = textContent;
        }

        openaiMessages.push(openaiMessage);
        continue;
      }

      // Regular text message
      const textContent = this.extractContent(content);
      openaiMessages.push({
        role,
        content: textContent,
      });
    }

    return { messages: openaiMessages, systemMessage };
  }

  /**
   * Convert VSCode messages to Anthropic format
   * @param messages - VSCode chat request messages
   * @returns Anthropic-compatible messages and optional system message
   */
  static toAnthropicFormat(
    messages: readonly vscode.LanguageModelChatRequestMessage[]
  ): { messages: AnthropicMessage[]; systemMessage?: string } {
    const anthropicMessages: AnthropicMessage[] = [];
    let systemMessage: string | undefined;

    for (const msg of messages) {
      const role = msg.role === vscode.LanguageModelChatMessageRole.User
        ? 'user'
        : 'assistant';

      const content = msg.content as readonly vscode.LanguageModelInputPart[];

      // Check for system message (via metadata or special marker)
      const metadata = (msg as any).metadata;
      if (metadata?.role === 'system' || metadata?.__system__) {
        const systemContent = this.extractContent(content);
        if (systemContent) {
          systemMessage = systemContent;
        }
        continue; // Anthropic uses system parameter, not messages array
      }

      // Check for tool result parts
      const toolResults = content.filter(
        (part): part is vscode.LanguageModelToolResultPart =>
          part instanceof vscode.LanguageModelToolResultPart
      );

      // Check for tool call parts
      const toolCalls = content.filter(
        (part): part is vscode.LanguageModelToolCallPart =>
          part instanceof vscode.LanguageModelToolCallPart
      );

      if (toolCalls.length > 0 || toolResults.length > 0) {
        // Complex content with tools - use array format
        const contentParts: AnthropicContentPart[] = [];

        // Add text content
        const textContent = this.extractContent(content);
        if (textContent) {
          contentParts.push({ type: 'text', text: textContent });
        }

        // Add tool calls
        for (const tc of toolCalls) {
          contentParts.push({
            type: 'tool_use',
            id: tc.callId,
            name: tc.name,
            input: typeof tc.input === 'object' ? tc.input : {},
          });
        }

        // Add tool results
        for (const tr of toolResults) {
          const resultContent = tr.content.map(c => {
            if (c instanceof vscode.LanguageModelTextPart) {
              return c.value;
            }
            return '';
          }).join('');

          contentParts.push({
            type: 'tool_result',
            tool_use_id: tr.callId,
            content: resultContent,
          });
        }

        anthropicMessages.push({
          role,
          content: contentParts,
        });
        continue;
      }

      // Regular text message - use string content for simplicity
      const textContent = this.extractContent(content);
      if (textContent) {
        anthropicMessages.push({
          role,
          content: textContent,
        });
      }
    }

    return { messages: anthropicMessages, systemMessage };
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
   * Convert a single text string to a simple message object
   * @param text - The text content
   * @param role - The message role
   * @returns Simple message object
   */
  static textToMessage(text: string, role: 'user' | 'assistant' = 'user'): { role: string; content: string } {
    return {
      role,
      content: text,
    };
  }
}

/**
 * OpenAI message format
 */
export interface OpenAIMessage {
  role: 'user' | 'assistant' | 'system' | 'tool';
  content?: string;
  tool_calls?: Array<{
    id: string;
    type: string;
    function: {
      name: string;
      arguments: string;
    };
  }>;
  tool_call_id?: string;
}

/**
 * Anthropic message format
 */
export interface AnthropicMessage {
  role: 'user' | 'assistant';
  content: string | AnthropicContentPart[];
}

/**
 * Anthropic content part types
 */
export type AnthropicContentPart =
  | AnthropicTextBlock
  | AnthropicToolUseBlock
  | AnthropicToolResultBlock;

export interface AnthropicTextBlock {
  type: 'text';
  text: string;
}

export interface AnthropicToolUseBlock {
  type: 'tool_use';
  id: string;
  name: string;
  input: unknown;
}

export interface AnthropicToolResultBlock {
  type: 'tool_result';
  tool_use_id: string;
  content?: string;
}
