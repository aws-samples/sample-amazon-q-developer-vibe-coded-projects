/**
 * Note-related type definitions
 */
import { DynamoDBItem } from './base.types';

// Todo Note entity
export interface TodoNoteItem extends DynamoDBItem {
  entityType: 'todoNote';
  noteId: string;
  todoId: string;
  userId: string;
  content: string;
}

// Basic note item without DynamoDB specifics
export interface NoteItem {
  noteId: string;
  todoId: string;
  userId: string;
  content: string;
  createdAt: string;
}

export interface CreateNoteInput {
  content: string;
}
