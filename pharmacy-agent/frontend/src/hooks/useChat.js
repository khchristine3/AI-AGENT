import { useState, useCallback } from 'react';

/**
 * useChat - Simple hook for testing chat locally without backend.
 */
export function useChat() {
  const [messages, setMessages] = useState([]);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState(null);

  /**
   * sendMessage - Adds a user message and a dummy assistant response.
   */
  const sendMessage = useCallback((userMessage) => {
    if (!userMessage.trim()) return;

    const userMsg = { 
      role: 'user', 
      content: userMessage, 
      timestamp: new Date().toISOString() 
    };

    setMessages(prev => [...prev, userMsg]);
    setIsLoading(true);
    setError(null);

    // Simulate assistant response
    const assistantMsg = { 
      role: 'assistant', 
      content: `You said: "${userMessage}"`, 
      timestamp: new Date().toISOString() 
    };

    // Small delay to simulate "thinking"
    setTimeout(() => {
      setMessages(prev => [...prev, assistantMsg]);
      setIsLoading(false);
    }, 500);
  }, []);

  const clearMessages = useCallback(() => {
    setMessages([]);
    setError(null);
  }, []);

  return {
    messages,
    isLoading,
    error,
    sendMessage,
    clearMessages
  };
}
