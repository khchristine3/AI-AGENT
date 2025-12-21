import React from "react";
import { MessageBubble } from "./MessageBubble/MessageBubble.jsx";
import { InputBar } from "./InputBar/InputBar.jsx";
import './ChatWindow.css';

export default function ChatWindow({ chatState }) {  // ✅ FIXED: Receive chatState
  const { messages, isLoading, sendMessage, clearMessages } = chatState;

  return (
    <div className="chat-window">
      <div className="messages-container">
        {messages.map((msg, index) => (
          <MessageBubble key={index} message={msg} />
        ))}
      </div>

      <InputBar 
        onSend={sendMessage} 
        onClear={clearMessages} 
        isLoading={isLoading} 
      />
    </div>
  );
}