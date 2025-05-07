/**
 * Test file to verify tool schema conversion
 * 
 * This file demonstrates how the unified tool schema approach works
 * by showing the conversion from internal schema to Bedrock API format.
 */

import { toolRegistry, convertToolSchemaToBedrockFormat, getAllToolSchemasForBedrock } from './index';
import { DateTimeToolSchema } from './datetime/schema';

// Example: Convert a single tool schema
console.log('Single tool conversion example:');
const convertedSchema = convertToolSchemaToBedrockFormat(DateTimeToolSchema);
console.log(JSON.stringify(convertedSchema, null, 2));

// Example: Get all tool schemas in Bedrock format
console.log('\nAll tools conversion example:');
const allToolSchemas = getAllToolSchemasForBedrock();
console.log(JSON.stringify(allToolSchemas, null, 2));

/**
 * This demonstrates how the unified schema approach eliminates duplication:
 * 
 * 1. Tools are defined once in their respective folders (e.g., datetime/schema.ts)
 * 2. The tool registry maintains a reference to all available tools
 * 3. The conversion functions transform the schemas to the format needed by Bedrock API
 * 4. The event-builder uses these converted schemas instead of hardcoding them
 * 
 * Benefits:
 * - Single source of truth for tool definitions
 * - Adding new tools only requires defining them once
 * - Changes to tool schemas are automatically reflected in the API
 */
