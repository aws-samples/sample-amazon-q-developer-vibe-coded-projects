import { GetAllTodosParams, GetAllTodosResult } from './types';
import { ToolHandler } from '../../types';
import { SessionContext } from '../../../types/novasonic.types';
import { TodoService } from '../../../services/todo.service';
import { createLogger } from '../../../middleware';

// Create logger for this tool
const logger = createLogger('GetAllTodosTool');

/**
 * Convert a DynamoDB TodoItem to the API Todo response format
 */
const mapTodoItemToResponse = (item: any) => {
  return {
    id: item.todoId,
    title: item.title,
    description: item.description,
    completed: item.completed === true, // Ensure completed is always a boolean
    createdAt: item.createdAt,
    updatedAt: item.updatedAt
  };
};

/**
 * Handler for the GetAllTodos tool
 * 
 * @param params - No parameters needed
 * @param context - Session context with user information
 * @returns List of todos for the authenticated user
 */
export const handleGetAllTodos: ToolHandler<GetAllTodosParams, GetAllTodosResult> = async (params, context?: SessionContext) => {
  // Ensure user context is available
  if (!context?.user?.userId) {
    throw new Error('User not authenticated');
  }

  const userId = context.user.userId;
  
  // Log tool execution with userId
  logger.info('GetAllTodos tool executed', { userId });
  
  // Create TodoService and set context
  const todoService = new TodoService().withContext({
    logger,
    requestId: context.requestId || 'unknown',
    user: context.user
  });
  
  // Get all todos for the user using the service
  const todos = await todoService.getAllTodosByUserId(userId);
  
  // Return formatted response
  return {
    items: todos.map(mapTodoItemToResponse)
  };
};
