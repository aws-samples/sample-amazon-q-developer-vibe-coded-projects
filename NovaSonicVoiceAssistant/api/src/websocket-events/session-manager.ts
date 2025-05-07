import WebSocket from 'ws';
import { createLogger } from '../middleware/logging';
import { WebSocketSession, SessionState } from './types';
import { generateSystemPrompt } from '../services/nova-sonic/system-prompt';
import { toolRegistry } from '../tools';
import { raw } from 'express';
import { logWebSocketOutgoingEvent, getClientIdentifier, getSessionId } from '../services/nova-sonic/logging/websocket-logger';
import { ExtendedWebSocket } from '../types/websocket.types';

const logger = createLogger('SessionManager');

/**
 * Manages WebSocket sessions and their associated data
 */
export class SessionManager {
  private sessions: Map<WebSocket, WebSocketSession> = new Map();
  
  /**
   * Create a new session
   * @param ws The WebSocket connection
   * @param sessionData The NovaSonic session
   * @param user The user data
   */
  public createSession(ws: WebSocket, sessionData: any, user: any): void {
    // Generate dynamic system prompt based on available tools and user context
    const dynamicSystemPrompt = generateSystemPrompt(toolRegistry, {
      user: {
        userId: user.userId,
        username: user.username || user.userId
      }
    });
    
    this.sessions.set(ws, { 
      session: sessionData, 
      user,
      state: SessionState.CREATED,
      isFirstTurn: true,
      systemPrompt: dynamicSystemPrompt
    });
    
    // Store session data on the WebSocket object for easier access
    (ws as ExtendedWebSocket).sessionData = { 
      session: sessionData,
      user
    };
    
    // Log with userId for traceability
    logger.info(`Session created for user ${user.username || 'anonymous'}`, { userId: user.userId });
  }
  
  /**
   * Get a session
   * @param ws The WebSocket connection
   * @returns The session data or undefined if not found
   */
  public getSession(ws: WebSocket): WebSocketSession | undefined {
    return this.sessions.get(ws);
  }
  
  /**
   * Remove a session
   * @param ws The WebSocket connection
   */
  public removeSession(ws: WebSocket): void {
    const session = this.sessions.get(ws);
    if (session) {
      logger.info(`Removing session for user ${session.user.username || 'anonymous'}`, { userId: session.user.userId });
      this.sessions.delete(ws);
    }
  }
  
  /**
   * Get the number of active sessions
   */
  public getSessionCount(): number {
    return this.sessions.size;
  }
  
  /**
   * Update the session state
   * @param ws The WebSocket connection
   * @param state The new state
   */
  public updateSessionState(ws: WebSocket, state: SessionState): void {
    const session = this.sessions.get(ws);
    if (session) {
      const oldState = session.state;
      session.state = state;
      logger.info(`Session state updated: ${oldState} -> ${state}`, { userId: session.user.userId });
    }
  }
  
  /**
   * Check if the session is in a specific state
   * @param ws The WebSocket connection
   * @param state The state to check
   * @returns True if the session is in the specified state
   */
  public isSessionInState(ws: WebSocket, state: SessionState): boolean {
    const session = this.sessions.get(ws);
    return session?.state === state;
  }
  
  /**
   * Initialize a session with all required setup
   * @param ws The WebSocket connection
   * @returns A promise that resolves when the session is initialized
   */
  public async initializeSession(ws: WebSocket): Promise<void> {
    const sessionData = this.getSession(ws);
    if (!sessionData || !sessionData.session) {
      throw new Error('No active session found');
    }
    
    try {
      // Start the prompt
      logger.info('Setting up prompt start');
      await sessionData.session.setupPromptStart();
      this.updateSessionState(ws, SessionState.PROMPT_STARTED);
      
      // Set the system prompt (using the dynamically generated one)
      logger.info('Setting up dynamic system prompt');
      await sessionData.session.setupSystemPrompt(sessionData.systemPrompt);
      this.updateSessionState(ws, SessionState.SYSTEM_PROMPT_SET);
      
      logger.info('Session fully initialized');
    } catch (error) {
      this.updateSessionState(ws, SessionState.ERROR);
      throw error;
    }
  }
  
  /**
   * Start a new conversation turn
   * @param ws The WebSocket connection
   * @returns A promise that resolves when the turn is started
   */
  public async startNewTurn(ws: WebSocket): Promise<void> {
    const sessionData = this.getSession(ws);
    if (!sessionData || !sessionData.session) {
      throw new Error('No active session found');
    }
    
    try {
      // If this is not the first turn, we need to start a new prompt
      if (!sessionData.isFirstTurn) {
        logger.info('Starting new conversation turn');
        await sessionData.session.setupPromptStart();
        this.updateSessionState(ws, SessionState.PROMPT_STARTED);
        
        // Set the system prompt again (using the dynamically generated one)
        await sessionData.session.setupSystemPrompt(sessionData.systemPrompt);
        this.updateSessionState(ws, SessionState.SYSTEM_PROMPT_SET);
      }
      
      // Mark that we've used the first turn
      sessionData.isFirstTurn = false;
    } catch (error) {
      this.updateSessionState(ws, SessionState.ERROR);
      throw error;
    }
  }
  
  /**
   * Set up event handlers for a session
   * @param ws The WebSocket connection
   * @param session The NovaSonic session
   */
  public setupSessionEventHandlers(ws: WebSocket, session: any): void {
    const sessionData = this.getSession(ws);
    const sessionId = session.sessionId;
    
    // Content start event
    session.onEvent('contentStart', (eventData: any) => {
      logger.debug('Content start event:', eventData);
      
      // Skip tool-related content start events
      if (eventData.type === 'TOOL_USE' || eventData.role === 'TOOL') {
        logger.debug('Skipping tool-related content start event');
        return;
      }
      
      const message = {
        type: 'contentStart',
        data: {
          type: eventData.type,
          role: eventData.role,
          completionId:eventData.completionId,
          contentId: eventData.contentId,
          additionalModelFields:eventData.additionalModelFields,
        }
      };
      
      // Log outgoing WebSocket message with color coding
      const clientId = getClientIdentifier(ws);
      logWebSocketOutgoingEvent(clientId, 'contentStart', message.data, sessionId);
      
      ws.send(JSON.stringify(message));
    });
    
    // Text output event
    session.onEvent('textOutput', (eventData: any) => {
      logger.debug('Text output event:', eventData);
      
      const message = {
        type: 'textOutput',
        data: {
          content: eventData.content,
          role: eventData.role,
          completionId:eventData.completionId,
          contentId: eventData.contentId
        }
      };
      
      // Log outgoing WebSocket message with color coding
      const clientId = getClientIdentifier(ws);
      logWebSocketOutgoingEvent(clientId, 'textOutput', message.data, sessionId);
      
      ws.send(JSON.stringify(message));
    });
    
    // Audio output event
    session.onEvent('audioOutput', (eventData: any) => {
      logger.debug('Audio output event received');
      
      const message = {
        type: 'audioOutput',
        data: {
          content: eventData.content
        }
      };
      
      // Log outgoing WebSocket message with color coding
      const clientId = getClientIdentifier(ws);
      logWebSocketOutgoingEvent(clientId, 'audioOutput', message.data, sessionId);
      
      ws.send(JSON.stringify(message));
    });
    
    // Content end event
    session.onEvent('contentEnd', (eventData: any) => {
      logger.debug('Content end event:', eventData);
      
      // Skip tool-related content end events
      if (eventData.type === 'TOOL_USE' || eventData.role === 'TOOL') {
        logger.debug('Skipping tool-related content end event');
        return;
      }
      
      const message = {
        type: 'contentEnd',
        data: {
          type: eventData.type,
          role: eventData.role,
          completionId:eventData.completionId,
          contentId: eventData.contentId,
          stopReason:eventData.stopReason,
        }
      };
      
      // Log outgoing WebSocket message with color coding
      const clientId = getClientIdentifier(ws);
      logWebSocketOutgoingEvent(clientId, 'contentEnd', message.data, sessionId);
      
      ws.send(JSON.stringify(message));
    });
    
    // Error event
    session.onEvent('error', (eventData: any) => {
      logger.error('NovaSonic session error:', eventData);
      this.updateSessionState(ws, SessionState.ERROR);
      
      const message = {
        type: 'error',
        data: eventData
      };
      
      // Log outgoing WebSocket message with color coding
      const clientId = getClientIdentifier(ws);
      logWebSocketOutgoingEvent(clientId, 'error', message.data, sessionId);
      
      ws.send(JSON.stringify(message));
    });
    
    // Session timeout event
    session.onEvent('sessionTimeout', (eventData: any) => {
      logger.warn('Session timeout event:', eventData);
      this.updateSessionState(ws, SessionState.ERROR);
      
      const message = {
        type: 'sessionTimeout',
        data: {
          message: eventData.message,
          details: eventData.details,
          sessionId: eventData.sessionId
        }
      };
      
      // Log outgoing WebSocket message with color coding
      const clientId = getClientIdentifier(ws);
      logWebSocketOutgoingEvent(clientId, 'sessionTimeout', message.data, sessionId);
      
      ws.send(JSON.stringify(message));
      
      // Note: We're no longer closing the WebSocket connection on timeout
      // This allows the client to handle the timeout and potentially reconnect
      // without needing to establish a new WebSocket connection
    });
    
    // Tool use event
    session.onEvent('toolUse', (eventData: any) => {
      logger.info('Tool use event:', eventData);
      // ws.send(JSON.stringify({
      //   type: 'toolUse',
      //   data: eventData
      // }));
    });
    
    // Tool result event
    session.onEvent('toolResult', (eventData: any) => {
      logger.info('Tool result event:', eventData);
      // ws.send(JSON.stringify({
      //   type: 'toolResult',
      //   data: eventData
      // }));
    });
    
    // Stream complete event
    session.onEvent('streamComplete', () => {
      logger.info('Stream complete event');
      
      const message = {
        type: 'streamComplete'
      };
      
      // Log outgoing WebSocket message with color coding
      const clientId = getClientIdentifier(ws);
      logWebSocketOutgoingEvent(clientId, 'streamComplete', {}, sessionId);
      
      ws.send(JSON.stringify(message));
    });
  }
}
