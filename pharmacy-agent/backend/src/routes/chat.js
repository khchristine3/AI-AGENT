/**
 * Chat Routes Module
 *
 * This module defines Express routes for the pharmacy agent chat API.
 * It provides endpoints for interacting with the AI agent, including
 * streaming and non-streaming chat modes.
 *
 * Available Endpoints:
 * - POST /api/chat - Streaming chat with Server-Sent Events (SSE)
 * - POST /api/chat/simple - Non-streaming chat (returns complete response)
 *
 * @module routes/chat
 */

const express = require('express');
const { handleChat, handleChatStreaming } = require('../agent/orchestrator');

const router = express.Router();

/**
 * POST /api/chat
 *
 * Main chat endpoint with Server-Sent Events (SSE) streaming.
 * Streams the AI agent's response in real-time as it's generated,
 * providing a better user experience for longer responses.
 *
 * Request Body:
 * @property {string} message - The user's message (required, non-empty)
 * @property {number} userId - The user ID (required, must be between 1-10)
 * @property {Array} conversationHistory - Previous messages (optional, default: [])
 *
 * SSE Event Types:
 * - chunk: Partial response content as it's generated
 * - done: Final event with complete conversation history and metadata
 * - error: Error notification if something goes wrong
 *
 * Response Format (SSE):
 * data: {"type": "chunk", "content": "partial text"}
 * data: {"type": "done", "success": true, "conversationHistory": [...], "toolCallsCount": 2}
 * data: {"type": "error", "message": "error description"}
 *
 * @route POST /api/chat
 * @param {string} req.body.message - User's chat message
 * @param {number} req.body.userId - User ID (1-10)
 * @param {Array} req.body.conversationHistory - Conversation context
 * @returns {Stream} Server-Sent Events stream with agent response
 *
 * @example
 * // Client-side usage with fetch API
 * fetch('/api/chat', {
 *   method: 'POST',
 *   headers: { 'Content-Type': 'application/json' },
 *   body: JSON.stringify({ message: 'Tell me about Acamol', userId: 1, conversationHistory: [] })
 * });
 */
router.post('/chat', async (req, res) => {
  const { message, userId, conversationHistory = [] } = req.body;

  // Validate input
  if (!message || typeof message !== 'string' || message.trim() === '') {
    return res.status(400).json({
      success: false,
      error: 'INVALID_INPUT',
      message: 'Message is required and must be a non-empty string.'
    });
  }

  if (!userId || typeof userId !== 'number' || userId < 1 || userId > 10) {
    return res.status(400).json({
      success: false,
      error: 'INVALID_USER_ID',
      message: 'User ID is required and must be between 1 and 10.'
    });
  }

  console.log('\n========== New Chat Request ==========');
  console.log('User ID:', userId);
  console.log('Message:', message);

  //Set streaming headers with ALL anti-buffering options
  res.setHeader('Content-Type', 'text/event-stream');
  res.setHeader('Cache-Control', 'no-cache, no-transform');
  res.setHeader('Connection', 'keep-alive');
  res.setHeader('X-Accel-Buffering', 'no'); // Disable nginx buffering
  res.setHeader('Content-Encoding', 'none'); // Disable compression
  
  // Send initial comment to establish connection
  res.write(':ok\n\n');
  
  // Flush headers and initial data
  if (res.flushHeaders) {
    res.flushHeaders();
  }

  // Handle client disconnect
  req.on('close', () => {
    console.log('Client disconnected');
  });

  try {
    let chunksSent = 0;
    
    // Callback: sends each chunk via SSE
    const onChunk = (chunk) => {
      chunksSent++;
      const data = JSON.stringify({ type: 'chunk', content: chunk });
      res.write(`data: ${data}\n\n`);
      
      //Explicit flush after EVERY chunk
      if (res.flush) {
        res.flush();
      }
      
      // Log every 10th chunk
      if (chunksSent % 10 === 0) {
        console.log(`Sent ${chunksSent} chunks to client`);
      }
    };

    // Execute agent with streaming
    const result = await handleChatStreaming(
      message.trim(),
      userId,
      conversationHistory,
      onChunk
    );

    console.log(`Total chunks sent to client: ${chunksSent}`);

    // Send final event
    const doneData = JSON.stringify({
      type: 'done',
      success: result.success,
      conversationHistory: result.conversationHistory,
      toolCallsCount: result.toolCallsCount
    });
    res.write(`data: ${doneData}\n\n`);
    
    if (res.flush) {
      res.flush();
    }

    // Close stream
    res.end();

  } catch (error) {
    console.error('Chat error:', error);

    const errorData = JSON.stringify({
      type: 'error',
      message: 'An error occurred while processing your request.'
    });
    res.write(`data: ${errorData}\n\n`);
    res.end();
  }
});

/**
 * POST /api/chat/simple
 *
 * Non-streaming chat endpoint for testing and simple integrations.
 * Returns the complete response in a single JSON payload after the
 * agent finishes processing.
 *
 * Use this endpoint when:
 * - Testing the agent in development
 * - Client doesn't support SSE streaming
 * - Response streaming is not needed
 *
 * Request Body:
 * @property {string} message - The user's message (required, non-empty)
 * @property {number} userId - The user ID (required, must be between 1-10)
 * @property {Array} conversationHistory - Previous messages (optional, default: [])
 *
 * Response Format (JSON):
 * {
 *   "success": true,
 *   "response": "complete agent response",
 *   "conversationHistory": [...],
 *   "toolCallsCount": 2
 * }
 *
 * @route POST /api/chat/simple
 * @param {string} req.body.message - User's chat message
 * @param {number} req.body.userId - User ID (1-10)
 * @param {Array} req.body.conversationHistory - Conversation context
 * @returns {Object} JSON response with complete agent response and metadata
 *
 * @example
 * // Client-side usage
 * const response = await fetch('/api/chat/simple', {
 *   method: 'POST',
 *   headers: { 'Content-Type': 'application/json' },
 *   body: JSON.stringify({ message: 'What is Acamol?', userId: 1, conversationHistory: [] })
 * });
 * const data = await response.json();
 * console.log(data.response);
 */
router.post('/chat/simple', async (req, res) => {
  const { message, userId, conversationHistory = [] } = req.body;

  // Validate input
  if (!message || typeof message !== 'string' || message.trim() === '') {
    return res.status(400).json({
      success: false,
      error: 'INVALID_INPUT',
      message: 'Message is required.'
    });
  }

  try {
    // Execute agent without streaming, wait for complete response
    const result = await handleChat(message.trim(), userId, conversationHistory);
    res.json(result);

  } catch (error) {
    console.error('Chat error:', error);
    res.status(500).json({
      success: false,
      error: 'SERVER_ERROR',
      message: 'An error occurred while processing your request.'
    });
  }
});

// Export the router for use in the main application
module.exports = router;