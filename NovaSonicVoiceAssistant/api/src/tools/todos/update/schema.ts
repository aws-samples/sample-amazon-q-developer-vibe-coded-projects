import { ToolSchema } from '../../types';

/**
 * Schema definition for the UpdateTodo tool
 */
export const UpdateTodoSchema: ToolSchema = {
  name: "updateTodo",
  description: "Update an existing todo for the authenticated user",
  parameters: {
    type: "object",
    properties: {
      todoId: {
        type: "string",
        description: "ID of the todo to update",
      },
      title: {
        type: "string",
        description: "New title for the todo (optional, max 255 characters)",
      },
      description: {
        type: "string",
        description: "New description for the todo (optional, max 1024 characters)",
      },
      completed: {
        type: "boolean",
        description: "New completed status for the todo (optional)",
      },
    },
    required: ["todoId"],
  },
};
