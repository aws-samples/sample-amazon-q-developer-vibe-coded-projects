/**
 * DeleteTodo tool specific types
 */

export interface DeleteTodoParams {
  todoId: string;
}

export interface DeleteTodoResult {
  success: boolean;
  message: string;
}
