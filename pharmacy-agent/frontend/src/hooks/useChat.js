import { useState, useCallback } from 'react';
import { flushSync } from 'react-dom';

/**
 * useChat - Custom React hook for managing chat with pharmacy AI agent.
 *
 * This hook handles real-time communication with the pharmacy AI agent backend,
 * managing message state, streaming responses, and user selection. It uses
 * Server-Sent Events (SSE) for streaming AI responses in real-time.
 *
 * Features:
 *  - Real-time streaming responses with SSE (Server-Sent Events)
 *  - User selection and user-specific conversation management
 *  - Robust error handling with user-friendly error messages
 *  - Immediate UI updates using React 18's flushSync for synchronized rendering
 *  - Prevents duplicate sends with isSending guard
 *  - Conversation history preservation across messages
 *  - Manual stream reading for better control over chunked responses
 *
 * @returns {Object} Hook state and methods
 * @returns {Array} messages - Array of message objects {role, content, timestamp}
 * @returns {boolean} isLoading - True while waiting for AI response
 * @returns {number} selectedUserId - Currently selected user ID (1-10)
 * @returns {string|null} error - Error message if request failed, null otherwise
 * @returns {Function} sendMessage - Send a message to the AI agent
 * @returns {Function} clearMessages - Clear all messages in conversation
 * @returns {Function} changeUser - Switch to a different user (clears messages)
 *
 * @example
 * const { messages, isLoading, sendMessage, selectedUserId, changeUser } = useChat();
 *
 * // Send a message
 * sendMessage("What is Acamol used for?");
 *
 * // Change user (clears conversation)
 * changeUser(2);
 *
 * // Render messages
 * messages.map(msg => <div key={msg.timestamp}>{msg.content}</div>)
 */
export function useChat() {
  const [messages, setMessages] = useState([]);
  const [selectedUserId, setSelectedUserId] = useState(1);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState(null);
  const [isSending, setIsSending] = useState(false);

  /**
   * Sends a message to the AI agent and streams the response in real-time.
   *
   * This function:
   * 1. Validates the message and checks for duplicate sends
   * 2. Adds user message to the conversation
   * 3. Creates a placeholder for the AI response
   * 4. Establishes SSE connection to backend (POST /api/chat)
   * 5. Streams response chunks and updates UI in real-time using flushSync
   * 6. Handles errors gracefully with user-friendly messages
   *
   * @param {string} userMessage - The message text from the user
   * @returns {Promise<void>} Resolves when the response is complete or fails
   */
  const sendMessage = useCallback(async (userMessage) => {
    if (!userMessage.trim() || selectedUserId === null || isSending) {
      return;
    }

    console.log('Sending message:', userMessage);
    setIsSending(true);
    setIsLoading(true);
    setError(null);

    // Add user message
    const userMsg = {
      role: 'user',
      content: userMessage,
      timestamp: new Date().toISOString()
    };

    // Add placeholder for assistant response
    const placeholderMsg = {
      role: 'assistant',
      content: '',
      timestamp: new Date().toISOString()
    };
    
    //Capture updated messages INCLUDING current user message
    const updatedConversationHistory = [...messages, userMsg];

    setMessages(prev => [...prev, userMsg, placeholderMsg]);

    let accumulatedContent = '';

    try {
      const response = await fetch('http://localhost:3000/api/chat', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Accept': 'text/event-stream'
        },
        body: JSON.stringify({
          message: userMessage,
          userId: selectedUserId,
          conversationHistory: updatedConversationHistory
        })
      });

      if (!response.ok) {
        throw new Error(`HTTP ${response.status}: ${response.statusText}`);
      }

      console.log('Connected to stream');

      const reader = response.body.getReader();
      const decoder = new TextDecoder();

      // Read stream
      while (true) {
        const { done, value } = await reader.read();
        
        if (done) {
          console.log('Stream finished');
          break;
        }

        const text = decoder.decode(value, { stream: true });

        // Parse SSE format: "data: {...}\n\n"
        const lines = text.split('\n');
        
        for (const line of lines) {
          if (line.startsWith('data: ')) {
            const jsonStr = line.substring(6); // Remove "data: " prefix
            
            try {
              const data = JSON.parse(jsonStr);
              
              if (data.type === 'chunk') {
                console.log('Got chunk:', data.content);
                accumulatedContent += data.content;
                
                //Use flushSync to force immediate render!
                flushSync(() => {
                  setMessages(prev => {
                    const updated = [...prev];
                    updated[updated.length - 1] = {
                      role: 'assistant',
                      content: accumulatedContent,
                      timestamp: new Date().toISOString()
                    };
                    return updated;
                  });
                });

              } else if (data.type === 'done') {
                console.log('Response complete');
                
              } else if (data.type === 'error') {
                throw new Error(data.message || 'Unknown error');
              }
            } catch (parseErr) {
              // Ignore parse errors for incomplete JSON
              if (!jsonStr.includes('{')) {
                continue;
              }
              console.warn('Parse error:', parseErr, jsonStr);
            }
          }
        }
      }

    } catch (err) {
      console.error('Chat error:', err);
      setError(err.message || 'Failed to send message');
      
      // Update placeholder with error
      setMessages(prev => {
        const updated = [...prev];
        updated[updated.length - 1] = {
          role: 'error',
          content: `Error: ${err.message || 'Failed to get response'}`,
          timestamp: new Date().toISOString()
        };
        return updated;
      });
      
    } finally {
      setIsLoading(false);
      setIsSending(false);
      console.log('Send complete');
    }
  }, [messages, selectedUserId, isSending]);

  /**
   * Clears all messages from the current conversation and resets error state.
   * Useful for starting a fresh conversation or cleaning up the UI.
   */
  const clearMessages = () => {
    setMessages([]);
    setError(null);
  };

  /**
   * Changes the currently selected user and clears the conversation history.
   * This ensures each user has their own isolated conversation context.
   *
   * @param {number} userId - The new user ID to select (must be 1-10)
   */
  const changeUser = (userId) => {
    setSelectedUserId(userId);
    clearMessages();
  };

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