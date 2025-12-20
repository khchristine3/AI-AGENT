import { useState, useCallback } from 'react';

/**
 * useChat - Custom React hook for managing chat with a pharmacy AI agent.
 *
 * Features:
 *  - Stores chat messages locally in the hook state.
 *  - Tracks the currently selected user via selectedUserId.
 *  - Sends full conversation history per request (stateless backend).
 *  - Handles errors gracefully.
 */
export function useChat() {
  const [messages, setMessages] = useState([]);
  const [selectedUserId, setSelectedUserId] = useState(1); // Default user ID
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState(null);
  const [isSending, setIsSending] = useState(false); // ← New state to prevent duplicate sends

  /**
   * sendMessage - Sends a message from the user to the AI agent.
   * Automatically adds the user message to local state and appends
   * the assistant's response after receiving it from the backend.
   *
   * @param {string} userMessage - Message text from the user
   */
    const sendMessage = useCallback(async (userMessage) => {
    if (!userMessage.trim()) return;
    
    // Prevent duplicate sends
    if (isSending) {
      console.log('Already sending, ignoring duplicate call');
      return;
    }

    setIsSending(true); //Lock to prevent duplicates

    const userMsg = {
      role: 'user',
      content: userMessage,
      timestamp: new Date().toISOString()
    };
    
    setMessages(prev => [...prev, userMsg]);
    setIsLoading(true);
    setError(null);

    try {
      const response = await fetch('http://localhost:3000/api/chat/simple', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          message: userMessage,
          userId: selectedUserId,
          conversationHistory: messages
        })
      });

      const data = await response.json();
      
      const botMsg = {
        role: 'assistant',
        content: data.response,
        timestamp: new Date().toISOString()
      };
      
      setMessages(prev => [...prev, botMsg]);
    } catch (err) {
      console.error('Error:', err);
      setError('Failed to send message.');
    } finally {
      setIsLoading(false);
      setIsSending(false); //Unlock
    }
  }, [messages, selectedUserId, isSending]);

  /**
   * clearMessages - Clears all messages and resets error state.
   */
  const clearMessages = useCallback(() => {
    setMessages([]);
    setError(null);
  }, []);

  /**
   * changeUser - Changes the selected user and clears previous messages.
   *
   * @param {number} userId - ID of the new user
   */
  const changeUser = useCallback((userId) => {
    setSelectedUserId(userId);
    clearMessages();
  }, [clearMessages]);

  return {
    messages,
    isLoading,
    selectedUserId,
    error,
    sendMessage,
    clearMessages,
    changeUser
  };
}
