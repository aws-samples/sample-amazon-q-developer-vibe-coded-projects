/**
 * UpdateTodo tool specific types
 */
import { Todo, UpdateTodoInput } from '../../../types/todo.types';

export interface UpdateTodoParams extends UpdateTodoInput {
  todoId: string;
  title?: string;
  description?: string;
  completed?: boolean;
}

export interface UpdateTodoResult extends Todo {
  id: string;
  title: string;
  description: string;
  completed: boolean;
  createdAt: string;
  updatedAt: string;
}
