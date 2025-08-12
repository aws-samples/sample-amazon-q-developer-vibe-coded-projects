import { BaseRepository } from './baseRepository';
import { TodoItem } from '../types';
import { generateKeys } from '../libs/dynamodb';
import { v4 as uuidv4 } from 'uuid';
import { createLogger } from '../middleware';
import { Logger } from 'pino';

// Create a logger for this repository
const logger = createLogger('TodoRepository');

export class TodoRepository extends BaseRepository<TodoItem> {
  // Logger instance that can be overridden with context
  private contextLogger: Logger = logger;
  
  setLogger(newLogger: Logger): this {
    this.contextLogger = newLogger;
    return this;
  }
  
  protected getPK(userId: string): string {
    return generateKeys.todo.PK(userId);
  }
  
  protected getSK(todoId: string): string {
    return generateKeys.todo.SK(todoId);
  }
  
  async getAllByUserId(userId: string): Promise<TodoItem[]> {
    this.contextLogger.trace('Getting all todos for user');
    return this.query(this.getPK(userId));
  }
  
  async getById(userId: string, todoId: string): Promise<TodoItem | null> {
    this.contextLogger.trace('Getting todo by ID', { todoId });
    return this.get(this.getPK(userId), this.getSK(todoId));
  }
  
  async create(userId: string, data: { title: string, description?: string, completed?: boolean }): Promise<TodoItem> {
    const now = new Date().toISOString();
    const todoId = uuidv4();
    
    // Ensure completed is a boolean
    const isCompleted = data.completed === true;
    
    this.contextLogger.trace('Creating new todo', { 
      todoId, 
      title: data.title,
      completed: isCompleted
    });
    
    const todoItem: TodoItem = {
      PK: this.getPK(userId),
      SK: this.getSK(todoId),
      entityType: 'todo',
      todoId,
      userId,
      title: data.title,
      description: data.description || '',
      completed: isCompleted,
      createdAt: now,
      updatedAt: now
    };
    
    await this.put(todoItem);
    return todoItem;
  }
  
  // Method to update a todo item
  async updateById(userId: string, todoId: string, data: { title?: string, description?: string, completed?: boolean }): Promise<TodoItem | null> {
    const now = new Date().toISOString();
    
    this.contextLogger.trace('Updating todo', { todoId });
    
    // Get the existing item
    const existingItem = await this.getById(userId, todoId);
    if (!existingItem) {
      this.contextLogger.warn('Todo not found for update', { todoId });
      return null;
    }
    
    // Update only the fields that are provided
    const updatedItem: TodoItem = {
      ...existingItem,
      title: data.title !== undefined ? data.title : existingItem.title,
      description: data.description !== undefined ? data.description : existingItem.description,
      completed: data.completed !== undefined ? data.completed : existingItem.completed,
      updatedAt: now
    };
    
    await this.put(updatedItem);
    return updatedItem;
  }
  
  // Method to delete a todo item
  async deleteById(userId: string, todoId: string): Promise<boolean> {
    this.contextLogger.trace('Deleting todo', { todoId });
    await this.delete(this.getPK(userId), this.getSK(todoId));
    return true;
  }
}
