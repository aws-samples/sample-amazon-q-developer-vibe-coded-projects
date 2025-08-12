import WebSocket from 'ws';
import { Buffer } from 'node:buffer';
import { BaseEventHandler } from '../base-handler';
import { SessionManager } from '../session-manager';

/**
 * Handler for audioData events
 */
export class AudioDataHandler extends BaseEventHandler {
  constructor(private sessionManager: SessionManager) {
    super();
  }
  
  /**
   * Handle an audioData event
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
      
      if (!data.audio) {
        this.sendError(ws, 'No audio data provided');
        return;
      }
      
      // Log audio data details at trace level
      this.logger.trace(`Received audio data, length: ${data.audio.length}`);
      
      // Convert base64 audio to buffer
      const audioBuffer = Buffer.from(data.audio, 'base64');
      this.logger.trace(`Converted to buffer, size: ${audioBuffer.length} bytes`);
      
      // Stream the audio to NovaSonic
      await sessionData.session.streamAudio(audioBuffer);
    } catch (error) {
      this.sendError(
        ws, 
        'Failed to process audio data', 
        error instanceof Error ? error.message : String(error)
      );
    }
  }
}
