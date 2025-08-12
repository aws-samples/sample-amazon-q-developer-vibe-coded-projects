/**
 * Export utility functions and classes
 */

export * from './ServerEventsLogHandler';
export * from './WebSocketClient';
export { 
  getSharedAudioContext, 
  closeSharedAudioContext,
  NOVASONIC_INPUT_SAMPLE_RATE,
  NOVASONIC_OUTPUT_SAMPLE_RATE
} from './sharedAudioContext';
