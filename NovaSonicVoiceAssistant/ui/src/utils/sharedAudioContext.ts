/**
 * Shared AudioContext singleton to ensure all audio processing uses the same context
 * This prevents the Firefox error: "Connecting AudioNodes from AudioContexts with different sample-rate is currently not supported"
 */

// NovaSonic expected sample rates
export const NOVASONIC_INPUT_SAMPLE_RATE = 16000;  // 16 kHz for microphone input
export const NOVASONIC_OUTPUT_SAMPLE_RATE = 24000; // 24 kHz for audio output

// Store the original constructors
const OriginalAudioContext = window.AudioContext || (window as any).webkitAudioContext;

// Create a singleton AudioContext that will be shared across the application
let sharedAudioContext: AudioContext | null = null;

export function getSharedAudioContext(): AudioContext {
  if (!sharedAudioContext) {
    try {
      // Use browser's default sample rate by not specifying options
      sharedAudioContext = new OriginalAudioContext();
      console.log('Created shared AudioContext with browser default sample rate:', sharedAudioContext.sampleRate);
    } catch (error) {
      console.error('Failed to create shared AudioContext:', error);
      throw error;
    }
  }
  
  // Resume the context if it's suspended (needed for Safari)
  if (sharedAudioContext.state === 'suspended') {
    sharedAudioContext.resume().catch(console.error);
  }
  
  return sharedAudioContext;
}

export function closeSharedAudioContext(): void {
  if (sharedAudioContext) {
    sharedAudioContext.close().catch(console.error);
    sharedAudioContext = null;
    console.log('Closed shared AudioContext');
  }
}

// Create the shared context immediately
getSharedAudioContext();

// Aggressively patch the AudioContext constructor to always return our shared instance
function createAudioContextProxy() {
  // Create a proxy constructor that always returns our shared instance
  const AudioContextProxy = function(this: any, _options?: AudioContextOptions) {
    console.log('AudioContext constructor intercepted, returning shared instance');
    return getSharedAudioContext();
  } as any;
  
  // Copy prototype and properties from the original constructor
  AudioContextProxy.prototype = OriginalAudioContext.prototype;
  
  // Replace the global constructors
  window.AudioContext = AudioContextProxy;
  if ((window as any).webkitAudioContext) {
    (window as any).webkitAudioContext = AudioContextProxy;
  }
}

// Execute the patching
createAudioContextProxy();

/**
 * Utility function to resample audio data between different sample rates
 * Uses a more accurate linear interpolation algorithm
 * 
 * @param audioData The original audio data
 * @param fromSampleRate The original sample rate
 * @param toSampleRate The target sample rate
 * @returns Resampled audio data
 */
export function resampleAudio(audioData: Float32Array, fromSampleRate: number, toSampleRate: number): Float32Array {
  if (fromSampleRate === toSampleRate) {
    return audioData;
  }
  
  // Calculate the ratio between the sample rates
  const ratio = fromSampleRate / toSampleRate;
  
  // Calculate the new length based on the ratio
  const newLength = Math.round(audioData.length / ratio);
  const result = new Float32Array(newLength);
  
  // Use a more accurate resampling algorithm with linear interpolation
  for (let i = 0; i < newLength; i++) {
    const sourceIndex = i * ratio;
    const index = Math.floor(sourceIndex);
    const fraction = sourceIndex - index;
    
    // Linear interpolation between samples
    if (index + 1 < audioData.length) {
      result[i] = audioData[index] * (1 - fraction) + audioData[index + 1] * fraction;
    } else {
      result[i] = audioData[index];
    }
  }
  
  return result;
}
