const pool = require('./config');
const fs = require('fs');
const path = require('path');
const { promisify } = require('util');
const readdir = promisify(fs.readdir);
const readFile = promisify(fs.readFile);

// Create migrations table if it doesn't exist
async function ensureMigrationsTable() {
  const query = `
    CREATE TABLE IF NOT EXISTS migrations (
      id SERIAL PRIMARY KEY,
      name VARCHAR(255) UNIQUE NOT NULL,
      executed_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
    );
  `;
  await pool.query(query);
}

// Get list of executed migrations
async function getExecutedMigrations() {
  const result = await pool.query('SELECT name FROM migrations ORDER BY id');
  return result.rows.map(row => row.name);
}

// Execute a migration file
async function executeMigration(filename) {
  const filePath = path.join(__dirname, 'migrations', filename);
  const sql = await readFile(filePath, 'utf8');
  
  // Split by semicolons and filter out empty statements
  const statements = sql
    .split(';')
    .map(s => s.trim())
    .filter(s => s.length > 0);
  
  const client = await pool.connect();
  try {
    await client.query('BEGIN');
    
    // Execute each statement
    for (const statement of statements) {
      if (statement.trim()) {
        await client.query(statement);
      }
    }
    
    // Record migration
    await client.query(
      'INSERT INTO migrations (name) VALUES ($1)',
      [filename]
    );
    
    await client.query('COMMIT');
    console.log(`✓ Executed migration: ${filename}`);
  } catch (error) {
    await client.query('ROLLBACK');
    throw error;
  } finally {
    client.release();
  }
}

// Main migration function
async function runMigrations() {
  try {
    console.log('Starting database migrations...');
    
    // Ensure migrations table exists
    await ensureMigrationsTable();
    
    // Get list of migration files
    const migrationsDir = path.join(__dirname, 'migrations');
    const files = await readdir(migrationsDir);
    const migrationFiles = files
      .filter(f => f.endsWith('.sql'))
      .sort();
    
    // Get executed migrations
    const executed = await getExecutedMigrations();
    
    // Execute pending migrations
    let executedCount = 0;
    for (const file of migrationFiles) {
      if (!executed.includes(file)) {
        await executeMigration(file);
        executedCount++;
      } else {
        console.log(`⊘ Skipped (already executed): ${file}`);
      }
    }
    
    if (executedCount === 0) {
      console.log('No new migrations to run.');
    } else {
      console.log(`\n✓ Completed ${executedCount} migration(s)`);
    }
    
    process.exit(0);
  } catch (error) {
    console.error('Migration failed:', error);
    process.exit(1);
  }
}

// Run migrations if called directly
if (require.main === module) {
  runMigrations().finally(() => {
    pool.end();
  });
}

module.exports = { runMigrations };
