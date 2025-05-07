/**
 * WebSocket client for real-time communication
 */
import { fetchAuthSession } from '@aws-amplify/auth';
import { logServerEventIfEnabled } from './ServerEventsLogHandler';

// Determine the WebSocket protocol based on the current page protocol
const wsProtocol = window.location.protocol === 'https:' ? 'wss:' : 'ws:';

// For development with Vite proxy
let WS_BASE_URL;

if (import.meta.env.DEV) {
  // In development, use the Vite proxy which forwards to the API server
  WS_BASE_URL = `${wsProtocol}//${window.location.host}/novasonic`;
} else {
  // In production, use the CloudFront distribution path
  WS_BASE_URL = `${wsProtocol}//${window.location.host}/novasonic`;
}

console.log(`WebSocket Base URL: ${WS_BASE_URL}`);

/**
 * Get authentication token from AWS Amplify
 * @returns Promise with the ID token or null if not authenticated
 */
const getAuthToken = async (): Promise<string | null> => {
  try {
    const session = await fetchAuthSession();
    const token = session.tokens?.idToken?.toString();
    return token || null;
  } catch (error) {
    console.error('Error fetching auth token:', error);
    return null;
  }
};

export class WebSocketClient {
  private ws: WebSocket | null = null;
  private reconnectAttempts = 0;
  private maxReconnectAttempts = 5;
  private reconnectTimeout: number = 1000;
  private isManualDisconnect = false;
  private isSessionReady = false;
  
  // Event callbacks
  private messageCallbacks: Record<string, ((data: any) => void)[]> = {};
  private onConnectCallback: (() => void) | null = null;
  private onDisconnectCallback: (() => void) | null = null;
  private onErrorCallback: ((error: Event) => void) | null = null;
  private onSessionReadyCallback: (() => void) | null = null;
  
  /**
   * Clears all event handlers to prevent duplicate handlers
   * when components are unmounted and remounted
   */
  clearAllHandlers(): void {
    this.messageCallbacks = {};
    this.onConnectCallback = null;
    this.onDisconnectCallback = null;
    this.onErrorCallback = null;
    this.onSessionReadyCallback = null;
  }
  
  /**
   * Connect to the WebSocket server
   */
  async connect(): Promise<void> {
    // Reset the manual disconnect flag
    this.isManualDisconnect = false;
    this.isSessionReady = false;
    
    try {
      // Get authentication token
      const token = await getAuthToken();
      
      // Construct WebSocket URL with token as query parameter if available
      let wsUrl = WS_BASE_URL;
      if (token) {
        // Add token as query parameter
        const separator = wsUrl.includes('?') ? '&' : '?';
        wsUrl = `${wsUrl}${separator}idToken=${encodeURIComponent(token)}`;
        console.log('Connecting to WebSocket server with authentication token');
      } else {
        console.log('Connecting to WebSocket server without authentication token');
      }
      
      console.log('Connecting to WebSocket server:', wsUrl.split('?')[0]); // Log URL without token for security
      this.ws = new WebSocket(wsUrl);
      
      this.ws.onopen = () => {
        console.log('WebSocket connected');
        this.reconnectAttempts = 0;
        if (this.onConnectCallback) this.onConnectCallback();
      };
      
      this.ws.onmessage = (event) => {
        try {
          const data = JSON.parse(event.data);
          
          // Log server events with the dedicated handler
          logServerEventIfEnabled(data);
          
          // Handle session ready event
          if (data.type === 'sessionReady' || data.type === 'systemPromptSet') {
            console.log('Session is ready for audio');
            this.isSessionReady = true;
            if (this.onSessionReadyCallback) this.onSessionReadyCallback();
          }
          
          // Call specific type handlers
          if (data.type && this.messageCallbacks[data.type]) {
            this.messageCallbacks[data.type].forEach(callback => callback(data));
          }
        } catch (error) {
          console.error('Error parsing WebSocket message:', error);
        }
      };
      
      this.ws.onclose = (event) => {
        console.log(`WebSocket disconnected: ${event.code} ${event.reason}`);
        this.ws = null;
        
        if (this.onDisconnectCallback) this.onDisconnectCallback();
        
        // Attempt to reconnect if not manually disconnected
        if (!this.isManualDisconnect && this.reconnectAttempts < this.maxReconnectAttempts) {
          this.reconnectAttempts++;
          const timeout = this.reconnectTimeout * Math.pow(2, this.reconnectAttempts - 1);
          console.log(`Attempting to reconnect in ${timeout}ms (attempt ${this.reconnectAttempts}/${this.maxReconnectAttempts})`);
          
          setTimeout(() => {
            this.connect().catch(error => {
              console.error('Reconnection failed:', error);
            });
          }, timeout);
        }
      };
      
      this.ws.onerror = (event) => {
        console.error('WebSocket error:', event);
        if (this.onErrorCallback) this.onErrorCallback(event);
      };
      
      // Return a promise that resolves when the connection is established
      return new Promise((resolve, reject) => {
        const onOpenHandler = () => {
          if (this.ws) {
            this.ws.removeEventListener('open', onOpenHandler);
            resolve();
          }
        };
        
        const onErrorHandler = () => {
          if (this.ws) {
            this.ws.removeEventListener('error', onErrorHandler);
            reject(new Error('WebSocket connection failed'));
          }
        };
        
        if (this.ws) {
          this.ws.addEventListener('open', onOpenHandler);
          this.ws.addEventListener('error', onErrorHandler);
        }
      });
    } catch (error) {
      console.error('Error connecting to WebSocket:', error);
      throw error;
    }
  }
  
  /**
   * Send a message to the WebSocket server
   */
  send(data: any): void {
    if (!this.ws) {
      console.error('Cannot send message: WebSocket is null');
      return;
    }
    
    if (this.ws.readyState !== WebSocket.OPEN) {
      console.error('Cannot send message: WebSocket is not open, current state:', this.ws.readyState);
      return;
    }
    
    // For audio data, don't log the entire payload as it's too large
    if (data.type === 'audioData' || data.type === 'audioOutput') {
      // Don't log audio data
    } else {
      console.log('Sending WebSocket message:', data);
    }
    
    try {
      const jsonString = JSON.stringify(data);
      this.ws.send(jsonString);
    } catch (error) {
      console.error('Error sending WebSocket message:', error);
    }
  }
  
  /**
   * Disconnect from the WebSocket server
   */
  disconnect(): void {
    if (this.ws) {
      // Mark this as a manual disconnect to prevent reconnection attempts
      this.isManualDisconnect = true;
      this.ws.close();
      this.ws = null;
    }
  }
  
  /**
   * Check if connected to the WebSocket server
   */
  isConnectedToServer(): boolean {
    return this.ws !== null && this.ws.readyState === WebSocket.OPEN;
  }
  
  /**
   * Check if the session is ready for audio
   */
  isReadyForAudio(): boolean {
    return this.isConnectedToServer() && this.isSessionReady;
  }
  
  /**
   * Register a callback for a specific message type
   */
  onMessage(type: string, callback: (data: any) => void): void {
    if (!this.messageCallbacks[type]) {
      this.messageCallbacks[type] = [];
    }
    this.messageCallbacks[type].push(callback);
  }
  
  /**
   * Set callback for when the connection is established
   */
  onConnect(callback: () => void): void {
    this.onConnectCallback = callback;
  }
  
  /**
   * Set callback for when the connection is closed
   */
  onDisconnect(callback: () => void): void {
    this.onDisconnectCallback = callback;
  }
  
  /**
   * Set callback for when an error occurs
   */
  onError(callback: (error: Event) => void): void {
    this.onErrorCallback = callback;
  }
  
  /**
   * Set callback for when the session is ready
   */
  onSessionReady(callback: () => void): void {
    this.onSessionReadyCallback = callback;
  }
}
