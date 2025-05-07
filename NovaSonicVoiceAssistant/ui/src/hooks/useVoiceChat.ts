import { useState, useEffect, useRef } from 'react';
import { WebSocketClient } from '../utils/WebSocketClient';
import audioPlayer from '../utils/AudioPlayer';
import { getSharedAudioContext } from '../utils';

// Declare global AudioContext types for TypeScript
declare global {
  interface Window {
    webkitAudioContext: typeof AudioContext;
  }
}

interface UseVoiceChatOptions {
  onTranscriptionReceived?: (text: string, completionId?: string, contentId?: string) => void;
  onResponseReceived?: (text: string, completionId?: string, contentId?: string) => void;
  onSessionTimeout?: () => void; // New callback for session timeout
  chatHistory?: Array<{
    text: string;
    isUser: boolean;
    isSystem?: boolean;
  }>;
}

// Create a singleton WebSocket client that can be shared across instances
let sharedWsClient: WebSocketClient | null = null;

/**
 * Hook for voice chat functionality with a simplified API.
 * Provides three main methods:
 * - startConversation: Initialize everything needed for the conversation
 * - startListening: Begin audio capture from the microphone
 * - stopListening: End audio capture
 */
export const useVoiceChat = ({
  onTranscriptionReceived,
  onResponseReceived,
  onSessionTimeout,
  chatHistory
}: UseVoiceChatOptions = {}) => {
  // State variables
  const [isConnected, setIsConnected] = useState(false);
  const [isListening, setIsListening] = useState(false);
  const [status, setStatus] = useState('Initializing...');
  const [waitingForUserTranscription, setWaitingForUserTranscription] = useState(false);
  const [waitingForAssistantResponse, setWaitingForAssistantResponse] = useState(false);
  const [transcription, setTranscription] = useState('');
  const [response, setResponse] = useState('');
  const [isAudioReady, setIsAudioReady] = useState(false);
  const [isSessionReady, setIsSessionReady] = useState(false);
  
  // Add a callback registry for contentEnd events
  const contentEndCallbacksRef = useRef<Array<(data: any) => void>>([]);
  
  // Function to register a callback for contentEnd events
  const registerContentEndCallback = (callback: (data: any) => void) => {
    contentEndCallbacksRef.current.push(callback);
    return () => {
      // Return function to unregister the callback
      contentEndCallbacksRef.current = contentEndCallbacksRef.current.filter(cb => cb !== callback);
    };
  };
  
  // Store options in a ref to access in callbacks
  const optionsRef = useRef({ chatHistory });
  
  // Update options ref when props change
  useEffect(() => {
    optionsRef.current = { chatHistory };
  }, [chatHistory]);
  
  // Refs
  const wsClientRef = useRef<WebSocketClient | null>(null);
  const mediaStreamRef = useRef<MediaStream | null>(null);
  const audioContextRef = useRef<AudioContext | null>(null);
  const workletNodeRef = useRef<AudioWorkletNode | null>(null);
  const displayAssistantTextRef = useRef<boolean>(false);
  const initializationAttemptedRef = useRef<boolean>(false);
  
  // Initialize WebSocket and audio processing
  useEffect(() => {
    console.log('useVoiceChat effect running - initializing');
    
    // Initialize audio player with retry logic
    const initAudioPlayer = async () => {
      try {
        await audioPlayer.start();
      } catch (error) {
        console.error('Failed to initialize audio player:', error);
        // Don't automatically retry - the error is already being handled
      }
    };
    
    initAudioPlayer();
    
    // Use the shared WebSocket client or create a new one
    if (!sharedWsClient) {
      sharedWsClient = new WebSocketClient();
    }
    
    wsClientRef.current = sharedWsClient;
    
    // Clear all existing handlers before setting up new ones
    // This prevents duplicate handlers when the component is unmounted and remounted
    if (wsClientRef.current) {
      wsClientRef.current.clearAllHandlers();
      
      // Set up WebSocket event handlers
      wsClientRef.current.onConnect(() => {
        setIsConnected(true);
        setStatus('Connected');
        
        // Automatically start a conversation when connected
        if (!initializationAttemptedRef.current) {
          initializationAttemptedRef.current = true;
          startConversation();
        } else {
          // If we've already attempted initialization before, try again
          // This handles the case where the component was unmounted and remounted
          startConversation();
        }
      });
      
      wsClientRef.current.onDisconnect(() => {
        setIsConnected(false);
        setStatus('Disconnected');
        setIsListening(false);
        setIsSessionReady(false);
        setIsAudioReady(false);
        stopListening();
      });
      
      wsClientRef.current.onError(() => {
        setStatus('Connection error');
      });
      
      // Handle different message types
      wsClientRef.current.onMessage('sessionStarted', () => {
        // Session has started, waiting for it to be ready
        console.log('Session started event received');
      });
      
      wsClientRef.current.onMessage('sessionReady', () => {
        console.log('Session ready event received');
        setIsSessionReady(true);
        setIsAudioReady(true);
        setStatus('Ready');
      });
      
      // Legacy event handlers - these should eventually be removed when backend is updated
      wsClientRef.current.onMessage('systemPromptSet', () => {
        console.log('System prompt set event received');
        setIsSessionReady(true);
        setIsAudioReady(true);
        setStatus('Ready');
      });
      
      wsClientRef.current.onMessage('audioStarted', () => {
        setIsListening(true);
        setWaitingForUserTranscription(true);
        setStatus('Listening...');
      });
      
      wsClientRef.current.onMessage('audioStopped', () => {
        setIsListening(false);
        setStatus('Stopped listening');
      });
      
      wsClientRef.current.onMessage('sessionTimeout', () => {
        setStatus('Session timed out');
        
        // Call the onSessionTimeout callback if provided
        if (onSessionTimeout) {
          onSessionTimeout();
        }
      });
      
      wsClientRef.current.onMessage('contentStart', (data) => {
        if (data.data && data.data.type === 'TEXT') {
          if (data.data.role === 'USER') {
            setWaitingForUserTranscription(true);
          } else if (data.data.role === 'ASSISTANT') {
            setWaitingForAssistantResponse(true);
            setWaitingForUserTranscription(false);
            
            // Check if this is speculative content
            try {
              if (data.data.additionalModelFields) {
                const additionalFields = JSON.parse(data.data.additionalModelFields);
                const isSpeculative = additionalFields.generationStage === "SPECULATIVE";
                displayAssistantTextRef.current = isSpeculative;
                
                // Execute all registered contentStart callbacks when generationStage is FINAL
                if (additionalFields.generationStage === "FINAL") {
                  contentEndCallbacksRef.current.forEach(callback => {
                    try {
                      callback(data);
                    } catch (error) {
                      console.error('Error in contentStart callback:', error);
                    }
                  });
                }
              } else {
                displayAssistantTextRef.current = true;
              }
            } catch (e) {
              displayAssistantTextRef.current = true;
            }
          }
        }
      });
      
      wsClientRef.current.onMessage('textOutput', (data) => {
        if (data.data && data.data.content) {
          const text = data.data.content;
          const role = data.data.role || 'ASSISTANT';
          const completionId = data.data.completionId;
          const contentId = data.data.contentId;
          
          if (role === 'USER') {
            setWaitingForUserTranscription(false);
            setWaitingForAssistantResponse(true);
            setTranscription(text);
            
            // Call callback if provided with all message data
            if (onTranscriptionReceived) {
              onTranscriptionReceived(text, completionId, contentId);
            }
          } else if (role === 'ASSISTANT' && displayAssistantTextRef.current) {
            // Still append to response for backward compatibility
            setResponse(prev => prev + text);
            
            // Call callback with all message data
            if (onResponseReceived) {
              onResponseReceived(text, completionId, contentId);
            }
          }
        }
      });
      
      wsClientRef.current.onMessage('audioOutput', (data) => {
        if (data.data && data.data.content) {
          try {
            const audioData = audioPlayer.base64ToFloat32Array(data.data.content);
            audioPlayer.playAudio(audioData);
          } catch (error) {
            console.error('Error processing audio data:', error);
          }
        }
      });
      
      wsClientRef.current.onMessage('contentEnd', (data) => {
        if (data.data && data.data.type === 'TEXT') {
          if (data.data.role === 'USER') {
            setWaitingForUserTranscription(false);
          } else if (data.data.role === 'ASSISTANT') {
            setWaitingForAssistantResponse(false);
          }
          
          // We're no longer triggering callbacks here - moved to contentStart with generationStage: 'FINAL'
          
          if (data.data.stopReason && data.data.stopReason.toUpperCase() === 'INTERRUPTED') {
            audioPlayer.bargeIn();
          }
        }
      });
      
      wsClientRef.current.onMessage('error', (data) => {
        setStatus(`Error: ${data.message}`);
      });
      
      // Connect to WebSocket server if not already connected
      if (!wsClientRef.current.isConnectedToServer()) {
        console.log('Connecting to WebSocket server...');
        wsClientRef.current.connect().catch((error) => {
          console.error('Connection failed:', error);
          setStatus('Connection failed');
        });
      } else {
        console.log('Already connected to WebSocket server');
        setIsConnected(true);
        setStatus('Connected');
        
        // If already connected, start conversation
        console.log('Starting conversation because already connected');
        startConversation();
      }
    }
    
    // Clean up on unmount - but don't disconnect the shared client
    return () => {
      stopListening();
      audioPlayer.stop();
      
      // Don't disconnect the shared WebSocket client
      // Just remove our reference to it
      wsClientRef.current = null;
    };
  }, []); // Empty dependency array - only run once
  
  /**
   * Starts a new conversation session.
   * This initializes everything needed for the conversation.
   */
  const startConversation = async () => {
    console.log('Starting conversation...');
    if (!wsClientRef.current || !wsClientRef.current.isConnectedToServer()) {
      console.log('Cannot start conversation - WebSocket not connected');
      return;
    }
    
    try {
      setStatus('Starting conversation...');
      
      // Format previous messages for history (excluding system messages)
      let chatHistoryText = '';
      if (optionsRef.current.chatHistory && optionsRef.current.chatHistory.length > 0) {
        chatHistoryText = optionsRef.current.chatHistory
          .filter(msg => !msg.isSystem)
          .map(msg => `${msg.isUser ? 'User' : 'Assistant'}: ${msg.text}`)
          .join('\n');
      }
      
      // Send startSession command with chat history
      wsClientRef.current.send({ 
        type: 'startSession',
        content: chatHistoryText || undefined
      });
      console.log('Sent startSession command with chat history');
      
      setStatus('Initializing...');
    } catch (error) {
      console.error('Error starting conversation:', error);
      setStatus(`Error: ${error instanceof Error ? error.message : String(error)}`);
    }
  };
  
  /**
   * Starts listening to the user's microphone.
   * Requires an active conversation session.
   */
  const startListening = async () => {
    if (!isConnected) {
      setStatus('Not connected to server');
      return;
    }
    
    if (!isSessionReady) {
      await startConversation();
      
      // Wait for session to be ready
      let attempts = 0;
      while (!isSessionReady && attempts < 10) {
        await new Promise(resolve => setTimeout(resolve, 500));
        attempts++;
      }
      
      if (!isSessionReady) {
        setStatus('Failed to initialize session');
        return;
      }
    }
    
    // Force reset the listening state to ensure we can start
    if (isListening) {
      setIsListening(false);
      stopListening();
    }
    
    try {
      setStatus('Starting microphone...');
      
      // Request microphone access first
      const constraints = { 
        audio: {
          echoCancellation: true,
          noiseSuppression: true,
          autoGainControl: true
        } 
      };
      
      const stream = await navigator.mediaDevices.getUserMedia(constraints);
      mediaStreamRef.current = stream;
      
      // Use the shared AudioContext instead of creating a new one
      const audioContext = getSharedAudioContext();
      audioContextRef.current = audioContext;
      console.log('useVoiceChat using shared context:', audioContext);
      
      // Create source from microphone stream
      const source = audioContext.createMediaStreamSource(stream);
      
      // Load the AudioWorklet module
      const workletUrl = new URL('../utils/MicrophoneProcessor.worklet.js', import.meta.url).toString();
      
      // Check if the worklet module is already loaded to avoid duplicate registration
      try {
        await audioContext.audioWorklet.addModule(workletUrl);
        console.log('MicrophoneProcessor worklet module loaded');
      } catch (error) {
        // If the error is about the module already being defined, we can ignore it
        if (error instanceof Error && error.message.includes('already been defined')) {
          console.log('MicrophoneProcessor worklet module already loaded, continuing');
        } else {
          // Otherwise, rethrow the error
          throw error;
        }
      }
      
      // Create the AudioWorklet node
      const workletNode = new AudioWorkletNode(audioContext, 'microphone-processor');
      workletNodeRef.current = workletNode;
      
      // Send audioStart message to server AFTER we have microphone access
      if (wsClientRef.current && wsClientRef.current.isConnectedToServer()) {
        wsClientRef.current.send({ type: 'audioStart' });
      }
      
      // Handle audio data from the worklet
      workletNode.port.onmessage = (event) => {
        if (!wsClientRef.current || !wsClientRef.current.isConnectedToServer() || !event.data || event.data.type !== 'audioData') {
          return;
        }
        
        try {
          // Convert Uint8Array to base64
          const uint8Array = event.data.audioData;
          const base64Audio = btoa(
            Array.from(uint8Array as Uint8Array)
              .map(b => String.fromCharCode(b))
              .join('')
          );
          
          // Send audio data to server
          wsClientRef.current.send({
            type: 'audioData',
            audio: base64Audio
          });
        } catch (error) {
          console.error('Error in audio processing:', error);
        }
      };
      
      // Connect nodes
      source.connect(workletNode);
      // Note: We don't connect to destination as we don't want to hear the microphone input
      
      // Start the worklet processing
      workletNode.port.postMessage({ type: 'start' });
      
      // Reset conversation state
      setTranscription('');
      setResponse('');
      
    } catch (error) {
      setStatus(`Error: ${error instanceof Error ? error.message : String(error)}`);
    }
  };
  
  /**
   * Stops listening to the user's microphone.
   */
  const stopListening = () => {
    // Notify server that we're stopping audio
    if (wsClientRef.current && wsClientRef.current.isConnectedToServer() && isListening) {
      wsClientRef.current.send({ type: 'audioStop' });
    }
    
    // Stop processor node if exists
    if (workletNodeRef.current) {
      workletNodeRef.current.port.postMessage({ type: 'stop' });
      workletNodeRef.current.disconnect();
      workletNodeRef.current = null;
    }
    
    // Don't close the shared AudioContext, just remove our reference
    audioContextRef.current = null;
    
    // Stop all tracks in the media stream
    if (mediaStreamRef.current) {
      mediaStreamRef.current.getTracks().forEach(track => track.stop());
      mediaStreamRef.current = null;
    }
    
    // Update state
    setIsListening(false);
  };

  return {
    isConnected,
    isListening,
    isSessionReady,
    status,
    waitingForUserTranscription,
    waitingForAssistantResponse,
    transcription,
    response,
    isAudioReady,
    
    // Simplified API with just three essential methods
    startConversation,
    startListening,
    stopListening,
    
    // Add the new registerContentEndCallback function
    registerContentEndCallback
  };
};
