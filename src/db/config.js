require('dotenv').config();
const { Pool } = require('pg');

// Database configuration
// Handle both connection string and individual parameters
const getPoolConfig = () => {
  // If DATABASE_URL is provided (common on Render, Heroku, etc.)
  if (process.env.DATABASE_URL) {
    return {
      connectionString: process.env.DATABASE_URL,
      // Always enable SSL when using DATABASE_URL (cloud providers require it)
      ssl: {
        rejectUnauthorized: false // Allow self-signed certificates
      },
      // Connection pool settings
      max: 20,
      idleTimeoutMillis: 30000,
      connectionTimeoutMillis: 10000,
    };
  }
  
  // Fallback to individual parameters (for local development)
  return {
    host: process.env.DB_HOST || 'localhost',
    port: process.env.DB_PORT || 5432,
    database: process.env.DB_NAME || 'social_media_manager',
    user: process.env.DB_USER || 'postgres',
    password: process.env.DB_PASSWORD || '',
    ssl: false, // Usually not needed for local
    max: 20,
    idleTimeoutMillis: 30000,
    connectionTimeoutMillis: 10000,
  };
};

const pool = new Pool(getPoolConfig());

// Test connection
pool.on('connect', () => {
  console.log('Connected to PostgreSQL database');
});

pool.on('error', (err) => {
  console.error('Unexpected error on idle client', err);
  process.exit(-1);
});

module.exports = pool;
