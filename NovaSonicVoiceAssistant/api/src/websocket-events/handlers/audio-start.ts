import WebSocket from 'ws';
import { BaseEventHandler } from '../base-handler';
import { SessionManager } from '../session-manager';
import { SessionState } from '../types';

/**
 * Handler for audioStart events
 * Enhanced to automatically check session state and handle new conversation turns
 */
export class AudioStartHandler extends BaseEventHandler {
  constructor(private sessionManager: SessionManager) {
    super();
  }
  
  /**
   * Handle an audioStart event
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
      
      // Check if the session is in the correct state
      if (!this.sessionManager.isSessionInState(ws, SessionState.SYSTEM_PROMPT_SET) &&
          !this.sessionManager.isSessionInState(ws, SessionState.AUDIO_STOPPED)) {
        
        // If this is not the first turn and we're not in a ready state, start a new turn
        if (!sessionData.isFirstTurn) {
          this.logger.info('Starting new conversation turn before audio start');
          await this.sessionManager.startNewTurn(ws);
        } else {
          this.sendError(ws, 'Session not ready for audio input');
          return;
        }
      }
      
      this.logger.info('Setting up audio start');
      await sessionData.session.setupStartAudio();
      
      // Update session state
      this.sessionManager.updateSessionState(ws, SessionState.AUDIO_STARTED);
      
      this.logger.info('Audio start setup complete, sending confirmation');
      this.sendResponse(ws, 'audioStarted');
    } catch (error) {
      this.sendError(
        ws, 
        'Error setting up audio start', 
        error instanceof Error ? error.message : String(error)
      );
    }
  }
}
