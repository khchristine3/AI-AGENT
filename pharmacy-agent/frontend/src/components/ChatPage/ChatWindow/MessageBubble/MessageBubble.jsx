/**
 * MessageBubble Component
 * 
 * A reusable component for displaying individual chat messages.
 * Supports different message types (user, assistant, error) with
 * distinct styling for each.
 * 
 * Features:
 * - Different visual styles for user vs assistant messages
 * - Error message styling
 * - Timestamp display
 * - Smooth fade-in animation
 * - Responsive design
 * 
 * Props:
 * @param {Object} message - Message object
 * @param {string} message.role - 'user', 'assistant', or 'error'
 * @param {string} message.content - Message text content
 * @param {string} message.timestamp - ISO timestamp string
 * 
 * @example
 * <MessageBubble 
 *   message={{
 *     role: 'user',
 *     content: 'I need to refill my prescription',
 *     timestamp: '2025-01-15T10:30:00.000Z'
 *   }}
 * />
 */

import './MessageBubble.css';

export function MessageBubble({ message }) {
  const { role, content, timestamp } = message;
  
  // Format timestamp for display (HH:MM format)
  const formatTime = (isoString) => {
    const date = new Date(isoString);
    return date.toLocaleTimeString('en-US', {
      hour: '2-digit',
      minute: '2-digit',
      hour12: false
    });
  };

  // Get display name based on role
  const getSenderName = (role) => {
    switch (role) {
      case 'user':
        return 'You';
      case 'assistant':
        return 'Pharmacist AI';
      case 'error':
        return 'System Error';
      default:
        return 'Unknown';
    }
  };

  return (
    <div className={`message-bubble ${role}`}>
      <div className="message-header">
        <span className="message-sender">
          {getSenderName(role)}
        </span>
        <span className="message-time">
          {formatTime(timestamp)}
        </span>
      </div>
      <div className="message-content">
        {content}
      </div>
    </div>
  );
}