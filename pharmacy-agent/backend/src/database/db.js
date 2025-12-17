/**
 * Database Connection Module
 *
 * This module initializes and configures the SQLite database connection
 * for the pharmacy agent application using better-sqlite3.
 *
 * @module database/db
 */

const Database = require('better-sqlite3');
const path = require('path');
const config = require('../config');

// Resolve from backend folder (process.cwd())
const dbPath = path.resolve(process.cwd(), config.database.path);

// Initialize the SQLite database connection
const db = new Database(dbPath);

// Enable foreign key constraints to maintain referential integrity
db.pragma('foreign_keys = ON');

console.log('Database connected:', dbPath);

/**
 * SQLite database instance configured with foreign key support.
 * This instance can be imported and used throughout the application
 * for all database operations.
 *
 * @type {Database}
 */
module.exports = db;





