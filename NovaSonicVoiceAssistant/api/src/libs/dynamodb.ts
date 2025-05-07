import { DynamoDBClient } from '@aws-sdk/client-dynamodb';
import { DynamoDBDocumentClient } from '@aws-sdk/lib-dynamodb';

// Get the table name from environment variables
export const TABLE_NAME = process.env.TABLE_NAME || 'nova-todo-list-table';

// Create DynamoDB client with region configuration
const client = new DynamoDBClient({
  region: process.env.AWS_REGION || 'us-east-1', // Default to us-east-1 if not specified
});

// Create DynamoDB Document client
export const dynamoDB = DynamoDBDocumentClient.from(client);

// Helper functions for generating DynamoDB keys
export const generateKeys = {
  todo: {
    PK: (userId: string) => `user#${userId}#todo`,
    SK: (todoId: string) => `todo#${todoId}`,
  },
  todoNote: {
    PK: (userId: string, todoId: string) => `user#${userId}#todo#${todoId}#notes`,
    SK: (noteId: string) => `note#${noteId}`,
  }
};
