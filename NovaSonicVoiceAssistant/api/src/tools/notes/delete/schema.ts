import { ToolSchema } from '../../types';

/**
 * Schema definition for the DeleteNote tool
 */
export const DeleteNoteSchema: ToolSchema = {
  name: "deleteNote",
  description: "Delete a specific note from a todo",
  parameters: {
    type: "object",
    properties: {
      todoId: {
        type: "string",
        description: "ID of the todo the note belongs to",
      },
      noteId: {
        type: "string",
        description: "ID of the note to delete",
      },
    },
    required: ["todoId", "noteId"],
  },
};
