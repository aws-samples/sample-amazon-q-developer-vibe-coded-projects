/**
 * ServerEventsLogHandler.ts
 * 
 * A utility for logging WebSocket server events with color coding and formatting
 * to improve readability in the browser console.
 */

/**
 * Message styles for different event types
 */
const messageStyles = {
  // Content related messages
  contentStart: 'color: #4CAF50; font-weight: bold;', // Green
  textOutput: 'color: #2196F3;', // Blue
  contentEnd: 'color: #9C27B0; font-weight: bold;', // Purple
  
  // Session related messages
  sessionStarted: 'color: #FF9800; font-weight: bold;', // Orange
  sessionReady: 'color: #009688; font-weight: bold;', // Teal
  systemPromptSet: 'color: #009688; font-weight: bold;', // Teal
  
  // Audio related messages
  audioStarted: 'color: #795548; font-weight: bold;', // Brown
  audioStopped: 'color: #795548;', // Brown
  
  // Status messages
  streamComplete: 'color: #607D8B; font-weight: bold;', // Blue Grey
  
  // Error messages
  error: 'color: #F44336; font-weight: bold; background-color: #FFEBEE;', // Red with light background
  sessionTimeout: 'color: #FF5722; font-weight: bold;', // Deep Orange
  
  // Default style
  default: 'color: #000000;' // Black
};

/**
 * Log a server event with color coding and structured format
 * @param data The event data to log
 */
export function logServerEvent(data: any): void {
  if (!data || !data.type) return;
  
  // Skip logging audio data which would be too large
  if (data.type === 'audioOutput' || data.type === 'audioData') {
    return;
  }

  const style = messageStyles[data.type] || messageStyles.default;
  
  // Create a formatted message with type highlighted
  console.groupCollapsed(`%c[${data.type}] WebSocket Message`, style);
  
  // Log the timestamp
  console.log(
    '%cTimestamp:',
    'color: #888888; font-weight: bold;',
    new Date().toISOString()
  );
  
  // Log specific details based on message type
  switch (data.type) {
    case 'contentStart':
      if (data.data) {
        console.log(
          '%cContent Type:',
          'font-weight: bold;',
          data.data.type
        );
        console.log(
          '%cRole:',
          'font-weight: bold;',
          data.data.role
        );
        console.log(
          '%cIDs:',
          'font-weight: bold;',
          `completionId: ${data.data.completionId || 'none'}, contentId: ${data.data.contentId || 'none'}`
        );
        if (data.data.additionalModelFields) {
          try {
            const additionalFields = typeof data.data.additionalModelFields === 'string' 
              ? JSON.parse(data.data.additionalModelFields)
              : data.data.additionalModelFields;
            console.log(
              '%cAdditional Fields:',
              'font-weight: bold;',
              additionalFields
            );
          } catch (e) {
            console.log(
              '%cAdditional Fields (raw):',
              'font-weight: bold;',
              data.data.additionalModelFields
            );
          }
        }
      }
      break;
      
    case 'textOutput':
      if (data.data) {
        console.log(
          '%cRole:',
          'font-weight: bold;',
          data.data.role
        );
        console.log(
          '%cContent:',
          'font-weight: bold;',
          data.data.content
        );
        console.log(
          '%cIDs:',
          'font-weight: bold;',
          `completionId: ${data.data.completionId || 'none'}, contentId: ${data.data.contentId || 'none'}`
        );
      }
      break;
      
    case 'contentEnd':
      if (data.data) {
        console.log(
          '%cContent Type:',
          'font-weight: bold;',
          data.data.type
        );
        console.log(
          '%cRole:',
          'font-weight: bold;',
          data.data.role
        );
        console.log(
          '%cStop Reason:',
          'font-weight: bold;',
          data.data.stopReason || 'none'
        );
        console.log(
          '%cIDs:',
          'font-weight: bold;',
          `completionId: ${data.data.completionId || 'none'}, contentId: ${data.data.contentId || 'none'}`
        );
      }
      break;
      
    case 'error':
      if (data.data) {
        console.log(
          '%cError Message:',
          'color: #F44336; font-weight: bold;',
          data.data.message
        );
        if (data.data.details) {
          console.log(
            '%cDetails:',
            'font-weight: bold;',
            data.data.details
          );
        }
        if (data.data.code) {
          console.log(
            '%cCode:',
            'font-weight: bold;',
            data.data.code
          );
        }
      }
      break;
      
    case 'sessionTimeout':
      if (data.data) {
        console.log(
          '%cTimeout Message:',
          'font-weight: bold;',
          data.data.message
        );
        console.log(
          '%cSession ID:',
          'font-weight: bold;',
          data.data.sessionId
        );
      }
      break;
      
    default:
      // For other message types, just log the data
      console.log('%cData:', 'font-weight: bold;', data.data);
  }
  
  // Log the full message for reference (collapsed)
  console.groupCollapsed('%cFull Message Details', 'color: #888888;');
  console.log(data);
  console.groupEnd();
  
  console.groupEnd();
}

/**
 * Determine if we're in development mode
 * For Vite, check if import.meta.env.DEV is true
 * Fall back to checking if hostname is localhost or 127.0.0.1
 */
const isDevelopment = (): boolean => {
  try {
    // Check for Vite's development flag
    if (typeof import.meta !== 'undefined' && import.meta.env && import.meta.env.DEV !== undefined) {
      return import.meta.env.DEV === true;
    }
  } catch (e) {
    // If import.meta is not available, fall back to hostname check
  }
  
  // Check if we're on localhost or a development domain
  const hostname = window.location.hostname;
  return hostname === 'localhost' || 
         hostname === '127.0.0.1' || 
         hostname.includes('.local') ||
         hostname.endsWith('.dev');
};

/**
 * Enable or disable server event logging
 * Default to enabled only in development mode
 */
let loggingEnabled = isDevelopment();

// Log initial state on load
if (loggingEnabled) {
  console.log(
    '%cServer event logging enabled (development mode)',
    'color: #4CAF50; font-weight: bold; background-color: #E8F5E9; padding: 5px; border-radius: 3px;'
  );
}

/**
 * Enable server event logging
 */
export function enableServerEventLogging(): void {
  loggingEnabled = true;
  console.log('%cServer event logging enabled', 'color: #4CAF50; font-weight: bold;');
}

/**
 * Disable server event logging
 */
export function disableServerEventLogging(): void {
  loggingEnabled = false;
  console.log('%cServer event logging disabled', 'color: #F44336; font-weight: bold;');
}

/**
 * Log a server event if logging is enabled
 * @param data The event data to log
 */
export function logServerEventIfEnabled(data: any): void {
  if (loggingEnabled) {
    logServerEvent(data);
  }
}

/**
 * Toggle server event logging
 * @returns The new logging state
 */
export function toggleServerEventLogging(): boolean {
  loggingEnabled = !loggingEnabled;
  if (loggingEnabled) {
    console.log('%cServer event logging enabled', 'color: #4CAF50; font-weight: bold;');
  } else {
    console.log('%cServer event logging disabled', 'color: #F44336; font-weight: bold;');
  }
  return loggingEnabled;
}

/**
 * Get the current logging state
 * @returns Whether logging is enabled
 */
export function isServerEventLoggingEnabled(): boolean {
  return loggingEnabled;
}
