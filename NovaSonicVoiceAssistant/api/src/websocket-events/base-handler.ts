import WebSocket from 'ws';
import { createLogger } from '../middleware/logging';
import { WebSocketEventHandler } from './types';
import { logWebSocketOutgoingEvent, getClientIdentifier, getSessionId } from '../services/nova-sonic/logging/websocket-logger';
import { ExtendedWebSocket } from '../types/websocket.types';

/**
 * Base class for WebSocket event handlers
 */
export abstract class BaseEventHandler implements WebSocketEventHandler {
  protected logger = createLogger(this.constructor.name);
  
  /**
   * Handle a WebSocket event
   * @param ws The WebSocket connection
   * @param data The event data
   */
  public abstract handle(ws: WebSocket, data: any): Promise<void>;
  
  /**
   * Send a response to the client
   * @param ws The WebSocket connection
   * @param type The response type
   * @param data The response data
   */
  protected sendResponse(ws: WebSocket, type: string, data?: any): void {
    const response = {
      type,
      ...(data ? { data } : {})
    };
    
    // Log outgoing WebSocket message
    const clientId = getClientIdentifier(ws);
    const sessionId = getSessionId(ws);
    logWebSocketOutgoingEvent(clientId, type, response, sessionId);
    
    ws.send(JSON.stringify(response));
  }
  
  /**
   * Send an error response to the client
   * @param ws The WebSocket connection
   * @param message The error message
   * @param details Additional error details
   */
  protected sendError(ws: WebSocket, message: string, details?: string): void {
    this.logger.error(`Error: ${message}${details ? ` - ${details}` : ''}`);
    
    const errorResponse = {
      type: 'error',
      message,
      ...(details ? { details } : {})
    };
    
    // Log outgoing WebSocket message
    const clientId = getClientIdentifier(ws);
    const sessionId = getSessionId(ws);
    logWebSocketOutgoingEvent(clientId, 'error', errorResponse, sessionId);
    
    ws.send(JSON.stringify(errorResponse));
  }
}
