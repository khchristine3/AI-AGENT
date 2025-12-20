import React, { useState } from "react";
import { MessageBubble } from "./MessageBubble/MessageBubble.jsx";
import './ChatWindow.css';

export default function ChatWindow() {
  // Dummy messages for testing
  // eslint-disable-next-line no-unused-vars
  const [messages, setMessages] = useState([
    { role: "user", content: "Hi, I need my prescription.", timestamp: new Date().toISOString() },
    { role: "assistant", content: "Sure! Can you tell me your prescription ID?", timestamp: new Date().toISOString() },
    { role: "error", content: "Failed to fetch previous messages.", timestamp: new Date().toISOString() },
  ]);

  return (
    <div className="chat-window">
      {messages.map((msg, index) => (
        <MessageBubble key={index} message={msg} />
      ))}
    </div>
  );
}
