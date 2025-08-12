import WebSocket from 'ws';
import { BaseEventHandler } from '../base-handler';
import { SessionManager } from '../session-manager';
import { NovaSonicClient } from '../../services/nova-sonic-service';
import { SessionContext } from '../../types/novasonic.types';
import { SessionState } from '../types';

/**
 * Handler for startSession events
 * Enhanced to automatically initialize the session with all required setup
 */
export class StartSessionHandler extends BaseEventHandler {
  constructor(
    private sessionManager: SessionManager,
    private novaSonicClient: NovaSonicClient
  ) {
    super();
  }
  
  /**
   * Parse chat history from the content field
   * @param content The content string containing chat history
   * @returns Array of parsed messages with content and role
   */
  private parseChatHistory(content: string): Array<{content: string, role: string}> {
    if (!content || typeof content !== 'string') {
      return [];
    }
    
    const messages: Array<{content: string, role: string}> = [];
    const lines = content.split('\n');
    
    for (const line of lines) {
      // Skip empty lines
      if (!line.trim()) continue;
      
      // Parse "User: message" or "Assistant: message" format
      const match = line.match(/^(User|Assistant):\s*(.*)/i);
      if (match) {
        const role = match[1].toLowerCase() === 'user' ? 'User' : 'Assistant';
        const content = match[2].trim();
        
        if (content) {
          messages.push({ content, role });
        }
      }
    }
    
    return messages;
  }
  
  /**
   * Handle a startSession event
   * @param ws The WebSocket connection
   * @param data The event data
   */
  public async handle(ws: WebSocket, data: any): Promise<void> {
    try {
      const sessionId = data.sessionId || `session-${Date.now()}`;
      const wsSession = this.sessionManager.getSession(ws);
      
      if (!wsSession || !wsSession.user) {
        this.sendError(ws, 'No authenticated user session found');
        return;
      }
      this.logger.info(`Creating new NovaSonic session: ${sessionId}`);
      
      // Create session context
      const sessionContext: SessionContext = {
        user: {
          userId: wsSession.user.userId,
          username: wsSession.user.username || wsSession.user.userId
        }
      };
      
      // Create the session with context
      const novaSonicSession = this.novaSonicClient.createStreamSession(
        sessionId, 
        sessionContext
      );
      
      // Update the session with the NovaSonic session
      this.sessionManager.createSession(ws, novaSonicSession, wsSession.user);
      
      // Set up event handlers
      this.sessionManager.setupSessionEventHandlers(ws, novaSonicSession);
      
      // Send confirmation to client immediately to prevent timeout
      this.logger.info('Sending session started confirmation');
      this.sendResponse(ws, 'sessionStarted', { sessionId });
      
      // Update session state
      this.sessionManager.updateSessionState(ws, SessionState.INITIALIZED);
      
      // Start the bidirectional stream in the background
      this.logger.info('Initiating session in the background');
      this.novaSonicClient.initiateSession(sessionId).catch(error => {
        this.logger.error('Error initiating session:', error);
        this.sendError(ws, 'Failed to initialize NovaSonic session', error instanceof Error ? error.message : String(error));
      });
      
      // Automatically initialize the session with prompt start and system prompt
      this.logger.info('Automatically initializing session with prompt start and system prompt');
      await this.sessionManager.initializeSession(ws);
      
      // Check if chat history was provided in the content field
      if (data.content) {
        this.logger.info('Chat history provided, setting up conversation resumption');
        
        try {
          // Parse the chat history
          const messages = this.parseChatHistory(data.content);
          
          if (messages.length > 0) {
            this.logger.info(`Adding ${messages.length} messages to conversation history`);
            
            // Add the messages to the session
            await novaSonicSession.addHistoryMessages(messages);
            
            this.logger.info('Chat history added successfully');
          }
        } catch (historyError) {
          this.logger.error('Error adding chat history:', historyError);
          // Continue with session setup even if history fails
        }
      }
      
      // Send session ready notification to client
      this.sendResponse(ws, 'sessionReady', { 
        message: 'Session is ready for audio input',
        state: SessionState.SYSTEM_PROMPT_SET
      });
      
    } catch (error) {
      this.sendError(
        ws, 
        'Failed to start NovaSonic session', 
        error instanceof Error ? error.message : String(error)
      );
    }
  }
}
