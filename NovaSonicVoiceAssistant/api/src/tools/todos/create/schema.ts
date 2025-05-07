import { ToolSchema } from '../../types';

/**
 * Schema definition for the CreateTodo tool
 */
export const CreateTodoSchema: ToolSchema = {
  name: "createTodo",
  description: "Create a new todo for the authenticated user",
  parameters: {
    type: "object",
    properties: {
      title: {
        type: "string",
        description: "Title of the todo (required, max 255 characters)",
      },
      description: {
        type: "string",
        description: "Description of the todo (optional, max 1024 characters)",
      },
      completed: {
        type: "boolean",
        description: "Whether the todo is completed (optional, defaults to false)",
      },
    },
    required: ["title"],
  },
};
