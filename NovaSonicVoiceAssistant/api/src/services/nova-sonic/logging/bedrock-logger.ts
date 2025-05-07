import { createLogger } from "../../../middleware/logging";

// Create a specialized logger for Bedrock events
export const bedrockLogger = createLogger('BedrockEvents');

/**
 * Determines the appropriate log level based on event type
 * @param eventType The event type
 * @returns The appropriate log level
 */
function determineLogLevel(eventType: string): 'trace' | 'debug' | 'info' | 'warn' | 'error' {
  // Audio-related events should be logged at trace level
  if (eventType.toLowerCase().includes('audio')) {
    return 'trace';
  }
  
  // Error events should be logged at warn level
  if (eventType.toLowerCase() === 'error') {
    return 'warn';
  }
  
  // Default to info level for all other events
  return 'info';
}

// Helper function to color-code outgoing events to Bedrock
export function logBedrockOutgoingEvent(sessionId: string, eventType: string, event: any): void {
  // Choose emoji based on event type
  let emoji;
  
  switch (eventType) {
    case 'sessionStart':
      emoji = '🚀';
      break;
    case 'promptStart':
      emoji = '📝';
      break;
    case 'systemPrompt':
      emoji = '⚙️';
      break;
    case 'contentStart':
      emoji = '📂';
      break;
    case 'audioInput':
      emoji = '🎤';
      break;
    case 'contentEnd':
      emoji = '📁';
      break;
    case 'promptEnd':
      emoji = '🏁';
      break;
    case 'sessionEnd':
      emoji = '🔚';
      break;
    default:
      emoji = '📡';
  }
  
  // Determine the appropriate log level based on event type
  const logLevel = determineLogLevel(eventType);
  
  // For audio events, don't log the full content
  if (eventType === 'audioInput') {
    const contentLength = event?.event?.audioInput?.content?.length || 0;
    bedrockLogger[logLevel]({ 
      sessionId, 
      eventType,
      promptName: event?.event?.audioInput?.promptName,
      contentName: event?.event?.audioInput?.contentName,
      contentLength
    }, `${emoji} TO BEDROCK: [${eventType}] (${contentLength} bytes)`);
  } else {
    // For non-audio events, we can log more details
    bedrockLogger[logLevel]({ 
      sessionId, 
      eventType,
      event
    }, `${emoji} TO BEDROCK: [${eventType}]`);
  }
}

// Helper function to color-code incoming events from Bedrock
export function logBedrockIncomingEvent(sessionId: string, eventType: string, data: any): void {
  // Choose emoji based on event type
  let emoji;
  
  switch (eventType) {
    case 'contentStart':
      emoji = '📥';
      break;
    case 'textOutput':
      emoji = '💬';
      break;
    case 'audioOutput':
      emoji = '🔊';
      break;
    case 'contentEnd':
      emoji = '🏁';
      break;
    case 'toolUse':
      emoji = '🔧';
      break;
    case 'toolResult':
      emoji = '🔨';
      break;
    case 'error':
      emoji = '❌';
      break;
    default:
      emoji = '📩';
  }
  
  // Determine the appropriate log level based on event type
  const logLevel = determineLogLevel(eventType);
  
  // For audio events, don't log the full content
  if (eventType === 'audioOutput') {
    const contentLength = data?.content?.length || 0;
    bedrockLogger[logLevel]({ 
      sessionId, 
      eventType,
      contentLength
    }, `${emoji} FROM BEDROCK: [${eventType}] (${contentLength} bytes)`);
  } else {
    // For non-audio events, we can log more details
    bedrockLogger[logLevel]({ 
      sessionId, 
      eventType,
      data
    }, `${emoji} FROM BEDROCK: [${eventType}]`);
  }
}
