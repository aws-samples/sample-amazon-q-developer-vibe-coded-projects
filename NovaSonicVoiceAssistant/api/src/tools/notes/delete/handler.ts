import { DeleteNoteParams, DeleteNoteResult } from './types';
import { ToolHandler } from '../../types';
import { SessionContext } from '../../../types/novasonic.types';
import { TodoService } from '../../../services/todo.service';
import { createLogger } from '../../../middleware';

// Create logger for this tool
const logger = createLogger('DeleteNoteTool');

/**
 * Handler for the DeleteNote tool
 * 
 * @param params - Parameters with todoId and noteId
 * @param context - Session context with user information
 * @returns Success status
 */
export const handleDeleteNote: ToolHandler<DeleteNoteParams, DeleteNoteResult> = async (params, context?: SessionContext) => {
  // Ensure user context is available
  if (!context?.user?.userId) {
    throw new Error('User not authenticated');
  }

  const userId = context.user.userId;
  const { todoId, noteId } = params;
  
  if (!todoId) {
    throw new Error('Todo ID is required');
  }

  if (!noteId) {
    throw new Error('Note ID is required');
  }
  
  // Log tool execution with userId
  logger.info(`DeleteNote tool executed for todoId: ${todoId}, noteId: ${noteId}`, { userId });
  
  // Create TodoService and set context
  const todoService = new TodoService().withContext({
    logger,
    requestId: context.requestId || 'unknown',
    user: context.user
  });
  
  // Delete the note using the service
  const success = await todoService.deleteNote(userId, todoId, noteId);
  
  if (!success) {
    throw new Error('Failed to delete note. Note or todo may not exist.');
  }
  
  // Return success response
  return {
    success: true,
    message: `Note ${noteId} has been deleted successfully from todo ${todoId}`
  };
};
