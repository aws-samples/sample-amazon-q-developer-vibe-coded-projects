import React, { useState, useRef, useEffect } from 'react';
import ReactMarkdown from 'react-markdown';
import rehypeSanitize from 'rehype-sanitize';
import { Prism as SyntaxHighlighter } from 'react-syntax-highlighter';
import { tomorrow } from 'react-syntax-highlighter/dist/esm/styles/prism';
import './ChatBox.css';
import { api } from '../../services/api';
import { todoApi } from '../../services/api';
import { useTodo } from '../../context/TodoContext';

interface Message {
  text: string;
  isUser: boolean;
  timestamp: string;
}

interface CodeProps {
  node?: any;
  inline?: boolean;
  className?: string;
  children?: React.ReactNode;
}

interface ChatBoxProps {
  onClose: () => void;
}

interface ChatSession {
  sessionId: string | null;
  sessionAttributes: Record<string, any>;
}

export const ChatBox: React.FC<ChatBoxProps> = ({ onClose }) => {
  const [message, setMessage] = useState('');
  const [messages, setMessages] = useState<Message[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [chatSession, setChatSession] = useState<ChatSession>({
    sessionId: null,
    sessionAttributes: {}
  });
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);
  const { fetchTodos, fetchNotes, selectedTodoId, todos, setSelectedTodoId } = useTodo();

  // Load chat history and session from localStorage on component mount
  useEffect(() => {
    const savedMessages = localStorage.getItem('chatMessages');
    const savedSession = localStorage.getItem('chatSession');
    
    if (savedMessages) {
      try {
        setMessages(JSON.parse(savedMessages));
      } catch (error) {
        console.error('Error parsing saved chat messages:', error);
        // Initialize with a welcome message if parsing fails
        setMessages([
          {
            text: 'Hello! How can I help you with your todos today?',
            isUser: false,
            timestamp: new Date().toISOString()
          }
        ]);
      }
    } else {
      // Initialize with a welcome message if no saved messages
      setMessages([
        {
          text: 'Hello! How can I help you with your todos today?',
          isUser: false,
          timestamp: new Date().toISOString()
        }
      ]);
    }
    
    if (savedSession) {
      try {
        setChatSession(JSON.parse(savedSession));
      } catch (error) {
        console.error('Error parsing saved chat session:', error);
      }
    }
  }, []);

  // Save chat history and session to localStorage whenever they change
  useEffect(() => {
    localStorage.setItem('chatMessages', JSON.stringify(messages));
  }, [messages]);
  
  useEffect(() => {
    localStorage.setItem('chatSession', JSON.stringify(chatSession));
  }, [chatSession]);

  // Scroll to bottom of messages when new messages are added
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!message.trim()) return;
    
    // Add user message to chat
    const userMessage: Message = {
      text: message,
      isUser: true,
      timestamp: new Date().toISOString()
    };
    
    setMessages(prev => [...prev, userMessage]);
    setMessage('');
    setIsLoading(true);
    
    try {
      // Send message to API with session information
      const response = await api.post('/chat', { 
        message: message.trim(),
        sessionId: chatSession.sessionId,
        sessionAttributes: chatSession.sessionAttributes,
        enableMemory: true
      });
      
      // Add bot response to chat
      const botMessage: Message = {
        text: response.data.message,
        isUser: false,
        timestamp: response.data.timestamp || new Date().toISOString()
      };
      
      setMessages(prev => [...prev, botMessage]);
      
      // Update session information
      setChatSession({
        sessionId: response.data.sessionId,
        sessionAttributes: response.data.sessionAttributes || {}
      });
      
      try {
        // Refresh todo data after receiving a response from Bedrock agent
        await fetchTodos();
        
        // Check if the selected todo still exists after refreshing todos
        if (selectedTodoId) {
          try {
            // Instead of checking todos array, try to fetch the specific todo
            await todoApi.getTodo(selectedTodoId);
            // If successful, fetch notes
            await fetchNotes(selectedTodoId);
          } catch (error) {
            // If todo doesn't exist, clear selection
            console.log('Selected todo no longer exists, clearing selection');
            setSelectedTodoId(null);
          }
        }
      } catch (error) {
        console.error('Error refreshing data after chat response:', error);
      }
      
    } catch (error) {
      // Add error message
      const errorMessage: Message = {
        text: 'Sorry, I encountered an error. Please try again later.',
        isUser: false,
        timestamp: new Date().toISOString()
      };
      
      setMessages(prev => [...prev, errorMessage]);
    } finally {
      setIsLoading(false);
      // Focus the input field after sending a message
      setTimeout(() => {
        inputRef.current?.focus();
      }, 0);
    }
  };

  const clearChat = () => {
    // Clear messages and session
    setMessages([
      {
        text: 'Hello! How can I help you with your todos today?',
        isUser: false,
        timestamp: new Date().toISOString()
      }
    ]);
    setChatSession({
      sessionId: null,
      sessionAttributes: {}
    });
    localStorage.removeItem('chatMessages');
    localStorage.removeItem('chatSession');
  };

  return (
    <div className="chat-box">
      <div className="chat-box-header">
        <span className="bedrock-agent-title">Bedrock Agent Chat</span>
        <div className="chat-header-buttons">
          <button 
            className="chat-clear-button"
            onClick={clearChat}
            aria-label="Clear chat"
          >
            Clear
          </button>
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
          <div 
            key={index} 
            className={`chat-message ${msg.isUser ? 'user-message' : 'bot-message'}`}
          >
            {msg.isUser ? (
              <div className="message-content">{msg.text}</div>
            ) : (
              <div className="message-content markdown-content">
                <ReactMarkdown
                  rehypePlugins={[rehypeSanitize]}
                  components={{
                    code: ({ className, children, ...props }: CodeProps) => {
                      const match = /language-(\w+)/.exec(className || '');
                      return !props.inline && match ? (
                        <SyntaxHighlighter
                          style={tomorrow}
                          language={match[1]}
                          PreTag="div"
                          {...props}
                        >
                          {String(children).replace(/\n$/, '')}
                        </SyntaxHighlighter>
                      ) : (
                        <code className={className} {...props}>
                          {children}
                        </code>
                      );
                    }
                  }}
                >
                  {msg.text}
                </ReactMarkdown>
              </div>
            )}
          </div>
        ))}
        {isLoading && (
          <div className="chat-message bot-message">
            <div className="typing-indicator">
              <span></span>
              <span></span>
              <span></span>
            </div>
          </div>
        )}
        <div ref={messagesEndRef} />
      </div>
      
      <form className="chat-input-form" onSubmit={handleSubmit}>
        <input
          type="text"
          value={message}
          onChange={(e) => setMessage(e.target.value)}
          placeholder="Type your message..."
          disabled={isLoading}
          ref={inputRef}
        />
        <button 
          type="submit" 
          disabled={isLoading || !message.trim()}
        >
          Send
        </button>
      </form>
      
      {chatSession.sessionId && (
        <div className="session-info">
          <small>Session ID: {chatSession.sessionId}</small>
        </div>
      )}
    </div>
  );
};
