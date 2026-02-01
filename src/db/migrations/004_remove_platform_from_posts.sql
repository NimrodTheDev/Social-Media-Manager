-- Migration: Remove platform column from posts table
-- Platform will be determined from the account when posting, not when creating the post

-- Drop the platform column and its index
ALTER TABLE posts DROP COLUMN IF EXISTS platform;
DROP INDEX IF EXISTS idx_posts_platform;

-- Note: Platform is now determined from social_accounts.platform when posting
