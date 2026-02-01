-- Migration: Refactor schema to be platform-agnostic
-- This migration transforms X-specific tables to support multiple platforms
-- while preserving all existing X functionality

-- ============================================================================
-- STEP 1: Create platform enum
-- ============================================================================
CREATE TYPE platform_type AS ENUM ('x', 'instagram', 'facebook', 'linkedin', 'tiktok');

-- ============================================================================
-- STEP 2: Create new social_accounts table (platform-agnostic)
-- ============================================================================
CREATE TABLE social_accounts (
    id SERIAL PRIMARY KEY,
    user_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    platform platform_type NOT NULL,
    access_token TEXT NOT NULL,
    refresh_token TEXT,
    token_expires_at TIMESTAMP,
    platform_user_id VARCHAR(255) NOT NULL, -- Generic: x_user_id, instagram_user_id, etc.
    platform_username VARCHAR(255), -- Generic: x_username, instagram_username, etc.
    is_active BOOLEAN DEFAULT true,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    -- Allow multiple accounts per user, but only one per platform per user
    CONSTRAINT one_account_per_platform_per_user UNIQUE (user_id, platform)
);

-- Indexes for social_accounts
CREATE INDEX idx_social_accounts_user_id ON social_accounts(user_id);
CREATE INDEX idx_social_accounts_platform ON social_accounts(platform);
CREATE INDEX idx_social_accounts_platform_user_id ON social_accounts(platform, platform_user_id);

-- ============================================================================
-- STEP 3: Migrate data from x_accounts to social_accounts
-- ============================================================================
INSERT INTO social_accounts (
    user_id,
    platform,
    access_token,
    refresh_token,
    token_expires_at,
    platform_user_id,
    platform_username,
    is_active,
    created_at,
    updated_at
)
SELECT 
    user_id,
    'x'::platform_type,
    access_token,
    refresh_token,
    token_expires_at,
    x_user_id,
    x_username,
    is_active,
    created_at,
    updated_at
FROM x_accounts;

-- ============================================================================
-- STEP 4: Update posts table to be platform-agnostic
-- ============================================================================
-- Add new generic columns
ALTER TABLE posts 
ADD COLUMN account_id INTEGER REFERENCES social_accounts(id) ON DELETE CASCADE,
ADD COLUMN platform_post_id VARCHAR(255); -- Generic: x_tweet_id, instagram_post_id, etc.
-- Note: Platform is determined from social_accounts.platform when posting, not stored on post

-- Migrate data: link posts to social_accounts
-- Handle x_tweet_id column (may not exist if migration 002 wasn't run)
DO $$ 
BEGIN
    IF EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_name = 'posts' AND column_name = 'x_tweet_id'
    ) THEN
        -- x_tweet_id exists - migrate it
        UPDATE posts p
        SET 
            account_id = sa.id,
            platform_post_id = p.x_tweet_id
        FROM x_accounts xa
        JOIN social_accounts sa ON sa.user_id = xa.user_id AND sa.platform = 'x'
        WHERE p.x_account_id = xa.id;
    ELSE
        -- x_tweet_id doesn't exist - migrate without it
        UPDATE posts p
        SET 
            account_id = sa.id,
            platform_post_id = NULL
        FROM x_accounts xa
        JOIN social_accounts sa ON sa.user_id = xa.user_id AND sa.platform = 'x'
        WHERE p.x_account_id = xa.id;
    END IF;
END $$;

-- Make account_id NOT NULL after migration
ALTER TABLE posts 
ALTER COLUMN account_id SET NOT NULL;

-- Drop old foreign key constraint and columns
-- Handle case where columns might not exist
DO $$ 
BEGIN
    -- Drop foreign key constraint if it exists
    IF EXISTS (
        SELECT 1 FROM information_schema.table_constraints 
        WHERE constraint_name = 'posts_x_account_id_fkey'
    ) THEN
        ALTER TABLE posts DROP CONSTRAINT posts_x_account_id_fkey;
    END IF;
    
    -- Drop x_account_id column if it exists
    IF EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_name = 'posts' AND column_name = 'x_account_id'
    ) THEN
        ALTER TABLE posts DROP COLUMN x_account_id;
    END IF;
    
    -- Drop x_tweet_id column if it exists
    IF EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_name = 'posts' AND column_name = 'x_tweet_id'
    ) THEN
        ALTER TABLE posts DROP COLUMN x_tweet_id;
    END IF;
END $$;

-- Rename x_thread_ids to platform_thread_ids (more generic)
-- Handle case where migration 002 might not have been run
DO $$ 
BEGIN
    IF EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_name = 'posts' AND column_name = 'x_thread_ids'
    ) THEN
        ALTER TABLE posts RENAME COLUMN x_thread_ids TO platform_thread_ids;
    END IF;
END $$;

-- Add new indexes
CREATE INDEX idx_posts_account_id ON posts(account_id);
CREATE INDEX idx_posts_platform_post_id ON posts(platform_post_id) WHERE platform_post_id IS NOT NULL;

-- Drop old index
DROP INDEX IF EXISTS idx_posts_x_account_id;

-- ============================================================================
-- STEP 5: Add trigger for social_accounts
-- ============================================================================
CREATE TRIGGER update_social_accounts_updated_at BEFORE UPDATE ON social_accounts
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- ============================================================================
-- STEP 6: Drop old x_accounts table (after data migration)
-- ============================================================================
-- Note: We keep the table temporarily for safety, but it's no longer used
-- You can drop it manually after verifying the migration worked:
-- DROP TABLE x_accounts CASCADE;
-- DROP INDEX IF EXISTS idx_x_accounts_x_user_id;

-- ============================================================================
-- NOTES:
-- ============================================================================
-- All X-specific fields are preserved:
--   - mode (single, thread, reply, quote) - X-specific but stored per post
--   - thread - X-specific thread data
--   - reply_to_id - X-specific reply reference
--   - quote_tweet_id - X-specific quote reference
--   - platform_thread_ids - X-specific thread IDs after posting
--
-- These fields will work for X posts. When adding other platforms:
--   - Instagram: Can add instagram_carousel, instagram_story fields
--   - Facebook: Can add facebook_album, facebook_video fields
--   - LinkedIn: Can add linkedin_article, linkedin_poll fields
--
-- The platform field on posts allows filtering by platform
-- The platform field on social_accounts allows multiple accounts per user
