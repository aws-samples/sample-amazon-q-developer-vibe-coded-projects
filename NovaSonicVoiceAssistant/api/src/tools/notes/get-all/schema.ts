import { ToolSchema } from '../../types';

/**
 * Schema definition for the GetNotesByTodoId tool
 */
export const GetNotesByTodoIdSchema: ToolSchema = {
  name: "getNotesByTodoId",
  description: "Get all notes for a specific todo",
  parameters: {
    type: "object",
    properties: {
      todoId: {
        type: "string",
        description: "ID of the todo to get notes for",
      },
    },
    required: ["todoId"],
  },
};
