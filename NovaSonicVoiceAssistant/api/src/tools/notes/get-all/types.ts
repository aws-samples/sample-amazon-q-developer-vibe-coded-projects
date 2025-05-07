export interface GetNotesByTodoIdParams {
  todoId: string;
}

export interface GetNotesByTodoIdResult {
  items: Array<{
    id: string;
    todoId: string;
    content: string;
    createdAt: string;
  }>;
}
