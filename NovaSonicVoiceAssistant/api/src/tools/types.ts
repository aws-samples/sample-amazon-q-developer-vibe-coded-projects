/**
 * Common types for all tools
 */
import { SessionContext } from '../types/novasonic.types';

/**
 * Base tool interface - unified schema that works for both internal use and Bedrock API
 * This is the single source of truth for tool schemas in the project
 */
export interface ToolSchema {
  name: string;
  description: string;
  parameters: {
    type: string;
    properties: Record<string, any>;
    required: string[];
  };
}

/**
 * Bedrock API format for tool specification
 * This is derived from the ToolSchema
 */
export interface BedrockToolSpec {
  toolSpec: {
    name: string;
    description: string;
    inputSchema: {
      json: string;
    };
  };
}

// Tool handler function type with context support
export type ToolHandler<T = any, R = any> = (params: T, context?: SessionContext) => Promise<R> | R;

// Tool registry entry
export interface ToolRegistryEntry {
  schema: ToolSchema;
  handler: ToolHandler;
}
