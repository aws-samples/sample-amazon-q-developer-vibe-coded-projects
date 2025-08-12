import WebSocket from 'ws';
import { BaseEventHandler } from '../base-handler';
import { SessionManager } from '../session-manager';
import { SessionState } from '../types';

/**
 * Handler for promptStart events
 * This handler is kept for backward compatibility but is no longer needed
 * for the simplified API as prompt start is handled automatically
 */
export class PromptStartHandler extends BaseEventHandler {
  constructor(private sessionManager: SessionManager) {
    super();
  }
  
  /**
   * Handle a promptStart event
   * @param ws The WebSocket connection
   * @param data The event data
   */
  public async handle(ws: WebSocket, data: any): Promise<void> {
    try {
      const sessionData = this.sessionManager.getSession(ws);
      if (!sessionData || !sessionData.session) {
        this.sendError(ws, 'No active session found');
        return;
      }
      
      // Check if we're already in the correct state
      if (this.sessionManager.isSessionInState(ws, SessionState.PROMPT_STARTED) ||
          this.sessionManager.isSessionInState(ws, SessionState.SYSTEM_PROMPT_SET)) {
        this.logger.info('Session already has prompt started, skipping');
        this.sendResponse(ws, 'promptStarted');
        return;
      }
      
      this.logger.info('Setting up prompt start');
      await sessionData.session.setupPromptStart();
      
      // Update session state
      this.sessionManager.updateSessionState(ws, SessionState.PROMPT_STARTED);
      
      this.logger.info('Prompt start setup complete, sending confirmation');
      this.sendResponse(ws, 'promptStarted');
    } catch (error) {
      this.sendError(
        ws, 
        'Error setting up prompt start', 
        error instanceof Error ? error.message : String(error)
      );
    }
  }
}
