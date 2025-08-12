import { createLogger } from "../../../middleware/logging";
import { SessionData } from "../../../types/novasonic.types";
import { SessionEvents } from "../session/session-manager";
import { logBedrockIncomingEvent } from "../logging/bedrock-logger";

export class StreamHandler {
  private logger = createLogger('StreamHandler');

  constructor() {}

  // Process the response stream from AWS Bedrock
  public async processResponseStream(
    sessionId: string, 
    response: any, 
    session: SessionData,
    dispatchEvent: (sessionId: string, eventType: string, data: any) => void,
    handleToolUse: (sessionId: string, toolUseId: string, toolName: string, parameters: any) => Promise<void>
  ): Promise<void> {
    if (!session) return;

    try {
      this.logger.debug({ sessionId }, 'Starting to process response stream');
      
      for await (const event of response.body) {
        if (!session.isActive) {
          this.logger.debug({ sessionId }, 'Session is no longer active, stopping response processing');
          break;
        }
        if (event.chunk?.bytes) {
          try {
            const textResponse = new TextDecoder().decode(event.chunk.bytes);

            try {
              const jsonResponse = JSON.parse(textResponse);
              
              if (jsonResponse.event?.contentStart) {
                logBedrockIncomingEvent(sessionId, 'contentStart', jsonResponse.event.contentStart);
                dispatchEvent(sessionId, 'contentStart', jsonResponse.event.contentStart);
              } else if (jsonResponse.event?.textOutput) {
                logBedrockIncomingEvent(sessionId, 'textOutput', jsonResponse.event.textOutput);
                dispatchEvent(sessionId, 'textOutput', jsonResponse.event.textOutput);
              } else if (jsonResponse.event?.audioOutput) {
                logBedrockIncomingEvent(sessionId, 'audioOutput', jsonResponse.event.audioOutput);
                dispatchEvent(sessionId, 'audioOutput', jsonResponse.event.audioOutput);
              } else if (jsonResponse.event?.contentEnd) {
                logBedrockIncomingEvent(sessionId, 'contentEnd', jsonResponse.event.contentEnd);
                dispatchEvent(sessionId, 'contentEnd', jsonResponse.event.contentEnd);
              } else if (jsonResponse.event?.toolUse) {
                logBedrockIncomingEvent(sessionId, 'toolUse', jsonResponse.event.toolUse);
                dispatchEvent(sessionId, 'toolUse', jsonResponse.event.toolUse);
                
                // Handle tool use
                const { toolUseId, toolName, content } = jsonResponse.event.toolUse;
                
                // Parse the content field which contains the parameters as a JSON string
                let parameters = {};
                if (content && typeof content === 'string') {
                  try {
                    parameters = JSON.parse(content);
                  } catch (e) {
                    this.logger.error({ sessionId, toolName, error: e }, 'Failed to parse content as JSON');
                  }
                }
                
                await handleToolUse(sessionId, toolUseId, toolName, parameters);
              } else {
                // Handle other events
                const eventKeys = Object.keys(jsonResponse.event || {});
                if (eventKeys.length > 0) {
                  dispatchEvent(sessionId, eventKeys[0], jsonResponse.event);
                }
              }
            } catch (e) {
              this.logger.warn({ sessionId, error: e }, 'Failed to parse response JSON');
            }
          } catch (e) {
            this.logger.error({ sessionId, error: e }, 'Error processing response chunk');
          }
        } else if (event.modelStreamErrorException) {
          this.logger.error({ sessionId, error: event.modelStreamErrorException }, 'Model stream error');
          logBedrockIncomingEvent(sessionId, 'error', {
            type: 'modelStreamErrorException',
            details: event.modelStreamErrorException
          });
          dispatchEvent(sessionId, 'error', {
            type: 'modelStreamErrorException',
            details: event.modelStreamErrorException
          });
        } else if (event.internalServerException) {
          this.logger.error({ sessionId, error: event.internalServerException }, 'Internal server error');
          logBedrockIncomingEvent(sessionId, 'error', {
            type: 'internalServerException',
            details: event.internalServerException
          });
          dispatchEvent(sessionId, 'error', {
            type: 'internalServerException',
            details: event.internalServerException
          });
        }
      }

      this.logger.debug({ sessionId }, 'Response stream processing complete');
      logBedrockIncomingEvent(sessionId, 'streamComplete', {
        timestamp: new Date().toISOString()
      });
      dispatchEvent(sessionId, 'streamComplete', {
        timestamp: new Date().toISOString()
      });

    } catch (error) {
      this.logger.error({ sessionId, error }, 'Error processing response stream');
      
      // Check if this is a Bedrock timeout error (RST_STREAM closed stream or timed out waiting for input)
      const errorMessage = error instanceof Error ? error.message : String(error);
      
      if (errorMessage.includes('RST_STREAM closed stream')) {
        // Dispatch session timeout event
        dispatchEvent(sessionId, SessionEvents.TIMEOUT, {
          type: SessionEvents.TIMEOUT,
          message: 'session timed out',
          details: 'Connection closed by Bedrock due to inactivity',
          sessionId: sessionId
        });
      } else {
        // For other errors, dispatch a generic error event
        dispatchEvent(sessionId, 'error', {
          source: 'responseStream',
          message: 'Error processing response stream',
          details: errorMessage
        });
      }
    }
  }
}
