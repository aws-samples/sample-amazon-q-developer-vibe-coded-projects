import { 
  QueryCommand, 
  PutCommand, 
  GetCommand, 
  UpdateCommand, 
  DeleteCommand 
} from '@aws-sdk/lib-dynamodb';
import { dynamoDB, TABLE_NAME } from '../libs/dynamodb';
import { createLogger } from '../middleware';

const logger = createLogger('BaseRepository');

export abstract class BaseRepository<T extends Record<string, any>> {
  constructor(protected readonly tableName: string = TABLE_NAME) {
    if (!this.tableName) {
      throw new Error('TABLE_NAME is not defined');
    }
  }

  protected abstract getPK(...args: any[]): string;
  protected abstract getSK(...args: any[]): string;
  
  async query(pkValue: string, options?: { 
    skBeginsWith?: string,
    indexName?: string,
    limit?: number,
    filterExpression?: string,
    expressionAttributeNames?: Record<string, string>,
    additionalExpressionAttributeValues?: Record<string, any>
  }): Promise<T[]> {
    let keyConditionExpression = 'PK = :pk';
    let expressionAttributeValues: Record<string, any> = { ':pk': pkValue };
    
    if (options?.skBeginsWith) {
      keyConditionExpression += ' AND begins_with(SK, :skPrefix)';
      expressionAttributeValues[':skPrefix'] = options.skBeginsWith;
    }

    if (options?.additionalExpressionAttributeValues) {
      expressionAttributeValues = {
        ...expressionAttributeValues,
        ...options.additionalExpressionAttributeValues
      };
    }
    
    logger.debug(`Querying DynamoDB table ${this.tableName} with keyCondition: ${keyConditionExpression}, indexName: ${options?.indexName || 'none'}`);

    try {
      const result = await dynamoDB.send(
        new QueryCommand({
          TableName: this.tableName,
          IndexName: options?.indexName,
          KeyConditionExpression: keyConditionExpression,
          FilterExpression: options?.filterExpression,
          ExpressionAttributeNames: options?.expressionAttributeNames,
          ExpressionAttributeValues: expressionAttributeValues,
          Limit: options?.limit
        })
      );
      
      return (result.Items || []) as T[];
    } catch (error) {
      logger.error(`Error querying DynamoDB: ${(error as Error).message}`);
      logger.error(`Stack trace: ${(error as Error).stack}`);
      throw error;
    }
  }
  
  async get(pkValue: string, skValue: string): Promise<T | null> {
    try {
      const result = await dynamoDB.send(
        new GetCommand({
          TableName: this.tableName,
          Key: { 
            PK: pkValue,
            SK: skValue
          }
        })
      );
      
      return result.Item as T || null;
    } catch (error) {
      logger.error(`Error getting item from DynamoDB: ${(error as Error).message}`);
      logger.error(`Stack trace: ${(error as Error).stack}`);
      throw error;
    }
  }
  
  async put(item: T): Promise<T> {
    logger.debug(`Putting item in DynamoDB table ${this.tableName}`);

    try {
      await dynamoDB.send(
        new PutCommand({
          TableName: this.tableName,
          Item: item
        })
      );
      
      return item;
    } catch (error) {
      logger.error(`Error putting item in DynamoDB: ${(error as Error).message}`);
      logger.error(`Stack trace: ${(error as Error).stack}`);
      throw error;
    }
  }
  
  async update(pkValue: string, skValue: string, updates: Record<string, any>): Promise<T> {
    const updateExpressions: string[] = [];
    const expressionAttributeNames: Record<string, string> = {};
    const expressionAttributeValues: Record<string, any> = {};
    
    // Add updatedAt timestamp
    updateExpressions.push('#updatedAt = :updatedAt');
    expressionAttributeNames['#updatedAt'] = 'updatedAt';
    expressionAttributeValues[':updatedAt'] = new Date().toISOString();
    
    // Add other updates
    Object.entries(updates).forEach(([key, value]) => {
      if (value !== undefined) {
        updateExpressions.push(`#${key} = :${key}`);
        expressionAttributeNames[`#${key}`] = key;
        expressionAttributeValues[`:${key}`] = value;
      }
    });

    if (updateExpressions.length === 0) {
      throw new Error('No updates provided');
    }
    try {
      const result = await dynamoDB.send(
        new UpdateCommand({
          TableName: this.tableName,
          Key: { 
            PK: pkValue,
            SK: skValue
          },
          UpdateExpression: `SET ${updateExpressions.join(', ')}`,
          ExpressionAttributeNames: expressionAttributeNames,
          ExpressionAttributeValues: expressionAttributeValues,
          ReturnValues: 'ALL_NEW'
        })
      );
      
      return result.Attributes as T;
    } catch (error) {
      logger.error(`Error updating item in DynamoDB: ${(error as Error).message}`);
      logger.error(`Stack trace: ${(error as Error).stack}`);
      throw error;
    }
  }
  
  async delete(pkValue: string, skValue: string): Promise<void> {
    try {
      await dynamoDB.send(
        new DeleteCommand({
          TableName: this.tableName,
          Key: { 
            PK: pkValue,
            SK: skValue
          }
        })
      );
    } catch (error) {
      logger.error(`Error deleting item from DynamoDB: ${(error as Error).message}`);
      logger.error(`Stack trace: ${(error as Error).stack}`);
      throw error;
    }
  }
}
