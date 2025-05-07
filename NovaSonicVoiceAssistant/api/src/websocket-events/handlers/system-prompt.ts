import WebSocket from 'ws';
import { BaseEventHandler } from '../base-handler';
import { SessionManager } from '../session-manager';
import { SessionState } from '../types';

/**
 * //TODO
 * Handler for systemPrompt events
 * This handler is kept for backward compatibility but is no longer needed
 * for the simplified API as system prompt is handled automatically
 */
export class SystemPromptHandler extends BaseEventHandler {
  constructor(private sessionManager: SessionManager) {
    super();
  }
  
  /**
   * Handle a systemPrompt event
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
      if (this.sessionManager.isSessionInState(ws, SessionState.SYSTEM_PROMPT_SET)) {
        this.logger.info('System prompt already set, skipping');
        this.sendResponse(ws, 'systemPromptSet');
        return;
      }
      
      if (!data.content) {
        this.sendError(ws, 'No system prompt content provided');
        return;
      }
      
      // Store the system prompt for future use
      sessionData.systemPrompt = data.content;
      
      this.logger.info('Setting up system prompt');
      await sessionData.session.setupSystemPrompt(data.content);
      
      // Update session state
      this.sessionManager.updateSessionState(ws, SessionState.SYSTEM_PROMPT_SET);
      
      this.logger.info('System prompt setup complete, sending confirmation');
      this.sendResponse(ws, 'systemPromptSet');
    } catch (error) {
      this.sendError(
        ws, 
        'Error setting up system prompt', 
        error instanceof Error ? error.message : String(error)
      );
    }
  }
}
