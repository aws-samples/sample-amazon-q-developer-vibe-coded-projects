import WebSocket from 'ws';
import { BaseEventHandler } from '../base-handler';
import { SessionManager } from '../session-manager';
import { SessionState } from '../types';

/**
 * Handler for audioStop events
 * Enhanced to update session state and handle conversation turn completion
 */
export class AudioStopHandler extends BaseEventHandler {
  constructor(private sessionManager: SessionManager) {
    super();
  }
  
  /**
   * Handle an audioStop event
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
      if (!this.sessionManager.isSessionInState(ws, SessionState.AUDIO_STARTED)) {
        this.logger.warn('Attempting to stop audio when not in AUDIO_STARTED state');
        // Continue anyway to ensure we clean up properly
      }
      
      this.logger.info('Stopping audio input');
      await sessionData.session.sendContentEnd();
      
      // Update session state
      this.sessionManager.updateSessionState(ws, SessionState.AUDIO_STOPPED);
      
      this.logger.info('Audio input stopped');
      this.sendResponse(ws, 'audioStopped', {
        message: 'Audio input stopped, processing response',
        state: SessionState.AUDIO_STOPPED
      });
    } catch (error) {
      this.sendError(
        ws, 
        'Failed to stop audio', 
        error instanceof Error ? error.message : String(error)
      );
    }
  }
}
