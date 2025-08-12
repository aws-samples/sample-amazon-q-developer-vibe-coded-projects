import { randomUUID } from "node:crypto";
import { Buffer } from "node:buffer";
import { createLogger } from "../../../middleware/logging";
import { SessionData } from "../../../types/novasonic.types";
import { 
  DefaultAudioInputConfiguration, 
  DefaultAudioOutputConfiguration,
  DefaultTextConfiguration 
} from "../constants";
import { getAllToolSchemasForBedrock } from "../../../tools";

export class EventBuilder {
  private logger = createLogger('EventBuilder');

  constructor() {}

  // Set up session start event
  public setupSessionStartEvent(sessionId: string, session: SessionData): any {
    this.logger.info({ sessionId }, 'Creating session start event');
    
    return {
      event: {
        sessionStart: {
          inferenceConfiguration: session.inferenceConfig
        }
      }
    };
  }

  // Create prompt start event
  public createPromptStartEvent(sessionId: string, session: SessionData): any {
    this.logger.info({ sessionId }, 'Creating prompt start event');
    
    // Get all tool schemas in Bedrock API format
    const toolSchemas = getAllToolSchemasForBedrock();
    this.logger.debug({ sessionId, toolCount: toolSchemas.length }, 'Retrieved tool schemas for prompt');
    
    return {
      event: {
        promptStart: {
          promptName: session.promptName,
          textOutputConfiguration: {
            mediaType: "text/plain",
          },
          audioOutputConfiguration: DefaultAudioOutputConfiguration,
          toolConfiguration: {
            tools: toolSchemas
          }
        },
      }
    };
  }

  // Create system prompt events
  public createSystemPromptEvents(sessionId: string, session: SessionData, systemPromptContent: string): any[] {
    const textPromptID = randomUUID();
    this.logger.debug({ sessionId, textPromptID }, 'Generated system prompt content ID');
    
    return [
      // Text content start
      {
        event: {
          contentStart: {
            promptName: session.promptName,
            contentName: textPromptID,
            type: "TEXT",
            interactive: true,
            role: "SYSTEM",
            textInputConfiguration: DefaultTextConfiguration,
          },
        }
      },
      
      // Text input content
      {
        event: {
          textInput: {
            promptName: session.promptName,
            contentName: textPromptID,
            content: systemPromptContent,
          },
        }
      },
      
      // Text content end
      {
        event: {
          contentEnd: {
            promptName: session.promptName,
            contentName: textPromptID,
          },
        }
      }
    ];
  }

  // Create audio start event
  public createAudioStartEvent(sessionId: string, session: SessionData): any {
    return {
      event: {
        contentStart: {
          promptName: session.promptName,
          contentName: session.audioContentId,
          type: "AUDIO",
          interactive: true,
          role: "USER",
          audioInputConfiguration: DefaultAudioInputConfiguration,
        },
      }
    };
  }

  // Create audio chunk event
  public createAudioChunkEvent(sessionId: string, session: SessionData, audioData: Buffer): any {
    // Convert audio to base64
    const base64Data = audioData.toString('base64');
    
    return {
      event: {
        audioInput: {
          promptName: session.promptName,
          contentName: session.audioContentId,
          content: base64Data,
        },
      }
    };
  }

  // Create content end event
  public createContentEndEvent(sessionId: string, session: SessionData): any {
    return {
      event: {
        contentEnd: {
          promptName: session.promptName,
          contentName: session.audioContentId,
        }
      }
    };
  }

  // Create prompt end event
  public createPromptEndEvent(sessionId: string, session: SessionData): any {
    return {
      event: {
        promptEnd: {
          promptName: session.promptName
        }
      }
    };
  }

  // Create session end event
  public createSessionEndEvent(): any {
    return {
      event: {
        sessionEnd: {}
      }
    };
  }
}
