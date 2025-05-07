/**
 * Base type definitions for DynamoDB items
 */

export interface DynamoDBItem {
  PK: string;
  SK: string;
  entityType: string;
  createdAt: string;
  updatedAt: string;
}
