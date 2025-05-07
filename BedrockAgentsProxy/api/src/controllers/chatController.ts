import { Request, Response } from 'express';
import { createLogger, asyncHandler, ApiError } from '../middleware';
import { BedrockAgentRuntimeClient, InvokeAgentCommand } from "@aws-sdk/client-bedrock-agent-runtime";
import { encryptAndStoreToken, deleteToken } from '../libs/encryption';

// Create a logger for the chat controller
const logger = createLogger('ChatController');

// Create a Bedrock Agent Runtime client
const bedrockClient = new BedrockAgentRuntimeClient({ 
  region: process.env.AWS_REGION || 'us-east-1'
});

/**
 * Handle chat messages from users by invoking the Bedrock Agent
 */
export const handleChatMessage = asyncHandler(async (req: Request, res: Response) => {
  // Get Agent ID and Agent Alias ID from environment variables at runtime
  const AGENT_ID = process.env.BEDROCK_AGENT_ID;
  const AGENT_ALIAS_ID = process.env.BEDROCK_AGENT_ALIAS_ID;
  
  console.log('==== BEDROCK AGENT CONFIG IN HANDLER ====');
  console.log(`Bedrock Agent ID: ${AGENT_ID}`);
  console.log(`Bedrock Agent Alias ID: ${AGENT_ALIAS_ID}`);
  console.log(`AWS Region: ${process.env.AWS_REGION}`);
  console.log('=========================================');
  
  if (!req.user) {
    throw new ApiError(401, 'User not authenticated');
  }

  const userId = req.user.userId;
  const authToken = req.headers.authorization?.replace('Bearer ', '') || '';
  const { message, sessionId: clientSessionId, sessionAttributes = {} } = req.body;
  
  logger.info(`Received chat message from user, path: ${req.path}`);
  
  if (!message) {
    throw new ApiError(400, 'Message is required');
  }

  if (!AGENT_ID || !AGENT_ALIAS_ID) {
    logger.error(`Bedrock Agent configuration missing. AGENT_ID: ${AGENT_ID}, AGENT_ALIAS_ID: ${AGENT_ALIAS_ID}`);
    throw new ApiError(500, 'Bedrock Agent not configured');
  }

  // Variable to store the token ID for later deletion
  let tokenId = '';

  try {
    // Use the client-provided session ID if available, otherwise create a new one
    // This helps maintain conversation context across multiple requests
    const sessionId = clientSessionId || `session-${userId}-${Date.now()}`;
    
    // Sanitize the session ID to prevent injection
    const sanitizedSessionId = sanitizeId(sessionId);
    
    // Encrypt and store the auth token, get a token ID
    if (authToken) {
      try {
        tokenId = await encryptAndStoreToken(userId, authToken);
        logger.info(`Token stored with ID: ${tokenId}`);
      } catch (error) {
        logger.error(`Failed to encrypt auth token: ${(error as Error).message}`);
        // Continue without the token if encryption fails
      }
    }
    
    // Prepare the input for the Bedrock Agent
    const input = {
      agentId: AGENT_ID,
      agentAliasId: AGENT_ALIAS_ID,
      sessionId: sanitizedSessionId,
      inputText: message,
      sessionState: {
        sessionAttributes: sessionAttributes, // Include client-provided session attributes
        promptSessionAttributes: {
          userId: userId,
          tokenId: tokenId // Include the token ID in the session attributes
        }
      },
      enableTrace: true,
      enableMemory: true, // Enable Bedrock's built-in memory
      endSession: false, // Keep the session alive
    };

    logger.info(`Invoking Bedrock Agent with sessionId ${sanitizedSessionId}`);

    // Create the command to invoke the agent
    const command = new InvokeAgentCommand(input);
     
    // Send the command and process the streaming response
    let completion = "";
    const response = await bedrockClient.send(command);
    
    // Process the streaming response
    if (response.completion) {
      for await (const chunkEvent of response.completion) {
        if (chunkEvent.chunk && chunkEvent.chunk.bytes) {
          const decodedResponse = new TextDecoder("utf-8").decode(chunkEvent.chunk.bytes);
          completion += decodedResponse;
        }
      }
    }

    logger.info(`Bedrock Agent response received, status: 200`);

    // The InvokeAgentCommandOutput doesn't have sessionState property in the type definition
    // We'll use an empty object as default for session attributes
    const returnedSessionAttributes = {};

    // Delete the token after receiving the response
    if (tokenId) {
      try {
        logger.info(`Deleting token with ID: ${tokenId} for user: ${userId}`);
        await deleteToken(userId, tokenId);
        logger.info(`Token deleted successfully`);
      } catch (deleteError) {
        logger.error(`Failed to delete token: ${(deleteError as Error).message}`);
        // Continue with the response even if token deletion fails
      }
    }

    // Return the agent's response with session information
    return res.status(200).json({
      message: completion,
      timestamp: new Date().toISOString(),
      sessionId: sanitizedSessionId,
      sessionAttributes: returnedSessionAttributes
    });
  } catch (error: unknown) {
    // Convert error to a type with name and message properties
    const err = error as { name?: string; message?: string; stack?: string };
    
    logger.error(`Error invoking Bedrock Agent: ${err.message || 'Unknown error'}, Error type: ${err.name || 'Unknown error type'}`);
    
    // Try to delete the token even if the API call failed
    if (tokenId) {
      try {
        logger.info(`Deleting token after error with ID: ${tokenId} for user: ${userId}`);
        await deleteToken(userId, tokenId);
        logger.info(`Token deleted successfully after error`);
      } catch (deleteError) {
        logger.error(`Failed to delete token after error: ${(deleteError as Error).message}`);
        // Continue with the error response even if token deletion fails
      }
    }
    
    if (err.name === 'ValidationException') {
      throw new ApiError(400, `Bedrock Agent validation error: ${err.message || 'Unknown error'}`);
    } else if (err.name === 'AccessDeniedException') {
      throw new ApiError(403, 'Access denied to Bedrock Agent');
    } else if (err.name === 'ResourceNotFoundException') {
      throw new ApiError(404, 'Bedrock Agent or alias not found');
    } else if (err.name === 'ThrottlingException') {
      throw new ApiError(429, 'Too many requests to Bedrock Agent');
    } else {
      throw new ApiError(500, `Error communicating with Bedrock Agent: ${err.message || 'Unknown error'}`);
    }
  }
});

/**
 * Sanitize an ID to prevent injection attacks
 */
function sanitizeId(id: string): string {
  if (typeof id !== 'string' || id.length === 0 || id.length > 1024) {
    throw new ApiError(400, 'Invalid session ID');
  }
  
  return id
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#039;");
}
