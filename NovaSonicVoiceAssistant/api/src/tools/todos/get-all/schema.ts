import { ToolSchema } from '../../types';

/**
 * Schema definition for the GetAllTodos tool
 */
export const GetAllTodosSchema: ToolSchema = {
  name: "getAllTodos",
  description: "Get all todos for the authenticated user",
  parameters: {
    type: "object",
    properties: {
      // No parameters needed as userId comes from session context
    },
    required: [],
  },
};
