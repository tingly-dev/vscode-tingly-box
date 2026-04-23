/**
 * Unit tests for MessageConverter
 * Tests message format conversion between VSCode and provider SDK formats
 */

import * as assert from 'assert';
import { describe, it } from 'mocha';
import * as vscode from 'vscode';
import { MessageConverter } from '../utils/MessageConverter.js';

describe('MessageConverter', () => {
  describe('toOpenAIFormat', () => {
    it('should convert VSCode user message to OpenAI format', () => {
      const vscodeMessage = {
        name: undefined,
        role: vscode.LanguageModelChatMessageRole.User,
        content: [
          new vscode.LanguageModelTextPart('Hello, AI!'),
        ],
      };

      const result = MessageConverter.toOpenAIFormat([vscodeMessage as any]);
      assert.strictEqual(result.messages.length, 1);
      assert.strictEqual(result.messages[0].role, 'user');
      assert.strictEqual(result.messages[0].content, 'Hello, AI!');
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

      const result = MessageConverter.toOpenAIFormat(vscodeMessages as any);
      assert.strictEqual(result.messages.length, 2);
      assert.strictEqual(result.messages[0].role, 'user');
      assert.strictEqual(result.messages[1].role, 'assistant');
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

      const result = MessageConverter.toOpenAIFormat([vscodeMessage as any]);
      assert.strictEqual(result.messages[0].content, 'Hello World!');
    });

    it('should handle tool calls', () => {
      const vscodeMessage = {
        name: undefined,
        role: vscode.LanguageModelChatMessageRole.Assistant,
        content: [
          new vscode.LanguageModelTextPart('Let me call a tool'),
          new vscode.LanguageModelToolCallPart('call_123', 'myFunction', { arg: 'value' }),
        ],
      };

      const result = MessageConverter.toOpenAIFormat([vscodeMessage as any]);
      assert.strictEqual(result.messages.length, 1);
      assert.strictEqual(result.messages[0].role, 'assistant');
      assert.strictEqual(result.messages[0].tool_calls?.length, 1);
      assert.strictEqual(result.messages[0].tool_calls?.[0].id, 'call_123');
      assert.strictEqual(result.messages[0].tool_calls?.[0].function.name, 'myFunction');
    });

    it('should handle tool results', () => {
      const vscodeMessage = {
        name: undefined,
        role: vscode.LanguageModelChatMessageRole.User,
        content: [
          new vscode.LanguageModelToolResultPart('call_123', [
            new vscode.LanguageModelTextPart('Result text'),
          ]),
        ],
      };

      const result = MessageConverter.toOpenAIFormat([vscodeMessage as any]);
      assert.strictEqual(result.messages.length, 1);
      assert.strictEqual(result.messages[0].role, 'tool');
      assert.strictEqual(result.messages[0].tool_call_id, 'call_123');
      assert.strictEqual(result.messages[0].content, 'Result text');
    });

    it('should extract system message', () => {
      const vscodeMessages = [
        {
          name: undefined,
          role: vscode.LanguageModelChatMessageRole.User,
          content: [new vscode.LanguageModelTextPart('You are a helpful assistant')],
          metadata: { __system__: true },
        },
        {
          name: undefined,
          role: vscode.LanguageModelChatMessageRole.User,
          content: [new vscode.LanguageModelTextPart('Hello')],
        },
      ] as any;

      const result = MessageConverter.toOpenAIFormat(vscodeMessages);
      assert.strictEqual(result.systemMessage, 'You are a helpful assistant');
      assert.strictEqual(result.messages.length, 1);
      assert.strictEqual(result.messages[0].content, 'Hello');
    });
  });

  describe('toAnthropicFormat', () => {
    it('should convert user message', () => {
      const vscodeMessage = {
        name: undefined,
        role: vscode.LanguageModelChatMessageRole.User,
        content: [
          new vscode.LanguageModelTextPart('Hello!'),
        ],
      };

      const result = MessageConverter.toAnthropicFormat([vscodeMessage as any]);
      assert.strictEqual(result.messages.length, 1);
      assert.strictEqual(result.messages[0].role, 'user');
      assert.strictEqual(result.messages[0].content, 'Hello!');
    });

    it('should convert assistant message', () => {
      const vscodeMessage = {
        name: undefined,
        role: vscode.LanguageModelChatMessageRole.Assistant,
        content: [
          new vscode.LanguageModelTextPart('Hi there!'),
        ],
      };

      const result = MessageConverter.toAnthropicFormat([vscodeMessage as any]);
      assert.strictEqual(result.messages.length, 1);
      assert.strictEqual(result.messages[0].role, 'assistant');
      assert.strictEqual(result.messages[0].content, 'Hi there!');
    });

    it('should handle tool calls', () => {
      const vscodeMessage = {
        name: undefined,
        role: vscode.LanguageModelChatMessageRole.Assistant,
        content: [
          new vscode.LanguageModelToolCallPart('call_123', 'myFunction', { arg: 'value' }),
        ],
      };

      const result = MessageConverter.toAnthropicFormat([vscodeMessage as any]);
      assert.strictEqual(result.messages.length, 1);
      const content = result.messages[0].content as any[];
      assert.strictEqual(Array.isArray(content), true);
      assert.strictEqual(content[0].type, 'tool_use');
      assert.strictEqual(content[0].id, 'call_123');
      assert.strictEqual(content[0].name, 'myFunction');
    });

    it('should extract system message', () => {
      const vscodeMessages = [
        {
          name: undefined,
          role: vscode.LanguageModelChatMessageRole.User,
          content: [new vscode.LanguageModelTextPart('You are a helpful assistant')],
          metadata: { __system__: true },
        },
        {
          name: undefined,
          role: vscode.LanguageModelChatMessageRole.User,
          content: [new vscode.LanguageModelTextPart('Hello')],
        },
      ] as any;

      const result = MessageConverter.toAnthropicFormat(vscodeMessages);
      assert.strictEqual(result.systemMessage, 'You are a helpful assistant');
      assert.strictEqual(result.messages.length, 1);
      assert.strictEqual(result.messages[0].content, 'Hello');
    });
  });

  describe('textToMessage', () => {
    it('should create user message from text', () => {
      const message = MessageConverter.textToMessage('Hello, AI!');
      assert.strictEqual(message.role, 'user');
      assert.strictEqual(message.content, 'Hello, AI!');
    });

    it('should create assistant message from text', () => {
      const message = MessageConverter.textToMessage('Hi there!', 'assistant');
      assert.strictEqual(message.role, 'assistant');
      assert.strictEqual(message.content, 'Hi there!');
    });
  });
});
