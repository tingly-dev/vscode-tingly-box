/**
 * Shared TypeScript type definitions for VSCode Tingly Box extension
 */

/**
 * Supported API styles
 */
export type APIStyle = 'anthropic' | 'openai';

/**
 * Provider configuration stored in SecretStorage
 */
export interface ProviderConfig {
  /** API token/key for the provider */
  token: string;
  /** Base URL for API (required for custom endpoints) */
  baseUrl: string;
  /** API style to use for message formatting */
  apiStyle: APIStyle;
  /** Tingly Box Web UI URL (optional) */
  tinglyBoxUrl?: string;
}

/**
 * Model information metadata
 */
export interface ModelInfo {
  /** Unique model identifier (e.g., 'default:gpt-4o') */
  id: string;
  /** Display name shown in UI */
  name: string;
  /** Provider name */
  provider: string;
  /** Model family (e.g., 'gpt-4', 'claude-3') */
  family: string;
  /** Version string */
  version: string;
  /** Maximum input tokens */
  maxInputTokens: number;
  /** Maximum output tokens */
  maxOutputTokens: number;
  /** Model capabilities */
  capabilities: {
    /** Supports image inputs */
    imageInput?: boolean;
    /** Supports function/tool calling */
    toolCalling?: boolean | number;
  };
  /** Additional metadata */
  metadata?: Record<string, unknown>;
}

/**
 * Provider-agnostic message format
 */
export interface ProviderMessage {
  role: 'user' | 'assistant' | 'system';
  content: string | Array<TextPart | ImagePart | ToolCallPart | ToolResultPart>;
}

/**
 * Text part in a message
 */
export interface TextPart {
  type: 'text';
  text: string;
}

/**
 * Image part in a message
 */
export interface ImagePart {
  type: 'image';
  data: string; // base64 or URL
}

/**
 * Tool call part in a message
 */
export interface ToolCallPart {
  type: 'tool_call';
  id: string;
  name: string;
  arguments: Record<string, unknown>;
}

/**
 * Tool result part in a message
 */
export interface ToolResultPart {
  type: 'tool_result';
  id: string;
  content: string | Array<{ type: 'text'; text: string }>;
}

/**
 * Tool definition for function calling
 */
export interface Tool {
  /** Tool name */
  name: string;
  /** Tool description */
  description?: string;
  /** Tool input schema (JSON Schema) */
  inputSchema?: Record<string, unknown>;
}

/**
 * Chat request options
 */
export interface ChatOptions {
  /** Sampling temperature (0-2) */
  temperature?: number;
  /** Maximum tokens to generate */
  maxTokens?: number;
  /** Stop sequences */
  stop?: string[];
  /** Available tools for function calling */
  tools?: Tool[];
  /** Additional provider-specific options */
  extra?: Record<string, unknown>;
}

/**
 * OpenAI-specific message format
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
 * API error with status code
 */
export class APIError extends Error {
  constructor(
    message: string,
    public readonly statusCode: number,
    public readonly code?: string,
    public readonly headers?: Record<string, string>
  ) {
    super(message);
    this.name = 'APIError';
  }
}

/**
 * Configuration change event details
 */
export interface ConfigChangeEvent {
  providerId: string;
  action: 'set' | 'remove';
}

/**
 * Response part type for streaming callbacks
 * Union of parts that can be streamed back from AI
 */
export type ResponsePart = TextPart | ToolCallPart;
