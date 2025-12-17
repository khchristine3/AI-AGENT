/**
 * Configuration Module
 *
 * This module centralizes all application configuration settings, loading
 * values from environment variables with sensible defaults. It uses dotenv
 * to load environment variables from a .env file.
 *
 * Configuration Categories:
 * - Server settings (port, environment)
 * - OpenAI API settings (API key, model selection)
 * - Database settings (file path)
 * - CORS settings (allowed origins)
 *
 * Environment Variables:
 * - PORT: Server port (default: 3000)
 * - NODE_ENV: Environment mode (default: 'development')
 * - OPENAI_API_KEY: OpenAI API key (required)
 * - OPENAI_MODEL: AI model to use (default: 'gpt-5.1')
 * - DB_PATH: SQLite database file path (default: './src/database/pharmacy.db')
 * - CORS_ORIGIN: Allowed CORS origin (default: 'http://localhost:5173')
 *
 * @module config
 */

require('dotenv').config();

module.exports = {
  port: process.env.PORT || 3000,
  nodeEnv: process.env.NODE_ENV || 'development',
  
  openai: {
    apiKey: process.env.OPENAI_API_KEY,
    model: process.env.OPENAI_MODEL || 'gpt-5'
  },
  
  database: {
    path: process.env.DB_PATH || './src/database/pharmacy.db'
  },
  
  cors: {
    origin: process.env.CORS_ORIGIN || 'http://localhost:5173'
  }
};