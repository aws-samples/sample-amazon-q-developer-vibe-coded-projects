import { createLogger } from "../../../middleware/logging";
import { SessionData } from "../../../types/novasonic.types";

export class EventDispatcher {
  private logger = createLogger('EventDispatcher');

  constructor() {}

  // Dispatch event to session
  public dispatchEventForSession(sessionId: string, eventType: string, data: any, session: SessionData): void {
    if (!session) return;

    const handler = session.responseHandlers.get(eventType);
    if (handler) {
      try {
        handler(data);
      } catch (e) {
        this.logger.error({ sessionId, eventType, error: e }, 'Error in event handler');
      }
    }
  }

  // Dispatch event
  public dispatchEvent(
    sessionId: string, 
    eventType: string, 
    data: any,
    getSession: (sessionId: string) => SessionData | undefined
  ): void {
    const session = getSession(sessionId);
    if (session) {
      this.dispatchEventForSession(sessionId, eventType, data, session);
    }
  }
}
