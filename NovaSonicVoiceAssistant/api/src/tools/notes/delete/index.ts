import { DeleteNoteSchema } from './schema';
import { handleDeleteNote } from './handler';
import { ToolRegistryEntry } from '../../types';

/**
 * DeleteNote tool registry entry
 */
export const DeleteNoteTool: ToolRegistryEntry = {
  schema: DeleteNoteSchema,
  handler: handleDeleteNote
};

// Re-export types and components
export { DeleteNoteSchema } from './schema';
export { handleDeleteNote } from './handler';
export type { DeleteNoteParams, DeleteNoteResult } from './types';
