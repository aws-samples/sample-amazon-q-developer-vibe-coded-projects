import { ToolSchema } from '../../types';

/**
 * Schema definition for the CreateNote tool
 */
export const CreateNoteSchema: ToolSchema = {
  name: "createNote",
  description: "Create a new note for a specific todo",
  parameters: {
    type: "object",
    properties: {
      todoId: {
        type: "string",
        description: "ID of the todo to add a note to",
      },
      content: {
        type: "string",
        description: "Content of the note (max 1024 characters)",
      },
    },
    required: ["todoId", "content"],
  },
};
