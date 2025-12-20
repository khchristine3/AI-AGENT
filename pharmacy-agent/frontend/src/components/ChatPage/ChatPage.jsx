import React from "react";
import Title from "./Title/Title.jsx";
import ChatWindow from "./ChatWindow/ChatWindow.jsx";
import './ChatPage.css';

function ChatPage() {
  return (
    <div className="ChatPage">
      <Title text="🏥 Pharmacy Assistant" />
      <ChatWindow />

    </div>
  );
}

export default ChatPage;
