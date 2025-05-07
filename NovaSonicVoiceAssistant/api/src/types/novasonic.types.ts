/**
 * NovaSonic-related type definitions
 */

export interface InferenceConfig {
  readonly maxTokens: number;
  readonly topP: number;
  readonly temperature: number;
}

export type ContentType = "AUDIO" | "TEXT" | "TOOL";
export type AudioType = "SPEECH";
export type AudioMediaType = "audio/lpcm"
export type TextMediaType = "text/plain" | "application/json";

export interface AudioConfiguration {
  readonly audioType: AudioType;
  readonly mediaType: AudioMediaType;
  readonly sampleRateHertz: number;
  readonly sampleSizeBits: number;
  readonly channelCount: number;
  readonly encoding: string;
  readonly voiceId?: string;
}

export interface TextConfiguration {
  readonly mediaType: TextMediaType;
}

export interface ToolSpec {
  name: string;
  description: string;
  inputSchema: {
    json: string;
  };
}

export interface Tool {
  toolSpec: ToolSpec;
}

export interface ToolConfiguration {
  readonly toolUseId?: string;
  readonly type?: "TEXT";
  readonly textInputConfiguration?: {
    readonly mediaType: "text/plain";
  };
  readonly tools?: Tool[];
}

/**
 * Session context interface for storing user information
 */
export interface SessionContext {
  user: {
    userId: string;
    username: string;
  };
  sessionId?: string; 
  requestId?: string; 
}

// Client configuration type
export interface NovaSonicClientConfig {
  requestHandlerConfig?: any;
  clientConfig: {
    region: string;
    credentials: any;
  };
  inferenceConfig?: InferenceConfig;
}

// Session data type
export interface SessionData {
  queue: Array<any>;
  responseHandlers: Map<string, (data: any) => void>;
  promptName: string;
  inferenceConfig: InferenceConfig;
  isActive: boolean;
  isPromptStartSent: boolean;
  isAudioContentStartSent: boolean;
  audioContentId: string;
  context?: SessionContext; 
}

export interface StreamSession {
  readonly sessionId: string;
  readonly promptName: string;
  readonly audioContentId: string;
  readonly inferenceConfig: InferenceConfig;
  readonly isActive: boolean;
  readonly isPromptStartSent: boolean;
  readonly isAudioContentStartSent: boolean;
  readonly queue: any[];
  readonly responseHandlers: Map<string, (data: any) => void>;
  readonly context: SessionContext; 
  
  // Add methods for type checking
  setupPromptStart(): Promise<void>;
  setupSystemPrompt(content?: string): Promise<void>;
  setupStartAudio(): Promise<void>;
  streamAudioChunk(data: Buffer): Promise<void>;
  sendContentEnd(): Promise<void>;
  sendPromptEnd(): Promise<void>;
  onEvent(eventType: string, handler: (data: any) => void): void;
}
