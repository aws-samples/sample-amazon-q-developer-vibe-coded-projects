// Base interface for all DynamoDB items
export interface DynamoDBItem {
  PK: string;
  SK: string;
  entityType: string;
  createdAt: string;
  updatedAt: string;
}

// Todo entity
export interface TodoItem extends DynamoDBItem {
  entityType: 'todo';
  todoId: string;
  userId: string;
  title: string;
  description: string;
  completed: boolean;
}

export interface TodoNoteItem extends DynamoDBItem {
  entityType: 'todoNote';
  noteId: string;
  todoId: string;
  userId: string;
  content: string;
}


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
