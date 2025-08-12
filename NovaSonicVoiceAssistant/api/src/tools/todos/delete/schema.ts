import { ToolSchema } from '../../types';

/**
 * Schema definition for the DeleteTodo tool
 */
export const DeleteTodoSchema: ToolSchema = {
  name: "deleteTodo",
  description: "Delete a todo and all its associated notes for the authenticated user",
  parameters: {
    type: "object",
    properties: {
      todoId: {
        type: "string",
        description: "ID of the todo to delete",
      },
    },
    required: ["todoId"],
  },
};
