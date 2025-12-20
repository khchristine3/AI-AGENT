/**
 * InputBar Component
 * 
 * A reusable input component for sending chat messages.
 * Includes textarea for multi-line input, send button, and
 * optional clear button.
 * 
 * Features:
 * - Auto-expanding textarea
 * - Enter to send (Shift+Enter for new line)
 * - Disabled state during loading
 * - Character limit display (optional)
 * - Clear button for conversation reset
 * 
 * Props:
 * @param {function} onSend - Callback when message is sent
 * @param {function} onClear - Callback when clear button is clicked
 * @param {boolean} isLoading - Whether agent is processing
 * @param {boolean} disabled - Whether input is disabled
 * @param {string} placeholder - Placeholder text
 * 
 * @example
 * <InputBar 
 *   onSend={(message) => handleSend(message)}
 *   onClear={() => handleClear()}
 *   isLoading={false}
 * />
 */

import { useState, useRef, useEffect } from 'react';
import './InputBar.css';

export function InputBar({ 
  onSend, 
  onClear, 
  isLoading = false, 
  disabled = false,
  placeholder = 'Type your message...'
}) {
  const [input, setInput] = useState('');
  const textareaRef = useRef(null);

  // Auto-resize textarea based on content
  useEffect(() => {
    if (textareaRef.current) {
      textareaRef.current.style.height = 'auto';
      textareaRef.current.style.height = `${textareaRef.current.scrollHeight}px`;
    }
  }, [input]);

  // Handle send message
  const handleSend = () => {
    const trimmedInput = input.trim(); // Prevent sending empty messages
    if (trimmedInput && !isLoading && !disabled) {
      onSend(trimmedInput);
      setInput('');
      
      // Reset textarea height
      if (textareaRef.current) {
        textareaRef.current.style.height = 'auto';
      }
    }
  };

  // Handle Enter key (send message, Shift+Enter for new line)
  const handleKeyDown = (e) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSend(); // Send message on Enter as if they clicked send button
    }
  };

  // Handle clear button
  const handleClear = () => {
    if (onClear && !isLoading) {
      onClear();
      setInput('');
    }
  };

  return (
    <div className="input-bar">
      <div className="input-container">
        <textarea
          ref={textareaRef}
          className="input-textarea"
          value={input}
          onChange={(e) => setInput(e.target.value)}
          onKeyDown={handleKeyDown}
          placeholder={placeholder}
          disabled={isLoading || disabled}
          rows={1}
          maxLength={1000}
        />
        
        <div className="input-actions">
          <button
            className="send-button"
            onClick={handleSend}
            disabled={!input.trim() || isLoading || disabled}
          >
            {isLoading ? '⏳' : '📤'}
          </button>
          
          {onClear && (
            <button
              className="clear-button"
              onClick={handleClear}
              disabled={isLoading}
              title="Clear conversation"
            >
              🗑️
            </button>
          )}
          
        </div>
      </div>
      
      {isLoading && (
        <div className="loading-indicator">
          Agent is thinking...
        </div>
      )}
    </div>
  );
}