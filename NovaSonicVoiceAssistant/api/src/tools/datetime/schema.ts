import { ToolSchema } from '../types';

/**
 * Schema definition for the DateTime tool
 */
export const DateTimeToolSchema: ToolSchema = {
  name: "getDateTime",
  description: "Get the current date and time information",
  parameters: {
    type: "object",
    properties: {
      format: {
        type: "string",
        description: "Optional format for the date (e.g., 'iso', 'short', 'long')",
      },
      timezone: {
        type: "string",
        description: "Optional timezone (e.g., 'UTC', 'America/New_York')",
      },
    },
    required: [],
  },
};
