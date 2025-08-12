import { Server as HttpServer } from 'http';
import WebSocket from 'ws';
import { NovaSonicClient } from './nova-sonic';
import { verifyToken, extractUserFromToken, parseQueryParams } from '../utils/tokenValidator';
import { createLogger } from '../middleware/logging';
import { 
  SessionManager, 
  WebSocketEventHandlerMap,
  createEventHandlers
} from '../websocket-events';
import { logWebSocketIncomingEvent, logWebSocketOutgoingEvent, getClientIdentifier, getSessionId } from './nova-sonic/logging/websocket-logger';
import { ExtendedWebSocket } from '../types/websocket.types';

const logger = createLogger('WebSocketService');

export class WebSocketService {
  private wss: WebSocket.Server | null = null;
  private clients: Set<WebSocket> = new Set();
  private sessionManager: SessionManager;
  private eventHandlers: WebSocketEventHandlerMap;
  private novaSonicClient: NovaSonicClient;
  
  constructor() {
    const AWS_REGION = process.env.AWS_REGION || 'us-east-1';
    
    try {
      this.novaSonicClient = new NovaSonicClient({
        requestHandlerConfig: {
          maxConcurrentStreams: 10,
        },
        clientConfig: {
          region: AWS_REGION,
          credentials: undefined
        }
      });
    } catch (error) {
      logger.error('Error initializing NovaSonic client with profile credentials:', error);
      logger.info('Falling back to default credential provider chain');
      
      this.novaSonicClient = new NovaSonicClient({
        requestHandlerConfig: {
          maxConcurrentStreams: 10,
        },
        clientConfig: {
          region: AWS_REGION,
          credentials: undefined as any
        }
      });
    }
    
    // Initialize session manager and event handlers
    this.sessionManager = new SessionManager();
    this.eventHandlers = createEventHandlers(this.sessionManager, this.novaSonicClient);
  }
  
  // Initialize WebSocket server
  public initialize(server: HttpServer, path: string = '/novasonic'): void {
    if (this.wss) {
      logger.info('WebSocket server already initialized');
      return;
    }
    
    // Create WebSocket server
    this.wss = new WebSocket.Server({ server, path });
    logger.info(`WebSocket server initialized with path: ${path}`);
    
    // Set up connection handler
    this.wss.on('connection', this.handleConnection.bind(this));
  }
  
  // Handle new WebSocket connections
  private async handleConnection(ws: WebSocket, req: any): Promise<void> {
    try {
      const clientIp = req.socket.remoteAddress;
      // Log only the URL path without query parameters to avoid logging sensitive tokens
      const urlPath = req.url?.split('?')[0] || '/unknown';
      
      logger.info(`WebSocket connection attempt from ${clientIp} to ${urlPath}`);
      
      // Parse query parameters to get the idToken
      const queryParams = parseQueryParams(req.url);
      const idToken = queryParams.idToken;
      
      if (!idToken) {
        logger.error('No idToken provided in WebSocket connection');
        const errorMessage = { 
          type: 'error', 
          message: 'Authentication required' 
        };
        
        // Log outgoing WebSocket message with color coding
        const clientId = getClientIdentifier(ws) || 'unauthenticated';
        logWebSocketOutgoingEvent(clientId, 'error', errorMessage);
        
        ws.send(JSON.stringify(errorMessage));
        ws.close(1008, 'Authentication required');
        return;
      }
      
      try {
        // Verify the token
        const decodedToken = await verifyToken(idToken);
        
        // Extract user information
        const user = extractUserFromToken(decodedToken);
        
        // Accept the connection
        this.acceptConnection(ws, req, user);
      } catch (error) {
        logger.error(`Token verification failed: ${(error as Error).message}`);
        const errorMessage = { 
          type: 'error', 
          message: 'Invalid credentials' 
        };
        
        // Log outgoing WebSocket message with color coding
        const clientId = getClientIdentifier(ws) || 'unauthenticated';
        logWebSocketOutgoingEvent(clientId, 'error', errorMessage);
        
        ws.send(JSON.stringify(errorMessage));
        ws.close(1008, 'Invalid credentials');
      }
    } catch (error) {
      logger.error(`Error handling WebSocket connection: ${(error as Error).message}`);
      const errorMessage = { 
        type: 'error', 
        message: 'Internal server error during authentication' 
      };
      
      // Log outgoing WebSocket message with color coding
      const clientId = getClientIdentifier(ws) || 'unauthenticated';
      logWebSocketOutgoingEvent(clientId, 'error', errorMessage);
      
      ws.send(JSON.stringify(errorMessage));
      ws.close(1011, 'Internal server error');
    }
  }
  
  // Accept authenticated connection
  private acceptConnection(ws: WebSocket, req: any, user: any): void {
    // Add client to set
    this.clients.add(ws);
    
    // Store user information in session manager
    this.sessionManager.createSession(ws, null, user);
    
    logger.info(`Client connected. User: ${user.username || 'anonymous'}. Total clients: ${this.clients.size}`, { userId: user.userId });
    
    // Send welcome message
    const welcomeMessage = { 
      type: 'welcome', 
      message: 'Connected to NovaSonic WebSocket Server',
      user: {
        userId: user.userId,
        username: user.username
      }
    };
    
    // Store user info on the WebSocket object for later use
    (ws as ExtendedWebSocket).user = user;
    
    // Log outgoing WebSocket message with color coding
    const clientId = getClientIdentifier(ws);
    logWebSocketOutgoingEvent(clientId, 'welcome', welcomeMessage);
    
    ws.send(JSON.stringify(welcomeMessage));
    
    // Set up message handler
    ws.on('message', (message) => this.handleMessage(ws, message));
    
    // Set up close handler
    ws.on('close', () => this.handleClose(ws));
  }
  
  // Handle WebSocket messages
  private async handleMessage(ws: WebSocket, message: any): Promise<void> {
    try {
      const data = JSON.parse(message.toString());
      
      // Log incoming WebSocket message
      const clientId = getClientIdentifier(ws);
      const sessionId = getSessionId(ws) || this.sessionManager.getSession(ws)?.session?.sessionId;
      logWebSocketIncomingEvent(clientId, data.type, data, sessionId);
      
      // Find the appropriate handler for this event type
      const handler = this.eventHandlers[data.type];
      
      if (handler) {
        await handler.handle(ws, data);
      } else {
        logger.warn(`Unknown message type: ${data.type}`);
        const errorMessage = {
          type: 'error',
          message: `Unknown message type: ${data.type}`
        };
        
        // Log outgoing WebSocket message with color coding
        const clientId = getClientIdentifier(ws);
        const sessionId = getSessionId(ws) || this.sessionManager.getSession(ws)?.session?.sessionId;
        logWebSocketOutgoingEvent(clientId, 'error', errorMessage, sessionId);
        
        ws.send(JSON.stringify(errorMessage));
      }
    } catch (error) {
      logger.error('Error processing message:', error);
      const errorMessage = {
        type: 'error',
        message: 'Error processing message',
        details: error instanceof Error ? error.message : String(error)
      };
      
      // Log outgoing WebSocket message with color coding
      const clientId = getClientIdentifier(ws);
      const sessionId = getSessionId(ws) || this.sessionManager.getSession(ws)?.session?.sessionId;
      logWebSocketOutgoingEvent(clientId, 'error', errorMessage, sessionId);
      
      ws.send(JSON.stringify(errorMessage));
    }
  }
  
  // Handle connection close
  private handleClose(ws: WebSocket): void {
    // Get session before removing it
    const session = this.sessionManager.getSession(ws);
    
    // Clean up session if exists
    if (session && session.session) {
      logger.info('Closing session on disconnect');
      session.session.close().catch((error: Error) => {
        logger.error('Error closing session:', error);
      });
    }
    
    // Remove session from manager
    this.sessionManager.removeSession(ws);
    
    // Remove from clients set
    this.clients.delete(ws);
    
    // Log disconnection
    if (session && session.user) {
      logger.info(`User ${session.user.username || 'anonymous'} disconnected. Total clients: ${this.clients.size}`, { userId: session.user.userId });
    } else {
      logger.info(`Client disconnected. Total clients: ${this.clients.size}`);
    }
  }
  
  // Get status for internal use only
  // This method is no longer exposed via API endpoints
  private getStatus(): { clients: number, sessions: number } {
    return {
      clients: this.clients.size,
      sessions: this.sessionManager.getSessionCount()
    };
  }
}

// Create a singleton instance
export const websocketService = new WebSocketService();
