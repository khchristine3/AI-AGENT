/**
 * Main Application Entry Point
 *
 * This is the main entry point for the Pharmacy Agent Backend API server.
 * It sets up an Express.js application with middleware, routes, error handlers,
 * and starts the HTTP server.
 *
 * Features:
 * - CORS support for frontend connections
 * - JSON body parsing
 * - Request logging middleware
 * - API routes for chat and user management
 * - Global error handling
 * - Server-Sent Events (SSE) for streaming responses
 *
 * Architecture:
 * - Express.js web framework
 * - RESTful API design
 * - Modular route organization
 * - Centralized configuration
 *
 * Usage:
 *   node src/index.js
 *
 * Environment:
 * - Requires .env file with OPENAI_API_KEY
 * - See config.js for all configuration options
 *
 * @module index
 */

const express = require('express');
const cors = require('cors');
const config = require('./config');
const chatRoutes = require('./routes/chat');

const app = express();

// ============================================
// MIDDLEWARE
// ============================================

// CORS - allow frontend to connect
app.use(cors({
  origin: config.cors.origin,
  credentials: true
}));

// Parse JSON bodies
app.use(express.json());

// Request logging
app.use((req, res, next) => {
  console.log(`${new Date().toISOString()} | ${req.method} ${req.path}`);
  next();
});

// ============================================
// ROUTES
// ============================================

// API routes
app.use('/api', chatRoutes);

// Root endpoint
app.get('/', (req, res) => {
  res.json({
    name: 'Pharmacy Agent API',
    version: '1.0.0',
    status: 'running',
    endpoints: {
      health: 'GET /api/health',
      chat: 'POST /api/chat (streaming)',
      chatSimple: 'POST /api/chat/simple (non-streaming)',
      users: 'GET /api/users'
    }
  });
});

// 404 handler
app.use((req, res) => {
  res.status(404).json({
    success: false,
    error: 'NOT_FOUND',
    message: `Endpoint ${req.method} ${req.path} not found`
  });
});

// Error handler
app.use((err, req, res, next) => {
  console.error('Unhandled error:', err);
  res.status(500).json({
    success: false,
    error: 'SERVER_ERROR',
    message: 'An internal server error occurred'
  });
});

// ============================================
// START SERVER
// ============================================

const PORT = config.port;

app.listen(PORT, () => {
  console.log('');
  console.log('================================================');
  console.log('   PHARMACY AGENT BACKEND');
  console.log('================================================');
  console.log(`   Server running on http://localhost:${PORT}`);
  console.log(`   Model: ${config.openai.model}`);
  console.log(`   CORS origin: ${config.cors.origin}`);
  console.log('================================================');
  console.log('');
});