import { TodoRepository } from '../repositories/todoRepository';
import { NoteRepository } from '../repositories/noteRepository';
import { TodoItem, TodoNoteItem } from '../types';
import { BaseService } from './base.service';
import { RequestContext } from '../types/context.types';

/**
 * TodoService provides a centralized service layer for todo and note operations
 * Extends BaseService to inherit context and logging capabilities
 */
export class TodoService extends BaseService {
  private todoRepository = new TodoRepository();
  private noteRepository = new NoteRepository();
  
  /**
   * Override withContext to also set the logger for repositories
   */
  withContext(context: RequestContext) {
    const service = super.withContext(context);
    
    // Pass the context logger to repositories
    const contextLogger = context.logger.child({ 
      context: 'TodoRepository',
      requestId: context.requestId
    });
    
    // Set the logger on the repositories
    service.todoRepository = Object.create(this.todoRepository);
    Object.assign(service.todoRepository, this.todoRepository);
    if ('setLogger' in service.todoRepository) {
      service.todoRepository.setLogger(contextLogger);
    }
    
    return service;
  }
  
  /**
   * Get all todos for the current user
   * Uses the user from the context if available
   */
  async getAllTodosByUserId(userId?: string): Promise<TodoItem[]> {
    // Use provided userId or get from context
    const effectiveUserId = userId || this.user?.userId;
    
    if (!effectiveUserId) {
      this.logger.error('No user ID available for getAllTodosByUserId');
      throw new Error('User ID is required');
    }
    
    this.logger.trace('Getting all todos for current user');
    return this.todoRepository.getAllByUserId(effectiveUserId);
  }
  
  /**
   * Get a specific todo by ID
   */
  async getTodoById(userId: string | undefined, todoId: string): Promise<TodoItem | null> {
    // Use provided userId or get from context
    const effectiveUserId = userId || this.user?.userId;
    
    if (!effectiveUserId) {
      this.logger.error('No user ID available for getTodoById');
      throw new Error('User ID is required');
    }
    
    this.logger.trace(`Getting todo by ID: ${todoId}`);
    return this.todoRepository.getById(effectiveUserId, todoId);
  }
  
  /**
   * Create a new todo
   */
  async createTodo(
    userId: string | undefined, 
    data: { title: string, description?: string, completed?: boolean }
  ): Promise<TodoItem> {
    // Use provided userId or get from context
    const effectiveUserId = userId || this.user?.userId;
    
    if (!effectiveUserId) {
      this.logger.error('No user ID available for createTodo');
      throw new Error('User ID is required');
    }
    
    this.logger.trace(`Creating new todo for user: ${effectiveUserId}`);
    
    // Ensure completed is a boolean
    const sanitizedData = {
      ...data,
      completed: data.completed === true
    };
    
    return this.todoRepository.create(effectiveUserId, sanitizedData);
  }
  
  /**
   * Update an existing todo
   */
  async updateTodo(
    userId: string | undefined, 
    todoId: string, 
    updates: { title?: string, description?: string, completed?: boolean }
  ): Promise<TodoItem | null> {
    // Use provided userId or get from context
    const effectiveUserId = userId || this.user?.userId;
    
    if (!effectiveUserId) {
      this.logger.error('No user ID available for updateTodo');
      throw new Error('User ID is required');
    }
    
    this.logger.trace(`Updating todo: ${todoId} for user: ${effectiveUserId}`);
    
    // Check if todo exists
    const existingTodo = await this.todoRepository.getById(effectiveUserId, todoId);
    if (!existingTodo) {
      this.logger.warn(`Todo not found: ${todoId} for user: ${effectiveUserId}`);
      return null;
    }
    
    // Ensure completed is a boolean if it's being updated
    const sanitizedUpdates = { ...updates };
    if (sanitizedUpdates.completed !== undefined) {
      sanitizedUpdates.completed = sanitizedUpdates.completed === true;
    }
    
    return this.todoRepository.updateById(effectiveUserId, todoId, sanitizedUpdates);
  }
  
  /**
   * Delete a todo and all its associated notes
   */
  async deleteTodo(userId: string | undefined, todoId: string): Promise<boolean> {
    // Use provided userId or get from context
    const effectiveUserId = userId || this.user?.userId;
    
    if (!effectiveUserId) {
      this.logger.error('No user ID available for deleteTodo');
      throw new Error('User ID is required');
    }
    
    this.logger.trace(`Deleting todo: ${todoId} for user: ${effectiveUserId}`);
    
    // Check if todo exists
    const existingTodo = await this.todoRepository.getById(effectiveUserId, todoId);
    if (!existingTodo) {
      this.logger.warn(`Todo not found: ${todoId} for user: ${effectiveUserId}`);
      return false;
    }
    
    // Delete all associated notes first
    this.logger.trace(`Deleting all notes associated with todo: ${todoId}`);
    await this.noteRepository.deleteAllByTodoId(effectiveUserId, todoId);
    
    // Then delete the todo itself
    await this.todoRepository.deleteById(effectiveUserId, todoId);
    return true;
  }
  
  /**
   * Check if a todo exists
   */
  async todoExists(userId: string | undefined, todoId: string): Promise<boolean> {
    // Use provided userId or get from context
    const effectiveUserId = userId || this.user?.userId;
    
    if (!effectiveUserId) {
      this.logger.error('No user ID available for todoExists');
      throw new Error('User ID is required');
    }
    
    const todo = await this.todoRepository.getById(effectiveUserId, todoId);
    return todo !== null;
  }
  
  /**
   * Get all notes for a specific todo
   */
  async getNotesByTodoId(userId: string | undefined, todoId: string, limit: number = 100): Promise<TodoNoteItem[]> {
    // Use provided userId or get from context
    const effectiveUserId = userId || this.user?.userId;
    
    if (!effectiveUserId) {
      this.logger.error('No user ID available for getNotesByTodoId');
      throw new Error('User ID is required');
    }
    
    this.logger.trace(`Getting notes for todo: ${todoId}, user: ${effectiveUserId}, limit: ${limit}`);
    return this.noteRepository.getAllByTodoId(effectiveUserId, todoId, limit);
  }
  
  /**
   * Create a new note for a todo
   */
  async createNote(
    userId: string | undefined, 
    todoId: string, 
    data: { content: string }
  ): Promise<TodoNoteItem | null> {
    // Use provided userId or get from context
    const effectiveUserId = userId || this.user?.userId;
    
    if (!effectiveUserId) {
      this.logger.error('No user ID available for createNote');
      throw new Error('User ID is required');
    }
    
    this.logger.trace(`Creating note for todo: ${todoId}, user: ${effectiveUserId}`);
    
    // Verify the todo exists
    const todo = await this.todoRepository.getById(effectiveUserId, todoId);
    if (!todo) {
      this.logger.warn(`Cannot create note: Todo not found: ${todoId} for user: ${effectiveUserId}`);
      return null;
    }
    
    return this.noteRepository.create(effectiveUserId, todoId, data);
  }
  
  /**
   * Delete a note
   */
  async deleteNote(userId: string | undefined, todoId: string, noteId: string): Promise<boolean> {
    // Use provided userId or get from context
    const effectiveUserId = userId || this.user?.userId;
    
    if (!effectiveUserId) {
      this.logger.error('No user ID available for deleteNote');
      throw new Error('User ID is required');
    }
    
    this.logger.trace(`Deleting note: ${noteId} for todo: ${todoId}, user: ${effectiveUserId}`);
    
    try {
      await this.noteRepository.deleteById(effectiveUserId, todoId, noteId);
      return true;
    } catch (error) {
      this.logger.error(`Error deleting note: ${(error as Error).message}`);
      return false;
    }
  }
}
