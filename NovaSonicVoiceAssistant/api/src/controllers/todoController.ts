import { Request, Response } from 'express';
import { CreateTodoInput, UpdateTodoInput, TodoItem, Todo } from '../types';
import { asyncHandler, ApiError } from '../middleware';
import { TodoService } from '../services/todo.service';

// Create a singleton instance of TodoService
const todoService = new TodoService();

/**
 * Convert a DynamoDB TodoItem to the API Todo response format
 */
const mapTodoItemToResponse = (item: TodoItem): Todo => {
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
 * Get all todos for the authenticated user
 */
export const getAllTodos = asyncHandler(async (req: Request, res: Response) => {
  if (!req.user) {
    throw new ApiError(401, 'User not authenticated');
  }

  // Use the service with request context
  const contextualService = todoService.withContext(req.context);
  const todos = await contextualService.getAllTodosByUserId();

  // Set ETag for caching
  const etag = `W/"${Buffer.from(JSON.stringify(todos)).toString('base64')}"`;
  res.setHeader('ETag', etag);
  
  // Check If-None-Match header for conditional GET
  const ifNoneMatch = req.headers['if-none-match'];
  if (ifNoneMatch && ifNoneMatch === etag) {
    // Explicitly set status code for 304 responses
    res.status(304).end();
    return;
  }

  // Return the API response format with explicit status code
  res.status(200).json({
    items: todos.map(mapTodoItemToResponse)
  });
});

/**
 * Create a new todo for the authenticated user
 */
export const createTodo = asyncHandler(async (req: Request, res: Response) => {
  if (!req.user) {
    throw new ApiError(401, 'User not authenticated');
  }

  const { title, description, completed } = req.body as CreateTodoInput;

  if (!title) {
    throw new ApiError(400, 'Title is required');
  }

  if (title.length > 255) {
    throw new ApiError(400, 'Title must not exceed 255 characters');
  }

  if (description && description.length > 1024) {
    throw new ApiError(400, 'Description must not exceed 1024 characters');
  }

  // Create the todo using the service with request context
  const contextualService = todoService.withContext(req.context);
  const todoItem = await contextualService.createTodo(undefined, { 
    title, 
    description,
    completed
  });
  
  // Return the API response format
  return res.status(201).json(mapTodoItemToResponse(todoItem));
});

/**
 * Get a todo by ID for the authenticated user
 */
export const getTodoById = asyncHandler(async (req: Request, res: Response) => {
  if (!req.user) {
    throw new ApiError(401, 'User not authenticated');
  }

  const todoId = req.params.id;
  
  // Get the todo using the service with request context
  const contextualService = todoService.withContext(req.context);
  const todoItem = await contextualService.getTodoById(undefined, todoId);

  if (!todoItem) {
    throw new ApiError(404, 'Todo not found');
  }
  
  // Return the API response format
  return res.status(200).json(mapTodoItemToResponse(todoItem));
});

/**
 * Update a todo for the authenticated user
 */
export const updateTodo = asyncHandler(async (req: Request, res: Response) => {
  if (!req.user) {
    throw new ApiError(401, 'User not authenticated');
  }

  const todoId = req.params.id;
  
  if (!todoId) {
    throw new ApiError(400, 'Todo ID is required');
  }

  const updates = { ...req.body } as UpdateTodoInput;
  
  if (updates.title && updates.title.length > 255) {
    throw new ApiError(400, 'Title must not exceed 255 characters');
  }

  if (updates.description && updates.description.length > 1024) {
    throw new ApiError(400, 'Description must not exceed 1024 characters');
  }

  if (Object.keys(updates).length === 0) {
    throw new ApiError(400, 'No updates provided');
  }

  // Update the todo using the service with request context
  const contextualService = todoService.withContext(req.context);
  const updatedTodo = await contextualService.updateTodo(undefined, todoId, updates);
  
  if (!updatedTodo) {
    throw new ApiError(404, 'Todo not found');
  }
  
  // Return the API response format
  return res.status(200).json(mapTodoItemToResponse(updatedTodo));
});

/**
 * Delete a todo for the authenticated user
 */
export const deleteTodo = asyncHandler(async (req: Request, res: Response) => {
  if (!req.user) {
    throw new ApiError(401, 'User not authenticated');
  }

  const todoId = req.params.id;
  
  // Delete the todo using the service with request context
  const contextualService = todoService.withContext(req.context);
  const deleted = await contextualService.deleteTodo(undefined, todoId);
  
  if (!deleted) {
    throw new ApiError(404, 'Todo not found');
  }
  
  return res.status(204).send();
});
