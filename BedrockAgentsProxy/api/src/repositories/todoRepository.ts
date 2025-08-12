import { BaseRepository } from './baseRepository';
import { TodoItem } from '../types';
import { generateKeys } from '../libs/dynamodb';
import { v4 as uuidv4 } from 'uuid';
import { createLogger } from '../middleware';

const logger = createLogger('TodoRepository');

export class TodoRepository extends BaseRepository<TodoItem> {
  protected getPK(userId: string): string {
    return generateKeys.todo.PK(userId);
  }
  
  protected getSK(todoId: string): string {
    return generateKeys.todo.SK(todoId);
  }
  
  async getAllByUserId(userId: string): Promise<TodoItem[]> {
    logger.info('Getting all todos for user', { userId });
    return this.query(this.getPK(userId));
  }
  
  async getById(userId: string, todoId: string): Promise<TodoItem | null> {
    logger.info('Getting todo by ID', { userId, todoId });
    return this.get(this.getPK(userId), this.getSK(todoId));
  }
  
  async create(userId: string, data: { title: string, description?: string, completed?: boolean }): Promise<TodoItem> {
    const now = new Date().toISOString();
    const todoId = uuidv4();
    
    // Ensure completed is a boolean
    const isCompleted = data.completed === true;
    
    logger.info('Creating new todo', { 
      userId, 
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
    
    return this.put(todoItem);
  }
  
  async updateById(userId: string, todoId: string, updates: { title?: string, description?: string, completed?: boolean }): Promise<TodoItem> {
    // Create a copy of updates to avoid modifying the original object
    const sanitizedUpdates = { ...updates };
    
    // Ensure completed is a boolean if it's being updated
    if (sanitizedUpdates.completed !== undefined) {
      sanitizedUpdates.completed = sanitizedUpdates.completed === true;
      logger.info(`Sanitizing completed value to boolean: ${sanitizedUpdates.completed}`);
    }
    
    logger.info('Updating todo', { 
      userId, 
      todoId, 
      updates: sanitizedUpdates
    });
    
    return this.update(this.getPK(userId), this.getSK(todoId), sanitizedUpdates);
  }
  
  async deleteById(userId: string, todoId: string): Promise<void> {
    logger.info('Deleting todo', { userId, todoId });
    return this.delete(this.getPK(userId), this.getSK(todoId));
  }
}
