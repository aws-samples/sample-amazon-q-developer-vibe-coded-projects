import {
  BedrockRuntimeClient,
  InvokeModelWithBidirectionalStreamCommand,
} from "@aws-sdk/client-bedrock-runtime";
import { NodeHttp2Handler } from "@smithy/node-http-handler";
import { Buffer } from "node:buffer";
import { randomUUID } from "node:crypto";
import { DefaultInferenceConfiguration } from "./constants";
import { InferenceConfig, NovaSonicClientConfig, SessionContext } from "../../types/novasonic.types";
import { StreamSession } from "./stream-session";
import { createLogger } from "../../middleware/logging";

// Import refactored modules
import { SessionManager, SessionEvents } from "./session/session-manager";
import { StreamHandler } from "./streaming/stream-handler";
import { AsyncIterableCreator } from "./streaming/async-iterable";
import { EventDispatcher } from "./events/event-dispatcher";
import { EventBuilder } from "./events/event-builder";
import { ToolManager } from "./tools/tool-manager";

export class NovaSonicClient {
  private bedrockClient: BedrockRuntimeClient;
  private inferenceConfig: InferenceConfig;
  private logger = createLogger('NovaSonicClient');

  // Refactored components
  private sessionManager: SessionManager;
  private streamHandler: StreamHandler;
  private asyncIterableCreator: AsyncIterableCreator;
  private eventDispatcher: EventDispatcher;
  private eventBuilder: EventBuilder;
  private toolManager: ToolManager;

  constructor(config: NovaSonicClientConfig) {
    // Create HTTP handler with appropriate timeouts for streaming
    const handler = new NodeHttp2Handler({
      requestTimeout: 12000000, // 5 minutes
      sessionTimeout: 12000000,
      disableConcurrentStreams: false,
      maxConcurrentStreams: config.requestHandlerConfig?.maxConcurrentStreams || 20,
      ...config.requestHandlerConfig
    });
    
    this.logger.info({ region: config.clientConfig.region }, 'Initializing Bedrock client');
    
    try {
      // Initialize Bedrock client
      this.bedrockClient = new BedrockRuntimeClient({
        region: config.clientConfig.region,
        //credentials: config.clientConfig.credentials,
        requestHandler: handler
      });
      
      this.logger.info('Bedrock client initialized successfully');
    } catch (error) {
      this.logger.error({ error }, 'Failed to initialize Bedrock client');
      throw error;
    }

    this.inferenceConfig = config.inferenceConfig || DefaultInferenceConfiguration;
    
    // Initialize refactored components
    this.sessionManager = new SessionManager(this.inferenceConfig);
    this.streamHandler = new StreamHandler();
    this.asyncIterableCreator = new AsyncIterableCreator();
    this.eventDispatcher = new EventDispatcher();
    this.eventBuilder = new EventBuilder();
    this.toolManager = new ToolManager();
    
    // Set up session timeout handler to forward events to client's event system
    this.sessionManager.on(SessionEvents.TIMEOUT, (sessionId, data) => {
      this.logger.warn({ sessionId, data }, 'Session timeout detected');
      this.dispatchEvent(sessionId, SessionEvents.TIMEOUT, data);
    });
  }

  // Create a new streaming session with context
  public createStreamSession(sessionId: string = randomUUID(), context: SessionContext): StreamSession {
    this.sessionManager.createSession(sessionId, context);
    return new StreamSession(sessionId, this, context);
  }

  // Get session context
  public getSessionContext(sessionId: string): SessionContext | undefined {
    return this.sessionManager.getSessionContext(sessionId);
  }

  // Check if session is active - maintains original API
  public isSessionActive(sessionId: string): boolean {
    return this.sessionManager.isSessionActive(sessionId);
  }

  // Get active sessions - maintains original API
  public getActiveSessions(): string[] {
    return this.sessionManager.getActiveSessions();
  }
  
  // Initiate a bidirectional stream session - maintains original API
  public async initiateSession(sessionId: string): Promise<void> {
    const session = this.sessionManager.getSession(sessionId);
    if (!session) {
      this.logger.error({ sessionId }, 'Stream session not found');
      throw new Error(`Stream session ${sessionId} not found`);
    }

    try {
      // Set up initial events for this session
      const sessionStartEvent = this.eventBuilder.setupSessionStartEvent(sessionId, session);
      this.sessionManager.addEventToSessionQueue(sessionId, sessionStartEvent);
      
      // Create the bidirectional stream with session-specific async iterator
      const asyncIterable = this.asyncIterableCreator.createSessionAsyncIterable(
        sessionId, 
        session,
        (sid) => this.sessionManager.isSessionActive(sid)
      );

      this.logger.info({ sessionId }, 'Starting bidirectional stream');

      const response = await this.bedrockClient.send(
        new InvokeModelWithBidirectionalStreamCommand({
          modelId: "amazon.nova-sonic-v1:0",
          body: asyncIterable,
        })
      );

      this.logger.info({ sessionId }, 'Stream established, processing responses');

      // Process responses for this session
      await this.streamHandler.processResponseStream(
        sessionId, 
        response, 
        session,
        (sid, eventType, data) => this.dispatchEvent(sid, eventType, data),
        (sid, toolUseId, toolName, params) => this.handleToolUse(sid, toolUseId, toolName, params)
      );

    } catch (error) {
      this.logger.error({ sessionId, error }, 'Error in session');
      this.dispatchEvent(sessionId, 'error', {
        source: 'bidirectionalStream',
        error: error instanceof Error ? error.message : String(error)
      });

      // Clean up if there's an error
      if (this.isSessionActive(sessionId)) {
        this.closeSession(sessionId);
      }
      
      throw error;
    }
  }

  // Set up prompt start event - maintains original API
  public async setupPromptStart(sessionId: string): Promise<void> {
    this.logger.info({ sessionId }, 'Setting up prompt start event');
    const session = this.sessionManager.getSession(sessionId);
    if (!session) {
      this.logger.error({ sessionId }, 'Session not found for prompt start');
      throw new Error(`Session ${sessionId} not found`);
    }

    // Generate a new prompt name for this session if not already set
    if (!session.promptName) {
      session.promptName = `prompt-${randomUUID()}`;
      this.logger.info({ sessionId, promptName: session.promptName }, 'Generated new prompt name');
    }

    // Create and add prompt start event
    const promptStartEvent = this.eventBuilder.createPromptStartEvent(sessionId, session);
    this.sessionManager.addEventToSessionQueue(sessionId, promptStartEvent);
    
    session.isPromptStartSent = true;
    this.logger.info({ sessionId, promptName: session.promptName }, 'Prompt start event queued for session');
    
    // Wait a moment to ensure the event is processed
    await new Promise(resolve => setTimeout(resolve, 100));
  }
  
  // Set up system prompt - simplified to just use the provided prompt
  public async setupSystemPrompt(
    sessionId: string,
    systemPromptContent: string
  ): Promise<void> {
    this.logger.info({ sessionId }, 'Setting up systemPrompt events for session');
    const session = this.sessionManager.getSession(sessionId);
    if (!session) {
      throw new Error(`Session ${sessionId} not found`);
    }

    if (!session.isPromptStartSent) {
      throw new Error(`Cannot send system prompt: promptStart not sent for session ${sessionId}`);
    }

    // Create system prompt events
    const systemPromptEvents = this.eventBuilder.createSystemPromptEvents(
      sessionId, 
      session, 
      systemPromptContent
    );
    
    // Add all events to the queue with small delays between them
    for (const event of systemPromptEvents) {
      this.sessionManager.addEventToSessionQueue(sessionId, event);
      await new Promise(resolve => setTimeout(resolve, 100));
    }
    
    this.logger.info({ sessionId }, 'System prompt events queued for session');
  }
  
  // Add history message for conversation resumption
  public async addHistoryMessage(sessionId: string, content: string, role: string): Promise<void> {
    this.logger.info({ sessionId, role }, 'Adding history message to session');
    
    const session = this.sessionManager.getSession(sessionId);
    if (!session) {
      throw new Error(`Session ${sessionId} not found`);
    }

    if (!session.isPromptStartSent) {
      throw new Error(`Cannot add history: promptStart not sent for session ${sessionId}`);
    }
    
    // Use the session manager to add the history message
    this.sessionManager.addHistoryMessage(sessionId, content, role);
  }
  
  // Add multiple history messages in batch for conversation resumption
  public async addHistoryMessages(sessionId: string, messages: Array<{content: string, role: string}>): Promise<void> {
    this.logger.info({ sessionId, messageCount: messages.length }, 'Adding batch of history messages to session');
    
    const session = this.sessionManager.getSession(sessionId);
    if (!session) {
      throw new Error(`Session ${sessionId} not found`);
    }

    if (!session.isPromptStartSent) {
      throw new Error(`Cannot add history: promptStart not sent for session ${sessionId}`);
    }
    
    // Add all messages without delays between them
    for (const message of messages) {
      this.sessionManager.addHistoryMessage(sessionId, message.content, message.role);
    }
    
    // Just one delay at the end to ensure processing
    await new Promise(resolve => setTimeout(resolve, 100));
    
    this.logger.info({ sessionId }, 'History messages batch added successfully');
  }

  // Set up audio start event - maintains original API
  public async setupStartAudio(sessionId: string): Promise<void> {
    this.logger.info({ sessionId }, 'Setting up startAudioContent event for session');
    const session = this.sessionManager.getSession(sessionId);
    if (!session) {
      throw new Error(`Session ${sessionId} not found`);
    }

    if (!session.isPromptStartSent) {
      throw new Error(`Cannot start audio: promptStart not sent for session ${sessionId}`);
    }

    // Generate a new audio content ID
    session.audioContentId = `audio-${randomUUID()}`;
    this.logger.debug({ sessionId, audioContentId: session.audioContentId }, 'Generated audio content ID');

    // Create and add audio start event
    const audioStartEvent = this.eventBuilder.createAudioStartEvent(sessionId, session);
    this.sessionManager.addEventToSessionQueue(sessionId, audioStartEvent);
    
    session.isAudioContentStartSent = true;
    this.logger.info({ sessionId, contentName: session.audioContentId }, 'Audio content start event queued');
    
    // Wait a moment to ensure the event is processed
    await new Promise(resolve => setTimeout(resolve, 100));
  }
  
  // Stream audio chunk - maintains original API
  public async streamAudioChunk(sessionId: string, audioData: Buffer): Promise<void> {
    const session = this.sessionManager.getSession(sessionId);
    if (!session || !session.isActive) {
      throw new Error(`Invalid session ${sessionId} for audio streaming`);
    }
    
    if (!session.isAudioContentStartSent || !session.audioContentId) {
      throw new Error(`Cannot stream audio: audio content start not sent for session ${sessionId}`);
    }
    
    this.logger.debug({ sessionId, byteSize: audioData.length }, 'Streaming audio chunk');
    
    // Create and add audio chunk event
    const audioChunkEvent = this.eventBuilder.createAudioChunkEvent(sessionId, session, audioData);
    this.sessionManager.addEventToSessionQueue(sessionId, audioChunkEvent);
  }

  // Send content end event - maintains original API
  public async sendContentEnd(sessionId: string): Promise<void> {
    const session = this.sessionManager.getSession(sessionId);
    if (!session) {
      throw new Error(`Session ${sessionId} not found`);
    }
    
    if (!session.isAudioContentStartSent || !session.audioContentId) {
      throw new Error(`Cannot end audio content: audio content start not sent for session ${sessionId}`);
    }

    this.logger.info({ sessionId, contentName: session.audioContentId }, 'Sending content end');
    
    // Create and add content end event
    const contentEndEvent = this.eventBuilder.createContentEndEvent(sessionId, session);
    this.sessionManager.addEventToSessionQueue(sessionId, contentEndEvent);
    
    // Wait a moment to ensure the event is processed
    await new Promise(resolve => setTimeout(resolve, 100));
  }

  // Send prompt end event - maintains original API
  public async sendPromptEnd(sessionId: string): Promise<void> {
    const session = this.sessionManager.getSession(sessionId);
    if (!session || !session.isPromptStartSent) return;

    // Create and add prompt end event
    const promptEndEvent = this.eventBuilder.createPromptEndEvent(sessionId, session);
    this.sessionManager.addEventToSessionQueue(sessionId, promptEndEvent);
  }
  
  // Send session end event - maintains original API
  public async sendSessionEnd(sessionId: string): Promise<void> {
    const session = this.sessionManager.getSession(sessionId);
    if (!session) return;

    // Create and add session end event
    const sessionEndEvent = this.eventBuilder.createSessionEndEvent();
    this.sessionManager.addEventToSessionQueue(sessionId, sessionEndEvent);

    // Clean up
    this.sessionManager.closeSession(sessionId);
  }

  // Register event handler - maintains original API
  public registerEventHandler(sessionId: string, eventType: string, handler: (data: any) => void): void {
    this.sessionManager.registerEventHandler(sessionId, eventType, handler);
  }

  // Dispatch event - private method used internally
  private dispatchEvent(sessionId: string, eventType: string, data: any): void {
    this.eventDispatcher.dispatchEvent(
      sessionId, 
      eventType, 
      data, 
      (sid) => this.sessionManager.getSession(sid)
    );
  }

  // Close session - maintains original API
  public async closeSession(sessionId: string): Promise<void> {
    try {
      this.logger.info({ sessionId }, 'Starting close process for session');
      await this.sendContentEnd(sessionId);
      await this.sendPromptEnd(sessionId);
      await this.sendSessionEnd(sessionId);
      this.logger.info({ sessionId }, 'Session cleanup complete');
    } catch (error) {
      this.logger.error({ sessionId, error }, 'Error during closing sequence');

      // Ensure cleanup happens even if there's an error
      this.sessionManager.closeSession(sessionId);
    }
  }

  // Register a tool handler with context support
  public registerTool(
    toolName: string, 
    handler: (params: any, context?: SessionContext) => any
  ): void {
    this.toolManager.registerTool(toolName, handler);
  }

  // Handle tool use - private method used internally
  private async handleToolUse(sessionId: string, toolUseId: string, toolName: string, parameters: any): Promise<void> {
    await this.toolManager.handleToolUse(
      sessionId, 
      toolUseId, 
      toolName, 
      parameters,
      (sid, eventType, data) => this.dispatchEvent(sid, eventType, data),
      (sid) => this.sessionManager.getSession(sid),
      (sid, event) => this.sessionManager.addEventToSessionQueue(sid, event)
    );
  }

  // Force close session - maintains original API
  public forceCloseSession(sessionId: string): void {
    this.logger.warn({ sessionId }, 'Force closing session');
    this.sessionManager.closeSession(sessionId);
    this.logger.info({ sessionId }, 'Session force closed');
  }
}
