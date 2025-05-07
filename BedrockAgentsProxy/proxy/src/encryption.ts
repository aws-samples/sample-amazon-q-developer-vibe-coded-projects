import { 
  KMSClient, 
  DecryptCommand
} from '@aws-sdk/client-kms';
import { DynamoDBClient } from '@aws-sdk/client-dynamodb';
import { DynamoDBDocumentClient, GetCommand } from '@aws-sdk/lib-dynamodb';

// Initialize clients
const kmsClient = new KMSClient({});
const ddbClient = new DynamoDBClient({});
const ddbDocClient = DynamoDBDocumentClient.from(ddbClient);

// Get the KMS key ID from environment variables
const keyId = process.env.KMS_KEY_ID;
const tableName = process.env.TABLE_NAME || 'smart-todo-list-table';

/**
 * Retrieves a token for a user from DynamoDB
 * @param userId The user ID
 * @param tokenId The token ID
 * @returns The token from DynamoDB
 */
export async function retrieveUserToken(userId: string, tokenId: string): Promise<string> {
  try {
    if (!userId || !tokenId) {
      throw new Error('User ID and token ID are required');
    }
    
    console.log(`Retrieving token for user ${userId} with token ID ${tokenId}`);
    
    // Retrieve the token from DynamoDB
    const response = await ddbDocClient.send(new GetCommand({
      TableName: tableName,
      Key: {
        PK: `user#${userId}#token`,
        SK: `token#${tokenId}`
      }
    }));
    
    console.log('DynamoDB response:', JSON.stringify(response));
    
    if (!response.Item) {
      throw new Error('Token not found');
    }
    
    // Handle encrypted token - check for encryptedToken field (not token)
    if (!response.Item.encryptedToken) {
      throw new Error('Encrypted token data is missing');
    }
    
    console.log('Token retrieved successfully');
    
    return response.Item.encryptedToken;
  } catch (error) {
    console.error('Error retrieving token', { 
      userId, 
      tokenId, 
      error: (error as Error).message,
      stack: (error as Error).stack
    });
    throw new Error('Failed to retrieve token');
  }
}

/**
 * Decrypts an encrypted token using KMS
 * @param encryptedTokenValue The encrypted token value
 * @returns The decrypted token
 */
export async function decryptToken(encryptedToken: string, userId: string, tokenId: string): Promise<string> {
  try {
    if (!encryptedToken) {
      throw new Error('Encrypted token is required');
    }
    
    // Check if KMS key ID is available
    if (!keyId || keyId.trim() === '') {
      console.error('Cannot decrypt token - KMS key not configured');
      throw new Error('KMS key not configured');
    }
    
    console.log(`Decrypting token for user ${userId}`);
    
    const encryptedData = Buffer.from(encryptedToken, 'base64');
    const encryptionContext = {
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
    
    console.log('Token decrypted successfully');
    
    return plaintext;
  } catch (error) {
    console.error('Error decrypting token', { 
      userId,
      error: (error as Error).message,
      stack: (error as Error).stack
    });
    throw new Error('Failed to decrypt token');
  }
}

/**
 * Retrieves and decrypts a user token
 * @param userId The user ID
 * @param tokenId The token ID
 * @returns The decrypted token
 */
export async function retrieveAndDecryptUserToken(userId: string, tokenId: string): Promise<string> {
  // First retrieve the encrypted token from DynamoDB
  const encryptedToken = await retrieveUserToken(userId, tokenId);
  
  // Then decrypt it using KMS
  return await decryptToken(encryptedToken, userId, tokenId);
}
