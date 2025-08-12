import { InvokeModelWithBidirectionalStreamInput } from "@aws-sdk/client-bedrock-runtime";
import { createLogger } from "../../../middleware/logging";
import { SessionData } from "../../../types/novasonic.types";
import { logBedrockOutgoingEvent } from "../logging/bedrock-logger";

export class AsyncIterableCreator {
  private logger = createLogger('AsyncIterableCreator');

  constructor() {}

  // Create async iterable for session
  public createSessionAsyncIterable(
    sessionId: string, 
    session: SessionData,
    isSessionActive: (sessionId: string) => boolean
  ): AsyncIterable<InvokeModelWithBidirectionalStreamInput> {
    if (!isSessionActive(sessionId)) {
      this.logger.warn({ sessionId }, 'Cannot create async iterable: Session not active');
      return {
        [Symbol.asyncIterator]: () => ({
          next: async () => ({ value: undefined, done: true })
        })
      };
    }

    if (!session) {
      this.logger.error({ sessionId }, 'Cannot create async iterable: Session not found');
      throw new Error(`Cannot create async iterable: Session ${sessionId} not found`);
    }

    return {
      [Symbol.asyncIterator]: () => {
        this.logger.debug({ sessionId }, 'AsyncIterable iterator requested for session');

        return {
          next: async (): Promise<IteratorResult<InvokeModelWithBidirectionalStreamInput>> => {
            try {
              // Check if session is still active
              if (!session.isActive) {
                this.logger.debug({ sessionId }, 'Iterator closing for session, done = true');
                return { value: undefined, done: true };
              }

              // Wait for items in the queue
              while (session.queue.length === 0) {
                if (!session.isActive) {
                  return { value: undefined, done: true };
                }
                await new Promise(resolve => setTimeout(resolve, 10));
              }

              // Get next item from the session's queue
              const nextEvent = session.queue.shift();
              
              // Log the event being sent to Bedrock with color coding
              const eventType = nextEvent?.event ? Object.keys(nextEvent.event)[0] : 'unknown';
              logBedrockOutgoingEvent(sessionId, eventType, nextEvent);

              return {
                value: {
                  chunk: {
                    bytes: new TextEncoder().encode(JSON.stringify(nextEvent))
                  }
                },
                done: false
              };
            } catch (error) {
              this.logger.error({ sessionId, error }, 'Error in session iterator');
              session.isActive = false;
              return { value: undefined, done: true };
            }
          }
        };
      }
    };
  }
}
