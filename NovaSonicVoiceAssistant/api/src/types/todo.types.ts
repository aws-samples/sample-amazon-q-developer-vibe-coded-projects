/**
 * Todo-related type definitions
 */
import { DynamoDBItem } from './base.types';

// Todo entity
export interface TodoItem extends DynamoDBItem {
  entityType: 'todo';
  todoId: string;
  userId: string;
  title: string;
  description: string;
  completed: boolean;
}

// API Input/Output interfaces
export interface Todo {
  id: string;
  title: string;
  description: string;
  completed: boolean;
  createdAt: string;
  updatedAt: string;
}

export interface CreateTodoInput {
  title: string;
  description?: string;
  completed?: boolean;
}

export interface UpdateTodoInput {
  title?: string;
  description?: string;
  completed?: boolean;
}
