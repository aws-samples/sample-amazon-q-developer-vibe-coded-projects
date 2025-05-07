import { Buffer } from "node:buffer";
import { NovaSonicClient } from "./client";
import { SessionContext } from "../../types/novasonic.types";

// Session class to manage individual streaming sessions
export class StreamSession {
  private audioBufferQueue: Buffer[] = [];
  private maxQueueSize = 200;
  private isProcessingAudio = false;
  private isActive = true;
  public readonly context: SessionContext;

  constructor(
    private sessionId: string,
    private client: NovaSonicClient,
    context: SessionContext
  ) {
    this.context = context;
  }

  // Register event handlers for this specific session
  public onEvent(eventType: string, handler: (data: any) => void): StreamSession {
    this.client.registerEventHandler(this.sessionId, eventType, handler);
    return this;
  }

  // Setup methods for the session
  public async setupPromptStart(): Promise<void> {
    await this.client.setupPromptStart(this.sessionId);
  }

  public async setupSystemPrompt(systemPrompt: string): Promise<void> {
    // Simply pass the system prompt to the client
    await this.client.setupSystemPrompt(this.sessionId, systemPrompt);
  }
  
  public async addHistoryMessage(content: string, role: string): Promise<void> {
    // Add a history message to the session
    await this.client.addHistoryMessage(this.sessionId, content, role);
  }
  
  public async addHistoryMessages(messages: Array<{content: string, role: string}>): Promise<void> {
    // Add multiple history messages in batch
    await this.client.addHistoryMessages(this.sessionId, messages);
  }

  public async setupStartAudio(): Promise<void> {
    await this.client.setupStartAudio(this.sessionId);
  }

  // Stream audio for this session
  public async streamAudio(audioData: Buffer): Promise<void> {
    if (this.audioBufferQueue.length >= this.maxQueueSize) {
      this.audioBufferQueue.shift();
      console.log("Audio queue full, dropping oldest chunk");
    }

    this.audioBufferQueue.push(audioData);
    this.processAudioQueue();
  }

  // Process the audio queue
  private async processAudioQueue(): Promise<void> {
    if (this.isProcessingAudio || this.audioBufferQueue.length === 0) {
      return;
    }

    this.isProcessingAudio = true;

    try {
      while (this.audioBufferQueue.length > 0 && this.isActive) {
        const audioChunk = this.audioBufferQueue.shift();
        if (audioChunk) {
          await this.streamAudioChunk(audioChunk);
        }
      }
    } finally {
      this.isProcessingAudio = false;
    }
  }

  // Stream a single audio chunk
  public async streamAudioChunk(audioData: Buffer): Promise<void> {
    if (!this.isActive) {
      throw new Error("Session is not active");
    }
    await this.client.streamAudioChunk(this.sessionId, audioData);
  }

  // End the audio content
  public async sendContentEnd(): Promise<void> {
    if (!this.isActive) {
      return;
    }
    await this.client.sendContentEnd(this.sessionId);
  }

  // End the prompt
  public async sendPromptEnd(): Promise<void> {
    if (!this.isActive) {
      return;
    }
    await this.client.sendPromptEnd(this.sessionId);
  }

  // Close the session
  public async close(): Promise<void> {
    if (!this.isActive) {
      return;
    }
    this.isActive = false;
    await this.client.closeSession(this.sessionId);
  }
}
