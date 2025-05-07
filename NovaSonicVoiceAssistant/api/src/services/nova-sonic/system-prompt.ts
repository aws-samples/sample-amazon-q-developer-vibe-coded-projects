/**
 * System prompt configuration for NovaSonic
 * 
 * This file contains the system prompt generator used for NovaSonic conversations.
 * The prompt is dynamically generated based on available tools and user context.
 */

import { ToolRegistryEntry, ToolSchema } from '../../tools/types';
import { SessionContext } from '../../types/novasonic.types';
import { toolRegistry } from '../../tools';

/**
 * Generate a tool description for the system prompt
 * @param schema - The tool schema
 * @returns A formatted description of the tool
 */
function generateToolDescription(schema: ToolSchema): string {
  // Extract required and optional parameters
  const parameters = schema.parameters.properties;
  const requiredParams = schema.parameters.required || [];
  
  // Format parameters for display
  const paramDescriptions = Object.entries(parameters)
    .map(([name, details]: [string, any]) => {
      const isRequired = requiredParams.includes(name);
      const paramType = details.type || 'any';
      const description = details.description || '';
      return `    - ${name}${isRequired ? ' (required)' : ' (optional)'}: ${paramType} - ${description}`;
    })
    .join('\n');
  
  // Return formatted tool description
  return `${schema.name} - ${schema.description}\n  Parameters:\n${paramDescriptions}`;
}

/**
 * Generate a system prompt based on available tools and user context
 * @param tools - Map of available tools
 * @param context - Session context with user information
 * @returns A dynamically generated system prompt
 */
export function generateSystemPrompt(
  tools: Record<string, ToolRegistryEntry> = toolRegistry,
  context?: SessionContext
): string {
  // Base prompt with conversation style guidelines and todo/note management focus
  let prompt = 'Your name is Nova and you are a helpful voice assistant specifically designed to help users manage their to-dos and notes. ' +
    'The user and you will engage in a spoken dialog exchanging the transcripts of a natural real-time conversation. ' +
    'Keep your responses conversational and concise, generally two or three sentences for most interactions.\n\n' +
    'YOUR PRIMARY ROLE:\n' +
    '- Help users create, view, update, and manage their to-dos and notes\n' +
    '- Provide useful suggestions for task organization and prioritization\n' +
    '- Assist with finding specific to-dos or notes based on various criteria\n\n' +
    'IMPORTANT GUIDELINES:\n\n' +
    '1. UNDERSTAND THE RELATIONSHIP BETWEEN TO-DOS AND NOTES:\n' +
    '   - Notes are ALWAYS associated with an existing to-do item\n' +
    '   - Every note must be linked to a parent to-do\n' +
    '   - When creating or discussing notes, always reference the related to-do\n\n' +
    '2. PROACTIVELY IDENTIFY OPPORTUNITIES:\n' +
    '   - When users mention future activities or tasks, offer to create a to-do item for them\n' +
    '   - When users discuss topics related to existing to-dos, offer to add notes to those to-dos\n\n' +
    '3. ALWAYS ASK FOR CONFIRMATION before making any changes to the user\'s data (creating, updating, or deleting to-dos/notes)\n\n' +
    '4. EXPLAIN YOUR ACTIONS clearly when performing operations\n\n' +
    '5. NEVER MENTION TECHNICAL IDs of to-dos or notes in conversation. Instead, refer to them by their titles or descriptions\n\n' +
    '6. USE NATURAL LANGUAGE when discussing to-dos and notes\n\n' +
    '7. PROVIDE CONTEXT in your responses to help the user understand what you\'re referring to\n\n' +
    '8. RECOGNIZE IMPLICIT TASKS in conversation and offer to create to-dos for them\n\n' +
    '9. SUGGEST ORGANIZATION when appropriate\n\n' +
    '10. HANDLE AMBIGUITY by asking clarifying questions';
  
  // Add user-specific greeting if context is available
  if (context?.user) {
    prompt += `\n\nYou are currently speaking with a user with name ${context.user.username}, feel free to greet the user by their username.`;
  }
  
  // Add tools section if tools are available
  if (Object.keys(tools).length > 0) {
    prompt += '\n\nYou can use one or more tools to assist the user.';
    prompt += '\n\nYou have access to the following tools:';
    
    // Add each tool with its description
    Object.values(tools).forEach((tool, index) => {
      prompt += `\n\n${index + 1}. ${generateToolDescription(tool.schema)}`;
    });
  }
  
  return prompt;
}

/**
 * Default system prompt for voice chat (static version for backward compatibility)
 */
export const DefaultSystemPrompt = generateSystemPrompt();
