import { GetAllTodosSchema } from './schema';
import { handleGetAllTodos } from './handler';
import { ToolRegistryEntry } from '../../types';

/**
 * GetAllTodos tool registry entry
 */
export const GetAllTodosTool: ToolRegistryEntry = {
  schema: GetAllTodosSchema,
  handler: handleGetAllTodos
};

// Re-export types and components
export { GetAllTodosSchema } from './schema';
export { handleGetAllTodos } from './handler';
export type { GetAllTodosParams, GetAllTodosResult } from './types';
