-- Initial schema migration for Social Media Manager MVP
-- This schema supports X (Twitter) OAuth, post management, and future scheduling

-- ============================================================================
-- USERS TABLE
-- ============================================================================
-- Purpose: Minimal user representation (no auth system yet)
-- Notes: 
--   - Email is optional for MVP but useful for future identification
--   - No password field since auth isn't implemented yet
--   - Can be extended later with authentication, roles, etc.
CREATE TABLE users (
    id SERIAL PRIMARY KEY,
    email VARCHAR(255) UNIQUE,
    name VARCHAR(255),
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- ============================================================================
-- X_ACCOUNTS TABLE
-- ============================================================================
-- Purpose: Store X (Twitter) OAuth credentials and account metadata
-- Notes:
--   - One X account per user (enforced by UNIQUE constraint on user_id)
--   - access_token: Current OAuth 2.0 access token (store securely in production)
--   - refresh_token: Used to obtain new access tokens when they expire
--   - token_expires_at: When the access token expires (OAuth 2.0 tokens have expiration)
--   - x_user_id: The X/Twitter platform user ID (from OAuth response)
--   - x_username: The X/Twitter username (for display purposes)
--   - is_active: Allows disabling accounts without deleting them
--   - OAuth flow: User authorizes → we get access_token + refresh_token → store here
CREATE TABLE x_accounts (
    id SERIAL PRIMARY KEY,
    user_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    access_token TEXT NOT NULL,
    refresh_token TEXT,
    token_expires_at TIMESTAMP,
    x_user_id VARCHAR(255) NOT NULL,
    x_username VARCHAR(255),
    is_active BOOLEAN DEFAULT true,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT one_account_per_user UNIQUE (user_id)
);

-- Index for faster lookups by X user ID
CREATE INDEX idx_x_accounts_x_user_id ON x_accounts(x_user_id);

-- ============================================================================
-- POSTS TABLE
-- ============================================================================
-- Purpose: Store posts/tweets created by the system
-- Notes:
--   - content: The tweet text (max 280 chars, enforced by application)
--   - status: Post lifecycle state (draft → scheduled → posted/failed)
--   - scheduled_at: For future scheduling feature (nullable for immediate posts)
--   - posted_at: Timestamp when post was successfully published to X
--   - x_tweet_id: The X/Twitter tweet ID returned after successful posting
--   - error_message: Stores error details if posting fails
--   - Scheduling workflow:
--     1. Create post with status='draft'
--     2. Set scheduled_at and status='scheduled' when scheduling
--     3. Background job checks scheduled_at and posts when time arrives
--     4. Update status to 'posted' (with x_tweet_id) or 'failed' (with error_message)
CREATE TABLE posts (
    id SERIAL PRIMARY KEY,
    x_account_id INTEGER NOT NULL REFERENCES x_accounts(id) ON DELETE CASCADE,
    content TEXT NOT NULL CHECK (LENGTH(content) <= 280),
    status VARCHAR(20) NOT NULL DEFAULT 'draft' CHECK (status IN ('draft', 'scheduled', 'posted', 'failed')),
    scheduled_at TIMESTAMP,
    posted_at TIMESTAMP,
    x_tweet_id VARCHAR(255),
    error_message TEXT,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Indexes for common queries
CREATE INDEX idx_posts_x_account_id ON posts(x_account_id);
CREATE INDEX idx_posts_status ON posts(status);
CREATE INDEX idx_posts_scheduled_at ON posts(scheduled_at) WHERE scheduled_at IS NOT NULL;

-- ============================================================================
-- TRIGGERS FOR UPDATED_AT TIMESTAMPS
-- ============================================================================
-- Purpose: Automatically update updated_at timestamp on row changes
-- Notes: PostgreSQL function and triggers to keep updated_at current

CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = CURRENT_TIMESTAMP;
    RETURN NEW;
END;
$$ language 'plpgsql';

CREATE TRIGGER update_users_updated_at BEFORE UPDATE ON users
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_x_accounts_updated_at BEFORE UPDATE ON x_accounts
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_posts_updated_at BEFORE UPDATE ON posts
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
