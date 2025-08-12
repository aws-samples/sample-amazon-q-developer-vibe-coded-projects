/**
 * Tool registry and exports
 */
import { ToolRegistryEntry, ToolSchema, BedrockToolSpec } from './types';
import { DateTimeTool } from './datetime/index';

// Import Todo tools
import { 
  GetAllTodosTool, 
  CreateTodoTool, 
  GetTodoByIdTool, 
  UpdateTodoTool, 
  DeleteTodoTool 
} from './todos';

// Import Note tools
import {
  GetNotesByTodoIdTool,
  CreateNoteTool,
  DeleteNoteTool
} from './notes';

// Registry of all available tools
export const toolRegistry: Record<string, ToolRegistryEntry> = {
  // DateTime tool
  [DateTimeTool.schema.name]: DateTimeTool,
  
  // Todo tools
  [GetAllTodosTool.schema.name]: GetAllTodosTool,
  [CreateTodoTool.schema.name]: CreateTodoTool,
  [GetTodoByIdTool.schema.name]: GetTodoByIdTool,
  [UpdateTodoTool.schema.name]: UpdateTodoTool,
  [DeleteTodoTool.schema.name]: DeleteTodoTool,
  
  // Note tools
  [GetNotesByTodoIdTool.schema.name]: GetNotesByTodoIdTool,
  [CreateNoteTool.schema.name]: CreateNoteTool,
  [DeleteNoteTool.schema.name]: DeleteNoteTool
};

/**
 * Convert internal tool schema to Bedrock API format
 * @param schema - The internal tool schema
 * @returns The tool schema in Bedrock API format
 */
export function convertToolSchemaToBedrockFormat(schema: ToolSchema): BedrockToolSpec {
  return {
    toolSpec: {
      name: schema.name,
      description: schema.description,
      inputSchema: {
        json: JSON.stringify(schema.parameters)
      }
    }
  };
}

/**
 * Get all tool schemas in Bedrock API format
 * @returns Array of tool schemas in Bedrock API format
 */
export function getAllToolSchemasForBedrock(): BedrockToolSpec[] {
  return Object.values(toolRegistry).map(tool => 
    convertToolSchemaToBedrockFormat(tool.schema)
  );
}

/**
 * Register all tools with a client
 * @param client - The client to register tools with
 */
export function registerAllTools(client: any): void {
  Object.values(toolRegistry).forEach(tool => {
    console.log(`Registering tool: ${tool.schema.name}`);
    // Tool handlers now support context as a second parameter
    client.registerTool(tool.schema.name, tool.handler);
  });
}

/**
 * Register a specific tool with a client
 * @param client - The client to register the tool with
 * @param toolName - The name of the tool to register
 */
export function registerTool(client: any, toolName: string): boolean {
  const tool = toolRegistry[toolName];
  if (!tool) {
    console.error(`Tool not found: ${toolName}`);
    return false;
  }
  
  console.log(`Registering tool: ${tool.schema.name}`);
  client.registerTool(tool.schema.name, tool.handler);
  return true;
}

// Re-export tool types
export * from './types';

// Re-export individual tools
export * from './datetime/index';
export * from './todos';
export * from './notes';
