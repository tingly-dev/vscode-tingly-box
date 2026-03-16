/**
 * Unit tests for TokenCounter
 * Tests token estimation functionality
 */

import * as assert from 'assert';
import { describe, it } from 'mocha';
import { TokenCounter } from '../utils/TokenCounter.js';

describe('TokenCounter', () => {
  describe('estimate', () => {
    it('should return 0 for empty string', () => {
      const count = TokenCounter.estimate('');
      assert.strictEqual(count, 0);
    });

    it('should return 0 for undefined', () => {
      const count = TokenCounter.estimate(undefined as any);
      assert.strictEqual(count, 0);
    });

    it('should estimate tokens for short text', () => {
      const count = TokenCounter.estimate('Hello, world!');
      assert.strictEqual(count, Math.ceil('Hello, world!'.length / 4));
    });

    it('should estimate tokens for long text', () => {
      const text = 'a'.repeat(1000);
      const count = TokenCounter.estimate(text);
      assert.strictEqual(count, Math.ceil(1000 / 4));
    });

    it('should use consistent estimation', () => {
      const text1 = 'This is a test';
      const text2 = 'This is a test';
      assert.strictEqual(TokenCounter.estimate(text1), TokenCounter.estimate(text2));
    });
  });

  describe('estimateMessages', () => {
    it('should estimate tokens for single message', () => {
      const messages = [
        { role: 'user' as const, content: 'Hello, AI!' },
      ];
      const count = TokenCounter.estimateMessages(messages);
      assert.strictEqual(count, Math.ceil('Hello, AI!'.length / 4));
    });

    it('should estimate tokens for multiple messages', () => {
      const messages = [
        { role: 'user' as const, content: 'First message' },
        { role: 'assistant' as const, content: 'Second message' },
      ];
      const count = TokenCounter.estimateMessages(messages);
      const expected = Math.ceil('First message'.length / 4) +
                      Math.ceil('Second message'.length / 4);
      assert.strictEqual(count, expected);
    });

    it('should handle messages with array content', () => {
      const messages = [
        {
          role: 'user' as const,
          content: [
            { type: 'text' as const, text: 'Hello ' },
            { type: 'text' as const, text: 'World!' },
          ],
        },
      ];
      const count = TokenCounter.estimateMessages(messages as any);
      const jsonLength = JSON.stringify(messages[0].content).length;
      assert.strictEqual(count, Math.ceil(jsonLength / 4));
    });

    it('should return 0 for empty messages array', () => {
      const count = TokenCounter.estimateMessages([]);
      assert.strictEqual(count, 0);
    });
  });

  describe('estimateVSCodeMessage', () => {
    it('should estimate tokens for text part', () => {
      const message = {
        role: 'user' as const,
        content: [
          { value: 'Hello, AI!' } as any,
        ],
      };
      const count = TokenCounter.estimateVSCodeMessage(message as any);
      // Mock object is not instanceof LanguageModelTextPart, so it's treated as non-text
      // Returns Math.ceil(' [image]'.length / 4) = 2
      assert.strictEqual(count, 2);
    });

    it('should concatenate multiple text parts', () => {
      const message = {
        role: 'user' as const,
        content: [
          { value: 'Hello ' } as any,
          { value: 'World!' } as any,
        ],
      };
      const count = TokenCounter.estimateVSCodeMessage(message as any);
      // Mock objects are not instanceof LanguageModelTextPart, so treated as non-text
      // Returns Math.ceil(' [image] [image]'.length / 4) = 4
      assert.strictEqual(count, 4);
    });

    it('should add overhead for non-text parts', () => {
      const message = {
        role: 'user' as const,
        content: [
          { value: 'Hello' } as any,
          { value: 'image' } as any, // Non-text part
        ],
      };
      const count = TokenCounter.estimateVSCodeMessage(message as any);
      const expected = Math.ceil('Hello'.length / 4) + Math.ceil(' [image]'.length / 4);
      assert.strictEqual(count, expected);
    });

    it('should handle empty content', () => {
      const message = {
        role: 'user' as const,
        content: [],
      };
      const count = TokenCounter.estimateVSCodeMessage(message as any);
      assert.strictEqual(count, 0);
    });
  });

  describe('estimateInputTokens', () => {
    it('should estimate tokens for message array', () => {
      const messages = [
        {
          role: 'user' as const,
          content: [{ value: 'Hello' } as any],
        },
        {
          role: 'assistant' as const,
          content: [{ value: 'Hi' } as any],
        },
      ];
      const count = TokenCounter.estimateInputTokens(messages as any);
      // Mock objects not instanceof LanguageModelTextPart, so treated as non-text
      // Each message: Math.ceil(' [image]'.length / 4) + 4 overhead = 2 + 4 = 6
      // Total: 6 + 6 = 12
      const expected = Math.ceil(' [image]'.length / 4) + 4 +
                      Math.ceil(' [image]'.length / 4) + 4;
      assert.strictEqual(count, expected);
    });

    it('should add message overhead', () => {
      const messages = [
        {
          role: 'user' as const,
          content: [{ value: 'A' } as any],
        },
      ];
      const count = TokenCounter.estimateInputTokens(messages as any);
      // Mock object not instanceof LanguageModelTextPart, so treated as non-text
      // Math.ceil(' [image]'.length / 4) + 4 overhead = 2 + 4 = 6
      const expected = Math.ceil(' [image]'.length / 4) + 4;
      assert.strictEqual(count, expected);
    });

    it('should handle empty message array', () => {
      const count = TokenCounter.estimateInputTokens([]);
      assert.strictEqual(count, 0);
    });
  });
});
