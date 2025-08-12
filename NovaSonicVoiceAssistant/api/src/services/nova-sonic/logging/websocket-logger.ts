import { createLogger } from "../../../middleware/logging";
import { ExtendedWebSocket } from "../../../types/websocket.types";
import { randomUUID } from 'crypto';

// Create a specialized logger for WebSocket events
export const websocketLogger = createLogger('WebSocketEvents');

// Helper function to color-code outgoing events from server to client
export function logWebSocketOutgoingEvent(clientId: string, eventType: string, data: any, sessionId?: string): void {
  // Choose emoji based on event type
  let emoji;
  
  switch (eventType) {
    case 'welcome':
      emoji = '👋';
      break;
    case 'contentStart':
      emoji = '📂';
      break;
    case 'textOutput':
      emoji = '💬';
      break;
    case 'audioOutput':
      emoji = '🔊';
      break;
    case 'contentEnd':
      emoji = '📁';
      break;
    case 'streamComplete':
      emoji = '✅';
      break;
    case 'error':
      emoji = '❌';
      break;
    case 'sessionTimeout':
      emoji = '⏰';
      break;
    default:
      emoji = '📤';
  }
  
  // Create log object with session ID if available
  const logObject: any = { 
    clientId, 
    eventType
  };
  
  if (sessionId) {
    logObject.sessionId = sessionId;
  }
  
  // Determine the appropriate log level based on event type
  const logLevel = determineLogLevel(eventType);
  
  // For audio events, don't log the full content
  if (eventType === 'audioOutput' || eventType.toLowerCase().includes('audio')) {
    const contentLength = data?.content?.length || 0;
    logObject.contentLength = contentLength;
    
    websocketLogger[logLevel](
      logObject, 
      `${emoji} TO CLIENT: [${eventType}]${sessionId ? ` (session: ${sessionId})` : ''} (${contentLength} bytes)`
    );
  } else if (eventType === 'textOutput') {
    // For text output, log a preview of the content
    const textPreview = data?.content?.substring(0, 50) + (data?.content?.length > 50 ? '...' : '');
    logObject.contentPreview = textPreview;
    
    websocketLogger[logLevel](
      logObject, 
      `${emoji} TO CLIENT: [${eventType}]${sessionId ? ` (session: ${sessionId})` : ''} "${textPreview}"`
    );
  } else {
    // For other events, log more details but omit large data
    const logData = { ...data };
    // Remove content fields that might be too large
    if (logData?.content && typeof logData.content === 'string' && logData.content.length > 100) {
      logData.content = `[${logData.content.length} bytes]`;
    }
    
    logObject.data = logData;
    
    websocketLogger[logLevel](
      logObject, 
      `${emoji} TO CLIENT: [${eventType}]${sessionId ? ` (session: ${sessionId})` : ''}`
    );
  }
}

// Helper function to color-code incoming events from client to server
export function logWebSocketIncomingEvent(clientId: string, eventType: string, data: any, sessionId?: string): void {
  // Choose emoji based on event type
  let emoji;
  
  switch (eventType) {
    case 'START_SESSION':
      emoji = '🚀';
      break;
    case 'PROMPT_START':
      emoji = '📝';
      break;
    case 'SYSTEM_PROMPT':
      emoji = '⚙️';
      break;
    case 'AUDIO_START':
      emoji = '🎤';
      break;
    case 'AUDIO_DATA':
      emoji = '🎵';
      break;
    case 'AUDIO_STOP':
      emoji = '🛑';
      break;
    default:
      emoji = '📥';
  }
  
  // Create log object with session ID if available
  const logObject: any = { 
    clientId, 
    eventType
  };
  
  if (sessionId) {
    logObject.sessionId = sessionId;
  }
  
  // Determine the appropriate log level based on event type
  const logLevel = determineLogLevel(eventType);
  
  // For audio data, don't log the full content
  if (eventType === 'AUDIO_DATA' || eventType.toLowerCase().includes('audio')) {
    const contentLength = data?.audioData?.length || data?.audio?.length || 0;
    logObject.contentLength = contentLength;
    
    websocketLogger[logLevel](
      logObject, 
      `${emoji} FROM CLIENT: [${eventType}]${sessionId ? ` (session: ${sessionId})` : ''} (${contentLength} bytes)`
    );
  } else {
    // For other events, we can log more details
    // Remove any potentially large data fields
    const logData = { ...data };
    if (logData?.prompt && typeof logData.prompt === 'string' && logData.prompt.length > 100) {
      logData.prompt = `[${logData.prompt.length} bytes]`;
    }
    
    logObject.data = logData;
    
    websocketLogger[logLevel](
      logObject, 
      `${emoji} FROM CLIENT: [${eventType}]${sessionId ? ` (session: ${sessionId})` : ''}`
    );
  }
}

// Helper function to generate a short client identifier from WebSocket object
export function getClientIdentifier(ws: WebSocket | ExtendedWebSocket): string {
  // Try to get user information if available
  const extWs = ws as ExtendedWebSocket;
  if (extWs.user && extWs.user.userId) {
    return extWs.user.userId.substring(0, 8);
  }
  
  // Fall back to WebSocket properties
  if ((ws as any)._socket) {
    const remoteAddress = (ws as any)._socket.remoteAddress;
    const remotePort = (ws as any)._socket.remotePort;
    if (remoteAddress && remotePort) {
      return `${remoteAddress}:${remotePort}`;
    }
  }
  
  // Last resort: generate a random ID
  return `client-${randomUUID().substring(0, 8)}`;
}

// Helper function to get session ID from WebSocket session
export function getSessionId(ws: WebSocket | ExtendedWebSocket): string | undefined {
  try {
    const extWs = ws as ExtendedWebSocket;
    
    // Try to get session information if available
    if (extWs.sessionData && extWs.sessionData.session && extWs.sessionData.session.sessionId) {
      return extWs.sessionData.session.sessionId;
    }
    
    return undefined;
  } catch (e) {
    return undefined;
  }
}
/**
 * Determines the appropriate log level based on event type
 * @param eventType The event type
 * @returns The appropriate log level
 */
function determineLogLevel(eventType: string): 'trace' | 'debug' | 'info' | 'warn' | 'error' {
  // Audio-related events should be logged at trace level
  if (eventType.toLowerCase().includes('audio')) {
    return 'trace';
  }
  
  // Error events should be logged at warn level
  if (eventType.toLowerCase() === 'error') {
    return 'warn';
  }
  
  // Default to info level for all other events
  return 'info';
}
