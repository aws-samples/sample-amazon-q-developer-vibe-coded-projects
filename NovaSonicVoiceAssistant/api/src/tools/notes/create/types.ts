/**
 * CreateNote tool specific types
 */
import { CreateNoteInput } from '../../../types/note.types';

export interface CreateNoteParams extends CreateNoteInput {
  todoId: string;
  content: string;
}

export interface CreateNoteResult {
  id: string;
  todoId: string;
  content: string;
  createdAt: string;
}
