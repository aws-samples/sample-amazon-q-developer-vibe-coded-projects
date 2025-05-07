import { Request, Response } from 'express';
import { TodoNoteItem } from '../types';
import { asyncHandler, ApiError } from '../middleware';
import { TodoService } from '../services/todo.service';

// Create a singleton instance of TodoService
const todoService = new TodoService();

// Maximum number of items to process at once to prevent DoS attacks
const MAX_ITEMS = 100;

/**
 * Convert a DynamoDB TodoNoteItem to the API response format
 */
const mapNoteItemToResponse = (item: TodoNoteItem) => {
  return {
    id: item.noteId,
    todoId: item.todoId,
    content: item.content,
    createdAt: item.createdAt
  };
};

/**
 * Get all notes for a specific todo
 */
export const getNotesByTodoId = asyncHandler(async (req: Request, res: Response) => {
  if (!req.user) {
    throw new ApiError(401, 'User not authenticated');
  }

  const todoId = req.params.todoId;
  
  // Use the service with request context
  const contextualService = todoService.withContext(req.context);
  
  // First check if the todo exists
  const todoExists = await contextualService.todoExists(undefined, todoId);
  
  if (!todoExists) {
    throw new ApiError(404, 'Todo not found');
  }
  
  // Get notes for the todo with a limit of MAX_ITEMS
  const notes = await contextualService.getNotesByTodoId(undefined, todoId, MAX_ITEMS);
  
  // Create a safe array with a fixed maximum size to prevent DoS attacks
  // This ensures we never process more than MAX_ITEMS elements
  const safeItems = [];
  const itemsToProcess = Math.min(notes.length, MAX_ITEMS);
  
  // Process only up to MAX_ITEMS elements
  for (let i = 0; i < itemsToProcess; i++) {
    safeItems.push(mapNoteItemToResponse(notes[i]));
  }
  
  return res.status(200).json({
    items: safeItems
  });
});

/**
 * Create a new note for a todo
 */
export const createNote = asyncHandler(async (req: Request, res: Response) => {
  if (!req.user) {
    throw new ApiError(401, 'User not authenticated');
  }

  const todoId = req.params.todoId;
  const { content } = req.body;

  if (!content) {
    throw new ApiError(400, 'Note content is required');
  }

  if (content.length > 1024) {
    throw new ApiError(400, 'Note content must not exceed 1024 characters');
  }

  // Create the note using the service with request context
  const contextualService = todoService.withContext(req.context);
  const noteItem = await contextualService.createNote(undefined, todoId, { content });
  
  if (!noteItem) {
    throw new ApiError(404, 'Todo not found');
  }
  
  // Return the API response format
  return res.status(201).json(mapNoteItemToResponse(noteItem));
});

/**
 * Delete a note
 */
export const deleteNote = asyncHandler(async (req: Request, res: Response) => {
  if (!req.user) {
    throw new ApiError(401, 'User not authenticated');
  }

  const todoId = req.params.todoId;
  const noteId = req.params.noteId;
  
  // Delete the note using the service with request context
  const contextualService = todoService.withContext(req.context);
  await contextualService.deleteNote(undefined, todoId, noteId);
  
  // We don't need to check if the note was found since the API returns 204 regardless
  return res.status(204).send();
});
