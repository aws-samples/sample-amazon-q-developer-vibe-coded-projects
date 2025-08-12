import WebSocket from 'ws';

/**
 * Interface for WebSocket event handlers
 */
export interface WebSocketEventHandler {
  /**
   * Handle a WebSocket event
   * @param ws The WebSocket connection
   * @param data The event data
   * @returns A promise that resolves when the event is handled
   */
  handle(ws: WebSocket, data: any): Promise<void>;
}

/**
 * Session state enum to track the current state of a session
 */
export enum SessionState {
  CREATED = 'created',
  INITIALIZED = 'initialized',
  PROMPT_STARTED = 'promptStarted',
  SYSTEM_PROMPT_SET = 'systemPromptSet',
  AUDIO_STARTED = 'audioStarted',
  AUDIO_STOPPED = 'audioStopped',
  COMPLETED = 'completed',
  ERROR = 'error'
}

/**
 * Interface for WebSocket session data
 */
export interface WebSocketSession {
  session: any;
  user: {
    userId: string;
    email?: string;
    username?: string;
    groups?: string[];
    scope?: string;
    claims?: Record<string, any>;
  };
  // Track the current state of the session
  state?: SessionState;
  // Track if this is the first conversation turn
  isFirstTurn?: boolean;
  // Store the system prompt for reuse
  systemPrompt?: string;
}

/**
 * Enum of supported WebSocket event types
 */
export enum WebSocketEventType {
  START_SESSION = 'startSession',
  PROMPT_START = 'promptStart',
  SYSTEM_PROMPT = 'systemPrompt',
  AUDIO_START = 'audioStart',
  AUDIO_DATA = 'audioData',
  AUDIO_STOP = 'audioStop',
}

/**
 * Map of event types to their handler classes
 */
export interface WebSocketEventHandlerMap {
  [key: string]: WebSocketEventHandler;
}
