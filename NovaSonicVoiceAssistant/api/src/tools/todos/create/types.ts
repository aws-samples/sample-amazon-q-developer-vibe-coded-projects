/**
 * CreateTodo tool specific types
 */
import { Todo, CreateTodoInput } from '../../../types/todo.types';

export interface CreateTodoParams extends CreateTodoInput {
  title: string;
  description?: string;
  completed?: boolean;
}

export interface CreateTodoResult extends Todo {
  id: string;
  title: string;
  description: string;
  completed: boolean;
  createdAt: string;
  updatedAt: string;
}
