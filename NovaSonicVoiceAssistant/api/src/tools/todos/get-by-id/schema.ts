import { ToolSchema } from '../../types';

/**
 * Schema definition for the GetTodoById tool
 */
export const GetTodoByIdSchema: ToolSchema = {
  name: "getTodoById",
  description: "Get a specific todo by ID for the authenticated user",
  parameters: {
    type: "object",
    properties: {
      todoId: {
        type: "string",
        description: "ID of the todo to retrieve",
      },
    },
    required: ["todoId"],
  },
};
