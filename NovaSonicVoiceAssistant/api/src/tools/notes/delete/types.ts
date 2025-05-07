/**
 * DeleteNote tool specific types
 */

export interface DeleteNoteParams {
  todoId: string;
  noteId: string;
}

export interface DeleteNoteResult {
  success: boolean;
  message: string;
}
