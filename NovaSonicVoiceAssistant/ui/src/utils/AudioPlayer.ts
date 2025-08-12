import { getSharedAudioContext, resampleAudio, NOVASONIC_OUTPUT_SAMPLE_RATE } from './sharedAudioContext';

/**
 * Audio player utility for handling audio playback using AudioWorklet
 */
class AudioPlayer {
  private audioContext: AudioContext | null = null;
  private workletNode: AudioWorkletNode | null = null;
  private isInitialized: boolean = false;

  /**
   * Initialize the audio player
   */
  async start(): Promise<void> {
    if (this.isInitialized) return;
    
    try {
      // Use the shared AudioContext instead of creating a new one
      this.audioContext = getSharedAudioContext();
      console.log('AudioPlayer using shared context with sample rate:', this.audioContext.sampleRate);
      
      // Load the audio worklet
      const workletUrl = new URL('./AudioPlayerProcessor.worklet.js', import.meta.url).toString();
      
      // Check if the worklet module is already loaded to avoid duplicate registration causing problems in Firefox
      try {
        await this.audioContext.audioWorklet.addModule(workletUrl);
        console.log('AudioPlayer worklet module loaded');
      } catch (error) {
        // If the error is about the module already being defined, we can ignore it
        if (error instanceof Error && error.message.includes('already been defined')) {
          console.log('AudioPlayer worklet module already loaded, continuing');
        } else {
          // Otherwise, rethrow the error
          throw error;
        }
      }
      
      // Create the worklet node
      this.workletNode = new AudioWorkletNode(this.audioContext, "audio-player-processor");
      
      // Connect the node to the destination
      this.workletNode.connect(this.audioContext.destination);
      
      this.isInitialized = true;
    } catch (error) {
      console.error('Failed to initialize audio player:', error);
      throw error;
    }
  }

  /**
   * Stop the audio player and release resources
   */
  stop(): void {
    console.log('Stopping audio player');
    
    if (this.workletNode) {
      this.workletNode.disconnect();
      this.workletNode = null;
    }
    
    // Don't close the shared AudioContext, just remove our reference
    this.audioContext = null;
    
    this.isInitialized = false;
  }

  /**
   * Interrupt current audio playback (barge-in)
   */
  bargeIn(): void {
    if (this.workletNode) {
      this.workletNode.port.postMessage({
        type: "barge-in"
      });
    }
  }

  /**
   * Set the initial buffer length for audio playback
   * @param bufferLength Length in samples
   */
  setInitialBufferLength(bufferLength: number): void {
    if (this.workletNode) {
      this.workletNode.port.postMessage({
        type: "initial-buffer-length",
        bufferLength: bufferLength
      });
    }
  }

  /**
   * Convert base64 audio data to Float32Array
   * @param base64Audio Base64 encoded audio data
   * @returns Float32Array of audio samples
   */
  base64ToFloat32Array(base64Audio: string): Float32Array {
    try {
      // Decode base64 to binary
      const binaryString = window.atob(base64Audio);
      const len = binaryString.length;
      const bytes = new Uint8Array(len);
      
      // Convert binary to Uint8Array
      for (let i = 0; i < len; i++) {
        bytes[i] = binaryString.charCodeAt(i);
      }
      
      // Convert to Int16Array (assuming 16-bit PCM as per documentation)
      const int16 = new Int16Array(bytes.buffer);
      
      // Convert to Float32Array for Web Audio API
      const float32 = new Float32Array(int16.length);
      for (let i = 0; i < int16.length; i++) {
        // Convert from 16-bit integer to float
        float32[i] = int16[i] / 32768.0;
      }
      
      return float32;
    } catch (error) {
      console.error('Error converting base64 to Float32Array:', error);
      throw error;
    }
  }

  /**
   * Play audio data using the AudioWorklet
   * @param audioData Float32Array of audio samples
   */
  playAudio(audioData: Float32Array): void {
    if (!this.isInitialized || !this.audioContext || !this.workletNode) {
      console.error('Audio player not initialized');
      return;
    }
    
    try {
      // Make sure the audio context is running (needed for Safari)
      if (this.audioContext.state === 'suspended') {
        this.audioContext.resume().catch(console.error);
      }
      
      // Convert from NovaSonic's OUTPUT rate (24kHz) to the browser's default rate
      const browserSampleRate = this.audioContext.sampleRate;
      
      // Resample if the rates don't match
      let dataToPlay = audioData;
      if (NOVASONIC_OUTPUT_SAMPLE_RATE !== browserSampleRate) {
        dataToPlay = resampleAudio(audioData, NOVASONIC_OUTPUT_SAMPLE_RATE, browserSampleRate);
        console.log(`Resampled audio from ${NOVASONIC_OUTPUT_SAMPLE_RATE}Hz to ${browserSampleRate}Hz, 
                    original length: ${audioData.length}, new length: ${dataToPlay.length}`);
      }
      
      // Send the resampled audio data to the worklet
      this.workletNode.port.postMessage({
        type: "audio",
        audioData: dataToPlay
      });
      
    } catch (error) {
      console.error('Error playing audio:', error);
    }
  }
}

// Create singleton instance
const audioPlayer = new AudioPlayer();
export default audioPlayer;
