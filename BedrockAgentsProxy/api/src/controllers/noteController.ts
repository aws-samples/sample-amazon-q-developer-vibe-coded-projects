import { Request, Response } from 'express';
import { NoteRepository } from '../repositories/noteRepository';
import { TodoRepository } from '../repositories/todoRepository';
import { TodoNoteItem } from '../types';
import { asyncHandler, ApiError } from '../middleware';

const noteRepository = new NoteRepository();
const todoRepository = new TodoRepository();

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

  const userId = req.user.userId;
  const todoId = req.params.todoId;
  
  // First check if the todo exists
  const todo = await todoRepository.getById(userId, todoId);
  
  if (!todo) {
    throw new ApiError(404, 'Todo not found');
  }
  
  // Get notes for the todo with a limit of MAX_ITEMS
  const notes = await noteRepository.getAllByTodoId(userId, todoId, MAX_ITEMS);
  
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

  const userId = req.user.userId;
  const todoId = req.params.todoId;
  const { content } = req.body;

  if (!content) {
    throw new ApiError(400, 'Note content is required');
  }

  if (content.length > 1024) {
    throw new ApiError(400, 'Note content must not exceed 1024 characters');
  }

  // Verify the todo exists
  const todo = await todoRepository.getById(userId, todoId);
  
  if (!todo) {
    throw new ApiError(404, 'Todo not found');
  }

  // Create the note
  const noteItem = await noteRepository.create(userId, todoId, { content });
  
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

  const userId = req.user.userId;
  const todoId = req.params.todoId;
  const noteId = req.params.noteId;
  
  // Delete the note
  await noteRepository.deleteById(userId, todoId, noteId);
  return res.status(204).send();
});
