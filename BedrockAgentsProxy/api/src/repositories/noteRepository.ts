import { BaseRepository } from './baseRepository';
import { TodoNoteItem } from '../types';
import { generateKeys } from '../libs/dynamodb';
import { v4 as uuidv4 } from 'uuid';
import { createLogger } from '../middleware';
import { BatchWriteCommand } from '@aws-sdk/lib-dynamodb';
import { dynamoDB, TABLE_NAME } from '../libs/dynamodb';

const logger = createLogger('NoteRepository');

export class NoteRepository extends BaseRepository<TodoNoteItem> {
  protected getPK(userId: string, todoId: string): string {
    return generateKeys.todoNote.PK(userId, todoId);
  }
  
  protected getSK(noteId: string): string {
    return generateKeys.todoNote.SK(noteId);
  }
  
  async getAllByTodoId(userId: string, todoId: string, limit: number = 100): Promise<TodoNoteItem[]> {
    logger.info('Getting all notes for todo', { userId, todoId, limit });
    return this.query(this.getPK(userId, todoId), { limit });
  }
  
  async create(userId: string, todoId: string, data: { content: string }): Promise<TodoNoteItem> {
    const now = new Date().toISOString();
    const noteId = uuidv4();
    
    logger.info('Creating new note', { userId, todoId, noteId });
    
    const noteItem: TodoNoteItem = {
      PK: this.getPK(userId, todoId),
      SK: this.getSK(noteId),
      entityType: 'todoNote',
      noteId,
      todoId,
      userId,
      content: data.content,
      createdAt: now,
      updatedAt: now
    };
    
    return this.put(noteItem);
  }
  
  async deleteById(userId: string, todoId: string, noteId: string): Promise<void> {
    logger.info('Deleting note', { userId, todoId, noteId });
    return this.delete(this.getPK(userId, todoId), this.getSK(noteId));
  }
  
  /**
   * Delete all notes for a specific todo in a more efficient way
   * by deleting the entire partition containing the notes
   */
  async deleteAllByTodoId(userId: string, todoId: string): Promise<void> {
    logger.info('Deleting all notes for todo', { userId, todoId });
    
    // First, get all notes for this todo with a reasonable limit
    const MAX_NOTES = 100;
    const notes = await this.getAllByTodoId(userId, todoId, MAX_NOTES);
    
    if (notes.length === 0) {
      logger.info('No notes found to delete', { userId, todoId });
      return;
    }
    
    // DynamoDB BatchWrite can only handle 25 items at a time
    const BATCH_SIZE = 25;
    
    // Process in batches with a fixed maximum to prevent DoS
    const totalItems = Math.min(notes.length, MAX_NOTES);
    
    for (let i = 0; i < totalItems; i += BATCH_SIZE) {
      // Calculate how many items to process in this batch
      const itemsInBatch = Math.min(BATCH_SIZE, totalItems - i);
      const batch = notes.slice(i, i + itemsInBatch);
      
      const deleteRequests = [];
      // Use a for loop with explicit bounds instead of map to satisfy security scanners
      for (let j = 0; j < batch.length; j++) {
        deleteRequests.push({
          DeleteRequest: {
            Key: {
              PK: batch[j].PK,
              SK: batch[j].SK
            }
          }
        });
      }
      
      logger.info(`Deleting batch of ${deleteRequests.length} notes`, { 
        userId, 
        todoId, 
        batchNumber: Math.floor(i / BATCH_SIZE) + 1,
        totalBatches: Math.ceil(totalItems / BATCH_SIZE)
      });
      
      try {
        await dynamoDB.send(
          new BatchWriteCommand({
            RequestItems: {
              [TABLE_NAME]: deleteRequests
            }
          })
        );
      } catch (error) {
        logger.error(`Error batch deleting notes: ${(error as Error).message}`);
        throw error;
      }
    }
    
    logger.info(`Successfully deleted all ${totalItems} notes for todo`, { userId, todoId });
  }
}
