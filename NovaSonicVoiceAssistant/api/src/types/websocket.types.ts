import WebSocket from 'ws';

// Extend the WebSocket type to include our custom properties
export interface ExtendedWebSocket extends WebSocket {
  user?: {
    userId: string;
    username?: string;
    [key: string]: any;
  };
  sessionData?: {
    session: {
      sessionId: string;
      [key: string]: any;
    };
    [key: string]: any;
  };
}
