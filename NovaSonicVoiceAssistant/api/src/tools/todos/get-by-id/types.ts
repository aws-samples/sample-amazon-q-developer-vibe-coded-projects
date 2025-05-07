/**
 * GetTodoById tool specific types
 */
import { Todo } from '../../../types/todo.types';

export interface GetTodoByIdParams {
  todoId: string;
}

export interface GetTodoByIdResult extends Todo {
  id: string;
  title: string;
  description: string;
  completed: boolean;
  createdAt: string;
  updatedAt: string;
}
