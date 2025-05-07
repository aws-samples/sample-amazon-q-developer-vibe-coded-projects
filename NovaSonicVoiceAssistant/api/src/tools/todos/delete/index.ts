import { DeleteTodoSchema } from './schema';
import { handleDeleteTodo } from './handler';
import { ToolRegistryEntry } from '../../types';

/**
 * DeleteTodo tool registry entry
 */
export const DeleteTodoTool: ToolRegistryEntry = {
  schema: DeleteTodoSchema,
  handler: handleDeleteTodo
};

// Re-export types and components
export { DeleteTodoSchema } from './schema';
export { handleDeleteTodo } from './handler';
export type { DeleteTodoParams, DeleteTodoResult } from './types';
