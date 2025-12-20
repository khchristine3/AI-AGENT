import React, { useState } from "react";
import { MessageBubble } from "./MessageBubble/MessageBubble.jsx";
import './ChatWindow.css';
import { InputBar } from "./InputBar/InputBar.jsx";

export default function ChatWindow() {
  // Dummy messages for testing
  // eslint-disable-next-line no-unused-vars
  const [messages, setMessages] = useState([
    { role: "user", content: "Hi, I need my prescription.", timestamp: new Date().toISOString() },
    { role: "assistant", content: "Sure! Can you tell me your prescription ID?", timestamp: new Date().toISOString() },
    { role: "error", content: "Failed to fetch previous messages.", timestamp: new Date().toISOString() },
  ]);

  // Handle sending a new message
  const handleSend = (text) => {
    const newMessage = {
      role: "user",
      content: text,
      timestamp: new Date().toISOString(),
    };
    setMessages(prev => [...prev, newMessage]);

    setTimeout(() => {
      setMessages(prev => [...prev, {
        role: "assistant",
        content: "Received: " + text,
        timestamp: new Date().toISOString()
      }]);
    }, 1000);
  };

  // Handle clearing chat
  const handleClear = () => {
    setMessages([]);
  };

  return (
    <div className="chat-window">
      {messages.map((msg, index) => (
        <MessageBubble key={index} message={msg} />
      ))}

      <InputBar 
        onSend={handleSend} 
        onClear={handleClear} 
        isLoading={false} 
      />
    </div>
  );
}
