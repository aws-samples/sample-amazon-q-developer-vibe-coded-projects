import { GetNotesByTodoIdSchema } from './schema';
import { handleGetNotesByTodoId } from './handler';
import { ToolRegistryEntry } from '../../types';

/**
 * GetNotesByTodoId tool registry entry
 */
export const GetNotesByTodoIdTool: ToolRegistryEntry = {
  schema: GetNotesByTodoIdSchema,
  handler: handleGetNotesByTodoId
};

// Re-export types and components
export { GetNotesByTodoIdSchema } from './schema';
export { handleGetNotesByTodoId } from './handler';
export type { GetNotesByTodoIdParams, GetNotesByTodoIdResult } from './types';
