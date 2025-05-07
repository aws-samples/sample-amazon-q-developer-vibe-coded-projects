import { randomUUID } from "node:crypto";
import { InferenceConfig, SessionContext, SessionData } from "../../../types/novasonic.types";
import { createLogger } from "../../../middleware/logging";
import { EventEmitter } from "events";

// Define event types for better type safety
export enum SessionEvents {
  TIMEOUT = 'sessionTimeout',
  CLOSED = 'sessionClosed',
  ERROR = 'sessionError'
}

export class SessionManager extends EventEmitter {
  private activeSessions: Map<string, SessionData> = new Map();
  private logger = createLogger('SessionManager');

  constructor(private inferenceConfig: InferenceConfig) {
    super();
  }

  // Create a new session
  public createSession(sessionId: string = randomUUID(), context?: SessionContext): SessionData {
    if (this.activeSessions.has(sessionId)) {
      this.logger.error({ sessionId }, 'Stream session already exists');
      throw new Error(`Stream session with ID ${sessionId} already exists`);
    }

    const session: SessionData = {
      queue: [],
      responseHandlers: new Map(),
      promptName: randomUUID(),
      inferenceConfig: this.inferenceConfig,
      isActive: true,
      isPromptStartSent: false,
      isAudioContentStartSent: false,
      audioContentId: randomUUID(),
      context // Store the context
    };

    this.activeSessions.set(sessionId, session);
    
    // Log user info if available
    const userInfo = context?.user ? `for user ${context.user.username} (${context.user.userId})` : '';
    this.logger.info({ sessionId, promptName: session.promptName }, `Created new stream session ${userInfo}`);

    return session;
  }

  // Get a session by ID
  public getSession(sessionId: string): SessionData | undefined {
    return this.activeSessions.get(sessionId);
  }

  // Get session context
  public getSessionContext(sessionId: string): SessionContext | undefined {
    const session = this.activeSessions.get(sessionId);
    return session?.context;
  }

  // Check if session is active
  public isSessionActive(sessionId: string): boolean {
    const session = this.activeSessions.get(sessionId);
    return !!session && session.isActive;
  }

  // Get active sessions
  public getActiveSessions(): string[] {
    return Array.from(this.activeSessions.keys());
  }

  // Handle proper session cleanup including sending session end event
  public handleSessionCleanup(sessionId: string): void {
    const session = this.activeSessions.get(sessionId);
    if (!session) return;
    
    try {
      this.logger.info({ sessionId }, 'Starting cleanup for session');
      
      // Add session end event to queue
      const sessionEndEvent = { event: { sessionEnd: {} } };
      this.addEventToSessionQueue(sessionId, sessionEndEvent);
      
      // Mark session as inactive after a short delay to allow the end event to be processed
      setTimeout(() => {
        session.isActive = false;
        
        // Close the session completely
        setTimeout(() => {
          this.closeSession(sessionId);
        }, 500);
      }, 500);
      
    } catch (error) {
      this.logger.error({ sessionId, error }, 'Error during session cleanup');
      
      // Ensure cleanup happens even if there's an error
      this.closeSession(sessionId);
    }
  }

  // Register event handler
  public registerEventHandler(sessionId: string, eventType: string, handler: (data: any) => void): void {
    const session = this.activeSessions.get(sessionId);
    if (!session) {
      throw new Error(`Session ${sessionId} not found`);
    }
    session.responseHandlers.set(eventType, handler);
  }

  // Add conversation history message to the session
  public addHistoryMessage(sessionId: string, content: string, role: string): void {
    const session = this.activeSessions.get(sessionId);
    if (!session || !session.isActive) return;
    
    const textPromptID = randomUUID();
    
    // Text content start
    this.addEventToSessionQueue(sessionId, {
      event: {
        contentStart: {
          promptName: session.promptName,
          contentName: textPromptID,
          type: "TEXT",
          interactive: true,
          role: role === 'User' ? 'USER' : 'ASSISTANT',
          textInputConfiguration: {
            mediaType: "text/plain"
          },
        },
      }
    });

    // Text input content
    this.addEventToSessionQueue(sessionId, {
      event: {
        textInput: {
          promptName: session.promptName,
          contentName: textPromptID,
          content: content,
        },
      }
    });

    // Text content end
    this.addEventToSessionQueue(sessionId, {
      event: {
        contentEnd: {
          promptName: session.promptName,
          contentName: textPromptID,
        },
      }
    });
    
    this.logger.info({ sessionId, role }, `Added history message to session`);
  }

  // Add an event to a session's queue
  public addEventToSessionQueue(sessionId: string, event: any): void {
    const session = this.activeSessions.get(sessionId);
    if (!session || !session.isActive) return;

    session.queue.push(event);
  }

  // Close and remove session
  public closeSession(sessionId: string): void {
    const session = this.activeSessions.get(sessionId);
    if (!session) return;

    session.isActive = false;
    this.activeSessions.delete(sessionId);
    
    this.logger.info({ sessionId }, 'Session closed and removed from active sessions');
    
    // Emit session closed event
    this.emit(SessionEvents.CLOSED, sessionId);
  }
}
