import { GetNotesByTodoIdParams, GetNotesByTodoIdResult } from './types';
import { ToolHandler } from '../../types';
import { SessionContext } from '../../../types/novasonic.types';
import { TodoService } from '../../../services/todo.service';
import { createLogger } from '../../../middleware';

// Create logger for this tool
const logger = createLogger('GetNotesByTodoIdTool');

// Maximum number of items to process at once to prevent DoS attacks
const MAX_ITEMS = 100;

/**
 * Convert a DynamoDB TodoNoteItem to the API response format
 */
const mapNoteItemToResponse = (item: any) => {
  return {
    id: item.noteId,
    todoId: item.todoId,
    content: item.content,
    createdAt: item.createdAt
  };
};

/**
 * Handler for the GetNotesByTodoId tool
 * 
 * @param params - Parameters with todoId
 * @param context - Session context with user information
 * @returns List of notes for the specified todo
 */
export const handleGetNotesByTodoId: ToolHandler<GetNotesByTodoIdParams, GetNotesByTodoIdResult> = async (params, context?: SessionContext) => {
  // Ensure user context is available
  if (!context?.user?.userId) {
    throw new Error('User not authenticated');
  }

  const userId = context.user.userId;
  const { todoId } = params;
  
  if (!todoId) {
    throw new Error('Todo ID is required');
  }
  
  // Log tool execution with userId
  logger.info(`GetNotesByTodoId tool executed for todoId: ${todoId}`, { userId });
  
  // Create TodoService and set context
  const todoService = new TodoService().withContext({
    logger,
    requestId: context.requestId || 'unknown',
    user: context.user
  });
  
  // First check if the todo exists
  const todoExists = await todoService.todoExists(userId, todoId);
  
  if (!todoExists) {
    throw new Error('Todo not found');
  }
  
  // Get notes for the todo with a limit of MAX_ITEMS
  const notes = await todoService.getNotesByTodoId(userId, todoId, MAX_ITEMS);
  
  // Return formatted response
  return {
    items: notes.map(mapNoteItemToResponse)
  };
};
