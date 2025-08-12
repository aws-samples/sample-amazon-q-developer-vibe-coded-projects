import { CreateNoteSchema } from './schema';
import { handleCreateNote } from './handler';
import { ToolRegistryEntry } from '../../types';
import { CreateNoteParams, CreateNoteResult } from './types';

/**
 * CreateNote tool registry entry
 */
export const CreateNoteTool: ToolRegistryEntry = {
  schema: CreateNoteSchema,
  handler: handleCreateNote
};

// Re-export types and components
export { CreateNoteSchema } from './schema';
export { handleCreateNote } from './handler';
export type { CreateNoteParams, CreateNoteResult } from './types';
