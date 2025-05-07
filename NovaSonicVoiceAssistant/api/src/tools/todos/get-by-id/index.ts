import { GetTodoByIdSchema } from './schema';
import { handleGetTodoById } from './handler';
import { ToolRegistryEntry } from '../../types';

/**
 * GetTodoById tool registry entry
 */
export const GetTodoByIdTool: ToolRegistryEntry = {
  schema: GetTodoByIdSchema,
  handler: handleGetTodoById
};

// Re-export types and components
export { GetTodoByIdSchema } from './schema';
export { handleGetTodoById } from './handler';
export type { GetTodoByIdParams, GetTodoByIdResult } from './types';
