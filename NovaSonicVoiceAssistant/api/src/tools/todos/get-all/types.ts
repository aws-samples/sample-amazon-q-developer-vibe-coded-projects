/**
 * GetAllTodos tool specific types
 */
import { Todo } from '../../../types/todo.types';

export interface GetAllTodosParams {
  // No parameters needed as userId comes from session context
}

export interface GetAllTodosResult {
  items: Todo[];
}
