import { UpdateTodoParams, UpdateTodoResult } from './types';
import { ToolHandler } from '../../types';
import { SessionContext } from '../../../types/novasonic.types';
import { TodoService } from '../../../services/todo.service';
import { createLogger } from '../../../middleware';

// Create logger for this tool
const logger = createLogger('UpdateTodoTool');

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
 * Handler for the UpdateTodo tool
 * 
 * @param params - Parameters for updating a todo
 * @param context - Session context with user information
 * @returns The updated todo
 */
export const handleUpdateTodo: ToolHandler<UpdateTodoParams, UpdateTodoResult> = async (params, context?: SessionContext) => {
  // Ensure user context is available
  if (!context?.user?.userId) {
    throw new Error('User not authenticated');
  }

  const userId = context.user.userId;
  const { todoId, ...updates } = params;
  
  if (!todoId) {
    throw new Error('Todo ID is required');
  }
  
  // Validate updates
  if (updates.title && updates.title.length > 255) {
    throw new Error('Title must not exceed 255 characters');
  }

  if (updates.description && updates.description.length > 1024) {
    throw new Error('Description must not exceed 1024 characters');
  }

  if (Object.keys(updates).length === 0) {
    throw new Error('No updates provided');
  }
  
  // Log tool execution with userId
  logger.info(`UpdateTodo tool executed for todoId: ${todoId}`, { userId });
  
  // Create TodoService and set context
  const todoService = new TodoService().withContext({
    logger,
    requestId: context.requestId || 'unknown',
    user: context.user
  });
  
  // Update the todo using the service
  const updatedTodo = await todoService.updateTodo(userId, todoId, updates);
  
  if (!updatedTodo) {
    throw new Error('Todo not found or failed to update');
  }
  
  // Return formatted response
  return mapTodoItemToResponse(updatedTodo);
};
