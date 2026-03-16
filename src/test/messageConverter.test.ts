/**
 * Unit tests for MessageConverter
 * Tests message format conversion between VSCode and provider formats
 */

import * as assert from 'assert';
import { describe, it } from 'mocha';
import * as vscode from 'vscode';
import { MessageConverter } from '../utils/MessageConverter.js';
import type { ProviderMessage } from '../types/index.js';

describe('MessageConverter', () => {
  describe('toProviderMessages', () => {
    it('should convert VSCode user message to provider format', () => {
      const vscodeMessage = {
        name: undefined,
        role: vscode.LanguageModelChatMessageRole.User,
        content: [
          new vscode.LanguageModelTextPart('Hello, AI!'),
        ],
      };

      const result = MessageConverter.toProviderMessages([vscodeMessage as any]);
      assert.strictEqual(result.length, 1);
      assert.strictEqual(result[0].role, 'user');
      assert.strictEqual(result[0].content, 'Hello, AI!');
    });

    it('should convert multiple VSCode messages', () => {
      const vscodeMessages = [
        {
          name: undefined,
          role: vscode.LanguageModelChatMessageRole.User,
          content: [new vscode.LanguageModelTextPart('First message')],
        },
        {
          name: undefined,
          role: vscode.LanguageModelChatMessageRole.Assistant,
          content: [new vscode.LanguageModelTextPart('Second message')],
        },
      ];

      const result = MessageConverter.toProviderMessages(vscodeMessages as any);
      assert.strictEqual(result.length, 2);
      assert.strictEqual(result[0].role, 'user');
      assert.strictEqual(result[1].role, 'assistant');
    });

    it('should concatenate multiple text parts', () => {
      const vscodeMessage = {
        name: undefined,
        role: vscode.LanguageModelChatMessageRole.User,
        content: [
          new vscode.LanguageModelTextPart('Hello '),
          new vscode.LanguageModelTextPart('World!'),
        ],
      };

      const result = MessageConverter.toProviderMessages([vscodeMessage as any]);
      // 'Hello ' + '' + 'World!' = 'Hello World!' (preserves trailing space from first part)
      assert.strictEqual(result[0].content, 'Hello World!');
    });
  });

  describe('toOpenAIFormat', () => {
    it('should convert simple text message', () => {
      const providerMessage: ProviderMessage = {
        role: 'user',
        content: 'Hello, AI!',
      };

      const result = MessageConverter.toOpenAIFormat([providerMessage]);
      assert.strictEqual(result.length, 1);
      assert.strictEqual(result[0].role, 'user');
      assert.strictEqual(result[0].content, 'Hello, AI!');
    });

    it('should convert assistant message', () => {
      const providerMessage: ProviderMessage = {
        role: 'assistant',
        content: 'Hello, user!',
      };

      const result = MessageConverter.toOpenAIFormat([providerMessage]);
      assert.strictEqual(result.length, 1);
      assert.strictEqual(result[0].role, 'assistant');
      assert.strictEqual(result[0].content, 'Hello, user!');
    });

    it('should handle tool result message', () => {
      const providerMessage: ProviderMessage = {
        role: 'user',
        content: [
          {
            type: 'tool_result',
            id: 'call_123',
            content: 'Tool output',
          },
        ],
      };

      const result = MessageConverter.toOpenAIFormat([providerMessage]);
      assert.strictEqual(result[0].role, 'tool');
      assert.strictEqual(result[0].tool_call_id, 'call_123');
      assert.strictEqual(result[0].content, 'Tool output');
    });

    it('should handle tool call message', () => {
      const providerMessage: ProviderMessage = {
        role: 'assistant',
        content: [
          {
            type: 'tool_call',
            id: 'call_123',
            name: 'search',
            arguments: { query: 'test' },
          },
        ],
      };

      const result = MessageConverter.toOpenAIFormat([providerMessage]);
      assert.strictEqual(result[0].role, 'assistant');
      assert.strictEqual(result[0].tool_calls?.length, 1);
      assert.strictEqual(result[0].tool_calls?.[0].id, 'call_123');
      assert.strictEqual(result[0].tool_calls?.[0].type, 'function');
      assert.strictEqual(result[0].tool_calls?.[0].function?.name, 'search');
    });

    it('should handle message with both text and tool calls', () => {
      const providerMessage: ProviderMessage = {
        role: 'assistant',
        content: [
          { type: 'text', text: 'Thinking...' },
          {
            type: 'tool_call',
            id: 'call_123',
            name: 'search',
            arguments: { query: 'test' },
          },
        ],
      };

      const result = MessageConverter.toOpenAIFormat([providerMessage]);
      assert.strictEqual(result[0].content, 'Thinking...');
      assert.strictEqual(result[0].tool_calls?.length, 1);
    });
  });

  describe('extractSystemMessage', () => {
    it('should extract system message', () => {
      const messages: ProviderMessage[] = [
        { role: 'system', content: 'You are a helpful assistant.' },
        { role: 'user', content: 'Hello!' },
      ];

      const [system, remaining] = MessageConverter.extractSystemMessage(messages);
      assert.strictEqual(system, 'You are a helpful assistant.');
      assert.strictEqual(remaining.length, 1);
      assert.strictEqual(remaining[0].role, 'user');
    });

    it('should return null if no system message', () => {
      const messages: ProviderMessage[] = [
        { role: 'user', content: 'Hello!' },
      ];

      const [system, remaining] = MessageConverter.extractSystemMessage(messages);
      assert.strictEqual(system, null);
      assert.strictEqual(remaining.length, 1);
    });

    it('should handle system message with array content', () => {
      const messages: ProviderMessage[] = [
        {
          role: 'system',
          content: [
            { type: 'text', text: 'You are a helpful assistant.' },
          ],
        },
        { role: 'user', content: 'Hello!' },
      ];

      const [system, remaining] = MessageConverter.extractSystemMessage(messages);
      assert.strictEqual(system, 'You are a helpful assistant.');
      assert.strictEqual(remaining.length, 1);
    });
  });

  describe('toAnthropicFormat', () => {
    it('should convert user message', () => {
      const messages: ProviderMessage[] = [
        { role: 'user', content: 'Hello!' },
      ];

      const result = MessageConverter.toAnthropicFormat(messages);
      assert.strictEqual(result.length, 1);
      assert.strictEqual(result[0].role, 'user');
      assert.strictEqual(result[0].content, 'Hello!');
    });

    it('should convert assistant message', () => {
      const messages: ProviderMessage[] = [
        { role: 'assistant', content: 'Hi there!' },
      ];

      const result = MessageConverter.toAnthropicFormat(messages);
      assert.strictEqual(result.length, 1);
      assert.strictEqual(result[0].role, 'assistant');
      assert.strictEqual(result[0].content, 'Hi there!');
    });

    it('should concatenate text parts in array content', () => {
      const messages: ProviderMessage[] = [
        {
          role: 'user',
          content: [
            { type: 'text', text: 'Hello ' },
            { type: 'text', text: 'World!' },
          ],
        },
      ];

      const result = MessageConverter.toAnthropicFormat(messages);
      // Implementation joins with '\n', so 'Hello ' + '\n' + 'World!' = 'Hello \nWorld!'
      assert.strictEqual(result[0].content, 'Hello \nWorld!');
    });

    it('should ignore non-text parts', () => {
      const messages: ProviderMessage[] = [
        {
          role: 'user',
          content: [
            { type: 'text', text: 'Hello' },
            { type: 'image', data: 'base64...' } as any,
          ],
        },
      ];

      const result = MessageConverter.toAnthropicFormat(messages);
      assert.strictEqual(result[0].content, 'Hello');
    });
  });

  describe('textToMessage', () => {
    it('should create user message from text', () => {
      const message = MessageConverter.textToMessage('Hello, AI!');
      assert.strictEqual(message.role, 'user');
      assert.strictEqual(message.content, 'Hello, AI!');
    });

    it('should create assistant message from text', () => {
      const message = MessageConverter.textToMessage('Hello, user!', 'assistant');
      assert.strictEqual(message.role, 'assistant');
      assert.strictEqual(message.content, 'Hello, user!');
    });
  });
});
