import { DateTimeToolSchema } from './schema';
import { handleDateTimeTool } from './handler';
import { ToolRegistryEntry } from '../types';
import { DateTimeParams, DateTimeResult } from './types';

/**
 * DateTime tool registry entry
 */
export const DateTimeTool: ToolRegistryEntry = {
  schema: DateTimeToolSchema,
  handler: handleDateTimeTool
};

// Re-export types and components
export { DateTimeToolSchema } from './schema';
export { handleDateTimeTool } from './handler';
export type { DateTimeParams, DateTimeResult } from './types';
