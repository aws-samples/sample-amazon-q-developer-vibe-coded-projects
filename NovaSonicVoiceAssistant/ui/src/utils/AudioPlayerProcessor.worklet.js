// Audio sample buffer to minimize reallocations
class ExpandableBuffer {

    constructor() {
        // Use sampleRate from the AudioContext instead of hardcoding
        // Default to 48000 (common browser default) if sampleRate is not available for some reason
        const bufferSize = typeof sampleRate !== 'undefined' ? sampleRate : 48000;
        this.buffer = new Float32Array(bufferSize);
        this.readIndex = 0;
        this.writeIndex = 0;
        this.underflowedSamples = 0;
        this.isInitialBuffering = true;
        this.initialBufferLength = bufferSize;  // One second at current sample rate
        this.lastWriteTime = 0;
        
        console.log('ExpandableBuffer created with browser sample rate:', bufferSize);
    }

    logTimeElapsedSinceLastWrite() {
        const now = Date.now();
        if (this.lastWriteTime !== 0) {
            const elapsed = now - this.lastWriteTime;
        }
        this.lastWriteTime = now;
    }

    write(samples) {
        this.logTimeElapsedSinceLastWrite();
        if (this.writeIndex + samples.length <= this.buffer.length) {
            // Enough space to append the new samples
        }
        else {
            // Not enough space ...
            if (samples.length <= this.readIndex) {
                // ... but we can shift samples to the beginning of the buffer
                const subarray = this.buffer.subarray(this.readIndex, this.writeIndex);
                this.buffer.set(subarray);
            }
            else {
                // ... and we need to grow the buffer capacity to make room for more audio
                const newLength = (samples.length + this.writeIndex - this.readIndex) * 2;
                const newBuffer = new Float32Array(newLength);
                newBuffer.set(this.buffer.subarray(this.readIndex, this.writeIndex));
                this.buffer = newBuffer;
            }
            this.writeIndex -= this.readIndex;
            this.readIndex = 0;
        }
        this.buffer.set(samples, this.writeIndex);
        this.writeIndex += samples.length;
        if (this.writeIndex - this.readIndex >= this.initialBufferLength) {
            // Filled the initial buffer length, so we can start playback with some cushion
            this.isInitialBuffering = false;
        }
    }

    read(destination) {
        let copyLength = 0;
        if (!this.isInitialBuffering) {
            // Only start to play audio after we've built up some initial cushion
            copyLength = Math.min(destination.length, this.writeIndex - this.readIndex);
        }
        destination.set(this.buffer.subarray(this.readIndex, this.readIndex + copyLength));
        this.readIndex += copyLength;
        if (copyLength > 0 && this.underflowedSamples > 0) {
            this.underflowedSamples = 0;
        }
        if (copyLength < destination.length) {
            // Not enough samples (buffer underflow). Fill the rest with silence.
            destination.fill(0, copyLength);
            this.underflowedSamples += destination.length - copyLength;
        }
        if (copyLength === 0) {
            // Ran out of audio, so refill the buffer to the initial length before playing more
            this.isInitialBuffering = true;
        }
    }

    clearBuffer() {
        console.log('Clearing audio buffer for barge-in');
        this.readIndex = 0;
        this.writeIndex = 0;
        this.isInitialBuffering = true;  // Reset this flag to ensure proper buffering
    }
}

class AudioPlayerProcessor extends AudioWorkletProcessor {
    constructor() {
        super();
        this.playbackBuffer = new ExpandableBuffer();
        
        // Log the actual sample rate being used
        console.log(`AudioPlayerProcessor initialized with browser sample rate: ${sampleRate}Hz`);
        
        this.port.onmessage = (event) => {
            if (event.data.type === "audio") {
                this.playbackBuffer.write(event.data.audioData);
            }
            else if (event.data.type === "initial-buffer-length") {
                // Override the current playback initial buffer length
                const newLength = event.data.bufferLength;
                this.playbackBuffer.initialBufferLength = newLength;
            }
            else if (event.data.type === "barge-in") {
                this.playbackBuffer.clearBuffer();
            }
        };
    }

    process(inputs, outputs, parameters) {
        const output = outputs[0][0]; // Assume one output with one channel
        this.playbackBuffer.read(output);
        return true; // True to continue processing
    }
}

registerProcessor("audio-player-processor", AudioPlayerProcessor);
