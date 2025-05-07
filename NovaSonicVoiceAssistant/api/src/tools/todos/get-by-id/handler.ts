import { GetTodoByIdParams, GetTodoByIdResult } from './types';
import { ToolHandler } from '../../types';
import { SessionContext } from '../../../types/novasonic.types';
import { TodoService } from '../../../services/todo.service';
import { createLogger } from '../../../middleware';

// Create logger for this tool
const logger = createLogger('GetTodoByIdTool');

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
 * Handler for the GetTodoById tool
 * 
 * @param params - Parameters with todoId
 * @param context - Session context with user information
 * @returns The requested todo
 */
export const handleGetTodoById: ToolHandler<GetTodoByIdParams, GetTodoByIdResult> = async (params, context?: SessionContext) => {
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
  logger.info(`GetTodoById tool executed for todoId: ${todoId}`, { userId });
  
  // Create TodoService and set context
  const todoService = new TodoService().withContext({
    logger,
    requestId: context.requestId || 'unknown',
    user: context.user
  });
  
  // Get the todo using the service
  const todoItem = await todoService.getTodoById(userId, todoId);
  
  if (!todoItem) {
    throw new Error('Todo not found');
  }
  
  // Return formatted response
  return mapTodoItemToResponse(todoItem);
};
