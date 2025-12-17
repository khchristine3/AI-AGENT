/**
 * Chat Routes Module
 *
 * This module defines Express routes for the pharmacy agent chat API.
 * It provides endpoints for interacting with the AI agent, including
 * streaming and non-streaming chat modes, health checks, and user data.
 *
 * Available Endpoints:
 * - POST /api/chat - Streaming chat with Server-Sent Events (SSE)
 * - POST /api/chat/simple - Non-streaming chat (returns complete response)
 * - GET /api/health - Health check endpoint
 * - GET /api/users - Retrieve list of users for UI dropdowns
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
 * @param {Object} req.body.message - User's chat message
 * @param {Array} req.body.conversationHistory - Conversation context
 * @returns {Stream} Server-Sent Events stream with agent response
 *
 * @example
 * // Client-side usage with EventSource API
 * fetch('/api/chat', {
 *   method: 'POST',
 *   headers: { 'Content-Type': 'application/json' },
 *   body: JSON.stringify({ message: 'Tell me about Acamol', conversationHistory: [] })
 * });
 */
router.post('/chat', async (req, res) => {
  const { message, conversationHistory = [] } = req.body;

  // Validate input: ensure message is a non-empty string
  if (!message || typeof message !== 'string' || message.trim() === '') {
    return res.status(400).json({
      success: false,
      error: 'INVALID_INPUT',
      message: 'Message is required and must be a non-empty string.'
    });
  }

  console.log('\n========== New Chat Request ==========');
  console.log('Message:', message);

  // Set up Server-Sent Events headers for streaming
  res.setHeader('Content-Type', 'text/event-stream');
  res.setHeader('Cache-Control', 'no-cache');
  res.setHeader('Connection', 'keep-alive');

  // Handle client disconnect gracefully
  req.on('close', () => {
    console.log('Client disconnected');
  });

  try {
    // Callback function: sends each response chunk to client via SSE
    const onChunk = (chunk) => {
      const data = JSON.stringify({ type: 'chunk', content: chunk });
      res.write(`data: ${data}\n\n`);
    };

    // Execute the agent with streaming enabled
    const result = await handleChatStreaming(
      message.trim(),
      conversationHistory,
      onChunk
    );

    // Send final event with complete conversation history and metadata
    const doneData = JSON.stringify({
      type: 'done',
      success: result.success,
      conversationHistory: result.conversationHistory,
      toolCallsCount: result.toolCallsCount
    });
    res.write(`data: ${doneData}\n\n`);

    // Close the SSE stream
    res.end();

  } catch (error) {
    console.error('Chat error:', error);

    // Send error event to client
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
 * @param {Object} req.body.message - User's chat message
 * @param {Array} req.body.conversationHistory - Conversation context
 * @returns {Object} JSON response with complete agent response and metadata
 *
 * @example
 * // Client-side usage
 * const response = await fetch('/api/chat/simple', {
 *   method: 'POST',
 *   headers: { 'Content-Type': 'application/json' },
 *   body: JSON.stringify({ message: 'What is Acamol?', conversationHistory: [] })
 * });
 * const data = await response.json();
 * console.log(data.response);
 */
router.post('/chat/simple', async (req, res) => {
  const { message, conversationHistory = [] } = req.body;

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
    const result = await handleChat(message.trim(), conversationHistory);
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

/**
 * GET /api/health
 *
 * Health check endpoint to verify the API server is running.
 * Used by monitoring tools, load balancers, and deployment scripts
 * to check service availability.
 *
 * Response Format (JSON):
 * {
 *   "status": "ok",
 *   "timestamp": "2025-01-15T10:30:00.000Z",
 *   "service": "pharmacy-agent-backend"
 * }
 *
 * @route GET /api/health
 * @returns {Object} JSON object with health status and timestamp
 *
 * @example
 * const response = await fetch('/api/health');
 * const health = await response.json();
 * console.log(health.status); // "ok"
 */
router.get('/health', (req, res) => {
  res.json({
    status: 'ok',
    timestamp: new Date().toISOString(),
    service: 'pharmacy-agent-backend'
  });
});

/**
 * GET /api/users
 *
 * Retrieves a list of all users (patients) from the database.
 * Returns minimal user information suitable for UI dropdowns and
 * user selection interfaces.
 *
 * Response Format (JSON):
 * {
 *   "success": true,
 *   "data": [
 *     { "id": 1, "name": "David Cohen", "id_number": "123456789" },
 *     { "id": 2, "name": "Sarah Levi", "id_number": "234567890" },
 *     ...
 *   ]
 * }
 *
 * @route GET /api/users
 * @returns {Object} JSON object with array of users sorted by name
 *
 * @example
 * const response = await fetch('/api/users');
 * const { data: users } = await response.json();
 * users.forEach(user => console.log(user.name));
 */
router.get('/users', (req, res) => {
  try {
    const db = require('../database/db');

    // Query users with minimal fields for UI display
    const users = db.prepare(`
      SELECT id, name, id_number
      FROM users
      ORDER BY name
    `).all();

    res.json({
      success: true,
      data: users
    });

  } catch (error) {
    console.error('Error fetching users:', error);
    res.status(500).json({
      success: false,
      error: 'DATABASE_ERROR',
      message: 'Failed to fetch users.'
    });
  }
});

// Export the router for use in the main application
module.exports = router;