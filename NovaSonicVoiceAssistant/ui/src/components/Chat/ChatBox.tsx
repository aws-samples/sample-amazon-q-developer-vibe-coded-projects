import React, { useState, useRef, useEffect } from 'react';
import { useTodo } from '../../context/TodoContext';
import { useVoiceChat } from '../../hooks/useVoiceChat';
import './Chatbox.css';

interface Message {
  text: string;
  isUser: boolean;
  timestamp: string;
  completionId?: string;
  contentId?: string;
  isSystem?: boolean;
}

interface ChatBoxProps {
  onClose: () => void;
  messages: Message[];
  setMessages: React.Dispatch<React.SetStateAction<Message[]>>;
}

export const ChatBox: React.FC<ChatBoxProps> = ({ onClose, messages, setMessages }) => {
  const [voiceModeActive, setVoiceModeActive] = useState(false);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const { fetchTodos, fetchNotes, selectedTodoId, todos } = useTodo();

  // Initialize voice chat hook
  const {
    isConnected: voiceConnected,
    waitingForUserTranscription,
    waitingForAssistantResponse,
    isAudioReady,
    startListening,
    stopListening,
    registerContentEndCallback
  } = useVoiceChat({
    onTranscriptionReceived: (text, completionId, contentId) => {
      // Add transcription as user message
      const userMessage: Message = {
        text,
        isUser: true,
        timestamp: new Date().toISOString(),
        completionId,
        contentId
      };
      setMessages(prev => [...prev, userMessage]);
    },
    onResponseReceived: async (text, completionId, contentId) => {
      // Add each text chunk as a separate message
      const assistantMessage: Message = {
        text,
        isUser: false,
        timestamp: new Date().toISOString(),
        completionId,
        contentId
      };
      
      setMessages(prev => [...prev, assistantMessage]);
      
      // No longer refreshing todos here - will be done in contentEnd callback
    },
    onSessionTimeout: () => {
      // Add a simple system message about the session timeout
      const systemMessage: Message = {
        text: "Session timed, no activity.",
        isUser: false,
        isSystem: true,
        timestamp: new Date().toISOString()
      };
      
      setMessages(prev => [...prev, systemMessage]);
      onClose();
    },
    chatHistory: messages
  });

  // Register a callback for contentStart events with generationStage: 'FINAL' to refresh todos
  React.useEffect(() => {
    if (!registerContentEndCallback) {
      console.error('registerContentEndCallback is not available');
      return;
    }
    
    // Register the callback when the component mounts
    const unregister = registerContentEndCallback((data) => {
      if (data.data && data.data.type === 'TEXT' && 
          data.data.role === 'ASSISTANT') {
        
        try {
          if (data.data.additionalModelFields) {
            const additionalFields = JSON.parse(data.data.additionalModelFields);
            if (additionalFields.generationStage === "FINAL") {
              console.log('Received contentStart with generationStage: FINAL, refreshing todos');
              
              // Refresh todo data after receiving a FINAL generation stage
              (async () => {
                try {
                  await fetchTodos();
                  // Only fetch notes if there's a valid selectedTodoId and todos exist
                  if (selectedTodoId && todos && todos.length > 0) {
                    const todoExists = todos.some(todo => todo.id === selectedTodoId);
                    if (todoExists) {
                      try {
                        await fetchNotes(selectedTodoId);
                      } catch (error) {
                        console.log('Error fetching notes:', error);
                      }
                    } else {
                      console.log('Selected todo no longer exists, skipping notes fetch');
                    }
                  }
                } catch (error) {
                  console.error('Error refreshing data after chat response:', error);
                }
              })();
            }
          }
        } catch (error) {
          console.error('Error parsing additionalModelFields:', error);
        }
      }
    });
    
    // Clean up the callback when the component unmounts
    return () => {
      if (unregister) unregister();
    };
  }, [registerContentEndCallback, fetchTodos, fetchNotes, selectedTodoId, todos]);

  // Scroll to bottom of messages when new messages are added
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  // Toggle voice mode
  const toggleVoiceMode = async () => {
    // Don't allow toggling if audio isn't ready
    if (!isAudioReady) {
      return;
    }
    
    if (voiceModeActive) {
      stopListening();
      setVoiceModeActive(false);
    } else {
      try {
        // First explicitly request microphone permission to ensure the browser shows the indicator
        const stream = await navigator.mediaDevices.getUserMedia({ 
          audio: {
            echoCancellation: true,
            noiseSuppression: true,
            autoGainControl: true
          } 
        });
        
        // Stop this temporary stream as we'll create a new one in startListening
        stream.getTracks().forEach(track => track.stop());
        
        // Only start listening if we're connected
        if (voiceConnected) {
          // Set voice mode active first to ensure UI updates
          setVoiceModeActive(true);
          
          // Then start listening
          await startListening();
        } else {
          // Add the error message to the chat
          const errorMessage: Message = {
            text: "Voice chat not connected. Please try again in a moment.",
            isUser: false,
            timestamp: new Date().toISOString()
          };
          setMessages(prev => [...prev, errorMessage]);
        }
      } catch (error) {
        // Add the error message to the chat
        const errorMessage: Message = {
          text: "Microphone access denied. Please allow microphone access and try again.",
          isUser: false,
          timestamp: new Date().toISOString()
        };
        setMessages(prev => [...prev, errorMessage]);
      }
    }
  };

  // Render thinking indicator for user
  const renderUserThinkingIndicator = () => {
    if (!waitingForUserTranscription || !voiceModeActive) {
      return null;
    }
    
    return (
      <div className="typing-indicator">
        <span></span>
        <span></span>
        <span></span>
      </div>
    );
  };

  // Render thinking indicator for assistant
  const renderAssistantThinkingIndicator = () => {
    if (!waitingForAssistantResponse || !voiceModeActive) {
      return null;
    }
    
    return (
      <div className="typing-indicator">
        <span></span>
        <span></span>
        <span></span>
      </div>
    );
  };

  return (
    <div className="chat-box">
      <div className="chat-box-header">
        <span className="bedrock-agent-title">
          {voiceModeActive ? 'Voice Chat Active' : 'NovaSonic Voice Chat'}
        </span>
        <div className="chat-header-buttons">
          <button 
            className="chat-close-button"
            onClick={onClose}
            aria-label="Close chat"
          >
            ✕
          </button>
        </div>
      </div>
      
      <div className="chat-messages">
        {messages.map((msg, index) => (
          msg.isSystem ? (
            <div 
              key={`system-${index}`} 
              className="chat-message system-message"
            >
              {msg.text}
            </div>
          ) : (
            <div 
              key={`${msg.completionId || ''}-${msg.contentId || ''}-${index}`} 
              className={`chat-message ${msg.isUser ? 'user-message' : 'bot-message'}`}
            >
              <div className={`message-role ${msg.isUser ? 'user-role' : 'assistant-role'}`}>
                {msg.isUser ? 'User' : 'Assistant'}
              </div>
              <div className="message-content">
                {msg.text}
              </div>
            </div>
          )
        ))}
        
        {renderUserThinkingIndicator()}
        {renderAssistantThinkingIndicator()}
        
        <div ref={messagesEndRef} />
      </div>
      
      <div className="mic-button-container">
        <button 
          className={`voice-mode-toggle ${voiceModeActive ? 'active' : ''} ${!isAudioReady ? 'not-ready' : ''}`}
          onClick={toggleVoiceMode}
          aria-label={voiceModeActive ? "Stop listening" : "Start listening"}
          title={!isAudioReady ? "Preparing voice chat..." : voiceModeActive ? "Stop listening" : "Start listening"}
          disabled={!isAudioReady}
        >
          <svg 
            width="24" 
            height="24" 
            viewBox="0 0 24 24" 
            fill="none" 
            stroke="currentColor" 
            strokeWidth="2" 
            strokeLinecap="round" 
            strokeLinejoin="round"
            className="mic-icon"
          >
            <path d="M12 1a3 3 0 0 0-3 3v8a3 3 0 0 0 6 0V4a3 3 0 0 0-3-3z"></path>
            <path d="M19 10v2a7 7 0 0 1-14 0v-2"></path>
            <line x1="12" y1="19" x2="12" y2="23"></line>
            <line x1="8" y1="23" x2="16" y2="23"></line>
          </svg>
          {voiceModeActive && <div className="pulse-rings"></div>}
          {!isAudioReady && <div className="preparing-indicator">Preparing...</div>}
        </button>
      </div>
    </div>
  );
};
