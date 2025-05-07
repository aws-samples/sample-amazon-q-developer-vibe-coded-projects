import { CreateTodoParams, CreateTodoResult } from './types';
import { ToolHandler } from '../../types';
import { SessionContext } from '../../../types/novasonic.types';
import { TodoService } from '../../../services/todo.service';
import { createLogger } from '../../../middleware';

// Create logger for this tool
const logger = createLogger('CreateTodoTool');

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
 * Handler for the CreateTodo tool
 * 
 * @param params - Parameters for creating a todo
 * @param context - Session context with user information
 * @returns The created todo
 */
export const handleCreateTodo: ToolHandler<CreateTodoParams, CreateTodoResult> = async (params, context?: SessionContext) => {
  // Ensure user context is available
  if (!context?.user?.userId) {
    throw new Error('User not authenticated');
  }

  const userId = context.user.userId;
  
  // Extract and validate parameters
  const { title, description, completed } = params;
  
  if (!title) {
    throw new Error('Title is required');
  }

  if (title.length > 255) {
    throw new Error('Title must not exceed 255 characters');
  }

  if (description && description.length > 1024) {
    throw new Error('Description must not exceed 1024 characters');
  }

  // Log tool execution with userId
  logger.info('CreateTodo tool executed', { userId });
  
  // Create TodoService and set context
  const todoService = new TodoService().withContext({
    logger,
    requestId: context.requestId || 'unknown',
    user: context.user
  });
  
  // Create the todo using the service
  const todoItem = await todoService.createTodo(userId, { 
    title, 
    description,
    completed
  });
  
  // Return formatted response
  return mapTodoItemToResponse(todoItem);
};
