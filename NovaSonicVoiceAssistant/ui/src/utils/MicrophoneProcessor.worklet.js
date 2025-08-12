/**
 * AudioWorklet processor for microphone input processing
 * Replaces the deprecated ScriptProcessorNode
 */
class MicrophoneProcessor extends AudioWorkletProcessor {
  constructor() {
    super();
    
    // Flag to track if we're actively processing
    this.isActive = true;
    
    // NovaSonic expected input sample rate
    this.novaSonicInputSampleRate = 16000;
    
    // Log the actual sample rate being used
    console.log(`MicrophoneProcessor initialized with browser sample rate: ${sampleRate}Hz, 
                target NovaSonic input rate: ${this.novaSonicInputSampleRate}Hz`);
    
    // Handle messages from the main thread
    this.port.onmessage = (event) => {
      if (event.data.type === "stop") {
        this.isActive = false;
      } else if (event.data.type === "start") {
        this.isActive = true;
      }
    };
  }

  process(inputs, outputs, parameters) {
    // Skip processing if not active
    if (!this.isActive) return true;
    
    // Get the input data (microphone)
    const input = inputs[0];
    if (!input || !input.length) return true;
    
    const inputChannel = input[0];
    if (!inputChannel || !inputChannel.length) return true;
    
    // Resample from browser's rate to NovaSonic's expected input rate (16kHz)
    // Calculate the ratio between the sample rates
    const ratio = sampleRate / this.novaSonicInputSampleRate;
    const downsampledLength = Math.floor(inputChannel.length / ratio);
    const downsampledData = new Float32Array(downsampledLength);
    
    // Use a more accurate downsampling algorithm with linear interpolation
    for (let i = 0; i < downsampledLength; i++) {
      const sourceIndex = i * ratio;
      const index = Math.floor(sourceIndex);
      const fraction = sourceIndex - index;
      
      // Linear interpolation
      if (index + 1 < inputChannel.length) {
        downsampledData[i] = inputChannel[index] * (1 - fraction) + inputChannel[index + 1] * fraction;
      } else {
        downsampledData[i] = inputChannel[index];
      }
    }
    
    // Convert to 16-bit PCM
    const pcmData = new Int16Array(downsampledData.length);
    for (let i = 0; i < downsampledData.length; i++) {
      // Clamp values between -1 and 1, then scale to 16-bit range
      pcmData[i] = Math.max(-1, Math.min(1, downsampledData[i])) * 0x7FFF;
    }
    
    // Create a buffer with the exact size needed for the PCM data
    const buffer = new ArrayBuffer(pcmData.length * 2); // 2 bytes per sample for 16-bit audio
    const view = new DataView(buffer);
    
    // Write the PCM data to the buffer in little-endian format
    for (let i = 0; i < pcmData.length; i++) {
      view.setInt16(i * 2, pcmData[i], true); // true for little-endian
    }
    
    // Convert to Uint8Array for sending to main thread
    const uint8Array = new Uint8Array(buffer);
    
    // Send the processed audio data back to the main thread
    this.port.postMessage({
      type: "audioData",
      audioData: uint8Array
    });
    
    // Return true to keep the processor running
    return true;
  }
}

registerProcessor("microphone-processor", MicrophoneProcessor);
