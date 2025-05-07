import { UpdateTodoSchema } from './schema';
import { handleUpdateTodo } from './handler';
import { ToolRegistryEntry } from '../../types';

/**
 * UpdateTodo tool registry entry
 */
export const UpdateTodoTool: ToolRegistryEntry = {
  schema: UpdateTodoSchema,
  handler: handleUpdateTodo
};

// Re-export types and components
export { UpdateTodoSchema } from './schema';
export { handleUpdateTodo } from './handler';
export type { UpdateTodoParams, UpdateTodoResult } from './types';
