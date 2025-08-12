import { 
  KMSClient, 
  EncryptCommand, 
  DecryptCommand,
  DescribeKeyCommand 
} from '@aws-sdk/client-kms';
import { DynamoDBClient } from '@aws-sdk/client-dynamodb';
import { DynamoDBDocumentClient, PutCommand, GetCommand, DeleteCommand } from '@aws-sdk/lib-dynamodb';
import { v4 as uuidv4 } from 'uuid';
import { createLogger } from '../middleware';

const logger = createLogger('TokenEncryption');

// Initialize clients
const kmsClient = new KMSClient({});
const ddbClient = new DynamoDBClient({});
const ddbDocClient = DynamoDBDocumentClient.from(ddbClient);

// Get the KMS key ID from environment variables
const keyId = process.env.KMS_KEY_ID;
const tableName = process.env.TABLE_NAME || 'smart-todo-list-table';

// Log KMS key ID at startup
logger.info(`KMS Key ID from environment: ${keyId || 'NOT SET'}`);

// Check KMS permissions at startup
async function checkKmsPermissions() {
  if (!keyId || keyId.trim() === '') {
    logger.error('KMS_KEY_ID environment variable is not set or empty');
    return;
  }

  try {
    // Try to describe the key to check permissions
    await kmsClient.send(new DescribeKeyCommand({
      KeyId: keyId
    }));
    logger.info(`Successfully verified KMS key permissions for key: ${keyId}`);
  } catch (error) {
    logger.error(`Failed to access KMS key ${keyId}: ${(error as Error).message}`);
    logger.error(`Stack trace: ${(error as Error).stack}`);
    logger.error('Encryption will fail until KMS permissions are fixed');
  }
}

// Call this function at startup
checkKmsPermissions().catch(err => {
  logger.error(`Error during KMS permission check: ${err.message}`);
});

/**
 * Encrypts a user token and stores the encrypted data in DynamoDB
 * @param userId The user ID
 * @param token The token to encrypt
 * @returns The token ID that can be used to retrieve the token later
 * @throws Error if encryption fails
 */
export async function encryptAndStoreToken(userId: string, token: string): Promise<string> {
  // Check if KMS key ID is available
  if (!keyId || keyId.trim() === '') {
    logger.error(`Cannot encrypt token - KMS key not configured`);
    throw new Error('KMS key not configured');
  }
  
  // Create a unique ID for the token
  const tokenId = uuidv4();
  
  try {
    // Create encryption context
    const encryptionContext = {
      userId,
      tokenId,
      purpose: 'bedrock-agent-auth'
    };
    
    const encryptResult = await kmsClient.send(new EncryptCommand({
      KeyId: keyId,
      Plaintext: Buffer.from(token),
      EncryptionContext: encryptionContext
    }));
    
    if (!encryptResult.CiphertextBlob) {
      throw new Error('KMS encryption returned no ciphertext');
    }
    
    // Calculate expiration time (2 minutes from now)
    const expirationTime = new Date();
    expirationTime.setMinutes(expirationTime.getMinutes() + 2);
    const expiresAt = Math.floor(expirationTime.getTime() / 1000); // TTL expects seconds since epoch
    
    // Store the encrypted token in DynamoDB with TTL
    await ddbDocClient.send(new PutCommand({
      TableName: tableName,
      Item: {
        PK: `user#${userId}#token`,
        SK: `token#${tokenId}`,
        encryptedToken: Buffer.from(encryptResult.CiphertextBlob).toString('base64'),
        encryptionContext: encryptionContext,
        createdAt: new Date().toISOString(),
        expiresAt: expiresAt // TTL attribute for automatic deletion after 2 minutes
      }
    }));
    
    logger.info(`Token encrypted and stored successfully for user ${userId} with tokenId ${tokenId}`);
    
    return tokenId;
  } catch (error) {
    logger.error(`Encryption error for user ${userId}: ${(error as Error).message}`);
    logger.error(`Stack trace: ${(error as Error).stack}`);
    throw new Error('Failed to encrypt token');
  }
}

/**
 * Deletes a user token from DynamoDB
 * @param userId The user ID
 * @param tokenId The token ID
 * @returns Promise<void>
 * @throws Error if deletion fails
 */
export async function deleteToken(userId: string, tokenId: string): Promise<void> {
  try {
    if (!userId || !tokenId) {
      throw new Error('User ID and token ID are required');
    }
    
    logger.info(`Deleting token for user ${userId} with token ID ${tokenId}`);
    
    // Delete the token from DynamoDB
    await ddbDocClient.send(new DeleteCommand({
      TableName: tableName,
      Key: {
        PK: `user#${userId}#token`,
        SK: `token#${tokenId}`
      }
    }));
    
    logger.info(`Token deleted successfully for user ${userId} with tokenId ${tokenId}`);
  } catch (error) {
    logger.error(`Error deleting token for user ${userId}: ${(error as Error).message}`);
    logger.error(`Stack trace: ${(error as Error).stack}`);
    throw new Error('Failed to delete token');
  }
}

/**
 * Retrieves and decrypts a user token from DynamoDB
 * @param userId The user ID
 * @param tokenId The token ID
 * @returns The decrypted token
 * @throws Error if decryption fails
 */
export async function retrieveAndDecryptToken(userId: string, tokenId: string): Promise<string> {
  // Check if KMS key ID is available
  if (!keyId || keyId.trim() === '') {
    logger.error(`Cannot decrypt token - KMS key not configured`);
    throw new Error('KMS key not configured');
  }
  
  try {
    // Retrieve the token from DynamoDB
    const response = await ddbDocClient.send(new GetCommand({
      TableName: tableName,
      Key: {
        PK: `user#${userId}#token`,
        SK: `token#${tokenId}`
      }
    }));
    
    if (!response.Item) {
      throw new Error('Token not found');
    }
    
    // Handle encrypted token
    if (!response.Item.encryptedToken) {
      throw new Error('Token data is missing');
    }
    
    const encryptedData = Buffer.from(response.Item.encryptedToken, 'base64');
    const encryptionContext = response.Item.encryptionContext || {
      userId,
      tokenId,
      purpose: 'bedrock-agent-auth'
    };
    
    // Decrypt the token directly using KMS
    const decryptResult = await kmsClient.send(new DecryptCommand({
      CiphertextBlob: encryptedData,
      EncryptionContext: encryptionContext,
      KeyId: keyId // Optional but recommended to verify the key
    }));
    
    if (!decryptResult.Plaintext) {
      throw new Error('KMS decryption returned no plaintext');
    }
    
    const plaintext = Buffer.from(decryptResult.Plaintext).toString();
    
    logger.info(`Token retrieved and decrypted successfully for user ${userId} with tokenId ${tokenId}`);
    
    return plaintext;
  } catch (error) {
    logger.error(`Decryption error for user ${userId}: ${(error as Error).message}`);
    logger.error(`Stack trace: ${(error as Error).stack}`);
    throw new Error('Failed to decrypt token');
  }
}
