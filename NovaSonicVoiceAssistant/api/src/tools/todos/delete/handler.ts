import { DeleteTodoParams, DeleteTodoResult } from './types';
import { ToolHandler } from '../../types';
import { SessionContext } from '../../../types/novasonic.types';
import { TodoService } from '../../../services/todo.service';
import { createLogger } from '../../../middleware';

// Create logger for this tool
const logger = createLogger('DeleteTodoTool');

/**
 * Handler for the DeleteTodo tool
 * 
 * @param params - Parameters with todoId
 * @param context - Session context with user information
 * @returns Success status
 */
export const handleDeleteTodo: ToolHandler<DeleteTodoParams, DeleteTodoResult> = async (params, context?: SessionContext) => {
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
  logger.info(`DeleteTodo tool executed for todoId: ${todoId}`, { userId });
  
  // Create TodoService and set context
  const todoService = new TodoService().withContext({
    logger,
    requestId: context.requestId || 'unknown',
    user: context.user
  });
  
  // Delete the todo and its notes using the service
  const success = await todoService.deleteTodo(userId, todoId);
  
  if (!success) {
    throw new Error('Todo not found or failed to delete');
  }
  
  // Return success response
  return {
    success: true,
    message: `Todo ${todoId} and all associated notes have been deleted successfully`
  };
};
