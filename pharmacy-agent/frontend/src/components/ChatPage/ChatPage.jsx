import React from "react";
import Title from "./Title/Title.jsx";
import ChatWindow from "./ChatWindow/ChatWindow.jsx";
import './ChatPage.css';
import { UserSelector } from './UserSelector/UserSelector';
import { useChat } from '../../hooks/useChat';

function ChatPage() {
  const chatState = useChat();

  return (
    <div className="chat-page">
      <Title text="💊 Pharmacy Assistant" />
      <UserSelector  
        selectedUserId={chatState.selectedUserId}
        onUserChange={chatState.changeUser}
        disabled={chatState.isLoading}
      />
      <ChatWindow chatState={chatState} />

    </div>
  );
}

export default ChatPage;

