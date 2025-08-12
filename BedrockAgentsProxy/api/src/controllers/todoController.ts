import { Request, Response } from 'express';
import { TodoRepository } from '../repositories/todoRepository';
import { NoteRepository } from '../repositories/noteRepository';
import { CreateTodoInput, UpdateTodoInput, TodoItem } from '../types';
import { createLogger, asyncHandler, ApiError } from '../middleware';

// Create a logger for the todo controller
const logger = createLogger('TodoController');
const todoRepository = new TodoRepository();
const noteRepository = new NoteRepository();

/**
 * Convert a DynamoDB TodoItem to the API Todo response format
 */
const mapTodoItemToResponse = (item: TodoItem) => {
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

  const userId = req.user.userId;
  const todos = await todoRepository.getAllByUserId(userId);

  return res.status(200).json({
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

  const userId = req.user.userId;
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

  // Ensure completed is a boolean
  const isCompleted = completed === true;

  const todoItem = await todoRepository.create(userId, { 
    title, 
    description,
    completed: isCompleted
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

  const userId = req.user.userId;
  const todoId = req.params.id;
  
  const todoItem = await todoRepository.getById(userId, todoId);

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

  const userId = req.user.userId;
  const todoId = req.params.id;
  
  if (!todoId) {
    throw new ApiError(400, 'Todo ID is required');
  }

  // Check if todo exists
  const existingTodo = await todoRepository.getById(userId, todoId);

  if (!existingTodo) {
    throw new ApiError(404, 'Todo not found');
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

  // Ensure completed is a boolean if it's being updated
  if (updates.completed !== undefined) {
    updates.completed = updates.completed === true;
  }

  const updatedTodo = await todoRepository.updateById(userId, todoId, updates);
  
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

  const userId = req.user.userId;
  const todoId = req.params.id;
  
  // Check if todo exists
  const existingTodo = await todoRepository.getById(userId, todoId);

  if (!existingTodo) {
    throw new ApiError(404, 'Todo not found');
  }

  // Delete all associated notes in a more efficient way
  logger.info('Deleting all notes associated with todo', { userId, todoId });
  await noteRepository.deleteAllByTodoId(userId, todoId);

  // Then delete the todo itself
  logger.info('Deleting todo', { userId, todoId });
  await todoRepository.deleteById(userId, todoId);
  return res.status(204).send();
});
