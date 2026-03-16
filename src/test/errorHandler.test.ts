/**
 * Unit tests for ErrorHandler
 * Tests error handling and user message display
 */

import * as assert from 'assert';
import { describe, it, beforeEach } from 'mocha';
import { ErrorHandler } from '../utils/ErrorHandler.js';
import { MockOutputChannel } from './utilities.js';
import { APIError } from '../types/index.js';

describe('ErrorHandler', () => {
  let mockOutputChannel: MockOutputChannel;

  beforeEach(() => {
    mockOutputChannel = new MockOutputChannel();
  });

  describe('handle', () => {
    it('should handle APIError', () => {
      const error = new APIError('Test error', 404);
      ErrorHandler.handle(error, mockOutputChannel as any);

      const lines = mockOutputChannel.getLines();
      assert.ok(lines.some(line => line.includes('[API Error]')));
      assert.ok(lines.some(line => line.includes('Status: 404')));
    });

    it('should handle generic Error', () => {
      const error = new Error('Test error');
      ErrorHandler.handle(error, mockOutputChannel as any);

      const lines = mockOutputChannel.getLines();
      assert.ok(lines.some(line => line.includes('[Error]')));
      assert.ok(lines.some(line => line.includes('Test error')));
    });

    it('should handle unknown error types', () => {
      ErrorHandler.handle('string error', mockOutputChannel as any);

      const lines = mockOutputChannel.getLines();
      assert.ok(lines.some(line => line.includes('[Unknown Error]')));
      assert.ok(lines.some(line => line.includes('string error')));
    });

    it('should log error details for 401', () => {
      const error = new APIError('Unauthorized', 401);
      ErrorHandler.handle(error, mockOutputChannel as any);

      const lines = mockOutputChannel.getLines();
      assert.ok(lines.some(line => line.includes('[API Error]')));
      assert.ok(lines.some(line => line.includes('401')));
    });

    it('should log warning for 429', () => {
      const error = new APIError('Rate limit exceeded', 429, undefined, {
        'retry-after': '60',
      });
      ErrorHandler.handle(error, mockOutputChannel as any);

      const lines = mockOutputChannel.getLines();
      assert.ok(lines.some(line => line.includes('[API Error]')));
      assert.ok(lines.some(line => line.includes('429')));
    });

    it('should log error for 400', () => {
      const error = new APIError('Bad request', 400);
      ErrorHandler.handle(error, mockOutputChannel as any);

      const lines = mockOutputChannel.getLines();
      assert.ok(lines.some(line => line.includes('[API Error]')));
      assert.ok(lines.some(line => line.includes('400')));
    });

    it('should log error for 404', () => {
      const error = new APIError('Not found', 404);
      ErrorHandler.handle(error, mockOutputChannel as any);

      const lines = mockOutputChannel.getLines();
      assert.ok(lines.some(line => line.includes('[API Error]')));
      assert.ok(lines.some(line => line.includes('404')));
    });

    it('should log warning for 500', () => {
      const error = new APIError('Internal server error', 500);
      ErrorHandler.handle(error, mockOutputChannel as any);

      const lines = mockOutputChannel.getLines();
      assert.ok(lines.some(line => line.includes('[API Error]')));
      assert.ok(lines.some(line => line.includes('500')));
    });
  });

  describe('createAPIError', () => {
    it('should create APIError from response', async () => {
      const response = {
        ok: false,
        status: 404,
        statusText: 'Not Found',
        headers: {
          forEach: (callback: (value: string, key: string) => void) => {
            callback('application/json', 'content-type');
          },
        },
      } as Response;

      const error = await ErrorHandler.createAPIError(response, 'Model not found');
      assert.ok(error instanceof APIError);
      assert.strictEqual(error.statusCode, 404);
      assert.strictEqual(error.message, 'Model not found');
    });

    it('should extract error message from JSON response', async () => {
      const response = {
        ok: false,
        status: 400,
        statusText: 'Bad Request',
        headers: {
          forEach: (_callback: (value: string, key: string) => void) => {},
        },
      } as Response;

      const body = JSON.stringify({
        error: {
          message: 'Invalid input',
          code: 'invalid_input',
        },
      });

      const error = await ErrorHandler.createAPIError(response, body);
      assert.strictEqual(error.message, 'Invalid input');
      assert.strictEqual(error.code, 'invalid_input');
    });

    it('should use body as message if not JSON', async () => {
      const response = {
        ok: false,
        status: 500,
        statusText: 'Internal Server Error',
        headers: {
          forEach: (_callback: (value: string, key: string) => void) => {},
        },
      } as Response;

      const body = 'Plain text error message';
      const error = await ErrorHandler.createAPIError(response, body);
      assert.strictEqual(error.message, 'Plain text error message');
    });

    it('should truncate long non-JSON messages', async () => {
      const response = {
        ok: false,
        status: 500,
        statusText: 'Internal Server Error',
        headers: {
          forEach: (_callback: (value: string, key: string) => void) => {},
        },
      } as Response;

      const longBody = 'A'.repeat(300);
      const error = await ErrorHandler.createAPIError(response, longBody);
      assert.strictEqual(error.message.length, 200);
    });
  });
});
