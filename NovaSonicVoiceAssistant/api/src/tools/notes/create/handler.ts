import { CreateNoteParams, CreateNoteResult } from './types';
import { ToolHandler } from '../../types';
import { SessionContext } from '../../../types/novasonic.types';
import { TodoService } from '../../../services/todo.service';
import { createLogger } from '../../../middleware';

// Create logger for this tool
const logger = createLogger('CreateNoteTool');

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
 * Handler for the CreateNote tool
 * 
 * @param params - Parameters for creating a note
 * @param context - Session context with user information
 * @returns The created note
 */
export const handleCreateNote: ToolHandler<CreateNoteParams, CreateNoteResult> = async (params, context?: SessionContext) => {
  // Ensure user context is available
  if (!context?.user?.userId) {
    throw new Error('User not authenticated');
  }

  const userId = context.user.userId;
  const { todoId, content } = params;
  
  if (!todoId) {
    throw new Error('Todo ID is required');
  }

  if (!content) {
    throw new Error('Note content is required');
  }

  if (content.length > 1024) {
    throw new Error('Note content must not exceed 1024 characters');
  }
  
  // Log tool execution with userId
  logger.info(`CreateNote tool executed for todoId: ${todoId}`, { userId });
  
  // Create TodoService and set context
  const todoService = new TodoService().withContext({
    logger,
    requestId: context.requestId || 'unknown',
    user: context.user
  });
  
  // Create the note using the service
  const noteItem = await todoService.createNote(userId, todoId, { content });
  
  if (!noteItem) {
    throw new Error('Failed to create note. Todo may not exist.');
  }
  
  // Return formatted response
  return mapNoteItemToResponse(noteItem);
};
