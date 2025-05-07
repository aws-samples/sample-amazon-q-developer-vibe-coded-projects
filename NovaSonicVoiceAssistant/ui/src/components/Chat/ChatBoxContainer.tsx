import React, { useState } from 'react';
import { ChatBox } from './ChatBox';

interface Message {
  text: string;
  isUser: boolean;
  timestamp: string;
  completionId?: string;
  contentId?: string;
  isSystem?: boolean;
}

interface ChatBoxContainerProps {
  onClose: () => void;
  isVisible: boolean;
}

export const ChatBoxContainer: React.FC<ChatBoxContainerProps> = ({ onClose, isVisible }) => {
  // Maintain messages state at this level - will persist even when ChatBox unmounts
  const [messages, setMessages] = useState<Message[]>([]);

  // Only render the ChatBox when it's visible
  if (!isVisible) {
    return null;
  }

  return (
    <div className="chat-container">
      <ChatBox 
        onClose={onClose} 
        messages={messages} 
        setMessages={setMessages} 
      />
    </div>
  );
};
