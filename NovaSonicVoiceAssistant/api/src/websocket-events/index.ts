import { WebSocketEventType, WebSocketEventHandlerMap } from './types';
import { SessionManager } from './session-manager';
import { NovaSonicClient } from '../services/nova-sonic';

// Import handlers
import { StartSessionHandler } from './handlers/start-session';
import { PromptStartHandler } from './handlers/prompt-start';
import { SystemPromptHandler } from './handlers/system-prompt';
import { AudioStartHandler } from './handlers/audio-start';
import { AudioDataHandler } from './handlers/audio-data';
import { AudioStopHandler } from './handlers/audio-stop';

/**
 * Create event handlers with dependencies
 * @param sessionManager The session manager
 * @param novaSonicClient The NovaSonic client
 * @returns A map of event types to handlers
 */
export function createEventHandlers(
  sessionManager: SessionManager,
  novaSonicClient: NovaSonicClient
): WebSocketEventHandlerMap {
  return {
    [WebSocketEventType.START_SESSION]: new StartSessionHandler(sessionManager, novaSonicClient),
    [WebSocketEventType.PROMPT_START]: new PromptStartHandler(sessionManager),
    [WebSocketEventType.SYSTEM_PROMPT]: new SystemPromptHandler(sessionManager),
    [WebSocketEventType.AUDIO_START]: new AudioStartHandler(sessionManager),
    [WebSocketEventType.AUDIO_DATA]: new AudioDataHandler(sessionManager),
    [WebSocketEventType.AUDIO_STOP]: new AudioStopHandler(sessionManager),
  };
}

export { SessionManager };
export * from './types';
