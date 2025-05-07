import { CreateTodoSchema } from './schema';
import { handleCreateTodo } from './handler';
import { ToolRegistryEntry } from '../../types';

/**
 * CreateTodo tool registry entry
 */
export const CreateTodoTool: ToolRegistryEntry = {
  schema: CreateTodoSchema,
  handler: handleCreateTodo
};

// Re-export types and components
export { CreateTodoSchema } from './schema';
export { handleCreateTodo } from './handler';
export type { CreateTodoParams, CreateTodoResult } from './types';
