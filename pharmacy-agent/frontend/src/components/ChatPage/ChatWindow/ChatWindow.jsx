import React from "react";
import { MessageBubble } from "./MessageBubble/MessageBubble.jsx";
import { InputBar } from "./InputBar/InputBar.jsx";
import { useChat } from "../../../hooks/useChat";
import './ChatWindow.css';

export default function ChatWindow() {
  const { messages, isLoading, sendMessage, clearMessages } = useChat();

  return (
    <div className="chat-window">
      {messages.map((msg, index) => (
        <MessageBubble key={index} message={msg} />
      ))}

      <InputBar 
        onSend={sendMessage} 
        onClear={clearMessages} 
        isLoading={isLoading} 
      />
    </div>
  );
}
