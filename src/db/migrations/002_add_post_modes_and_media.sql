-- Migration: Add support for post modes (single, thread, reply, quote) and media
-- This extends the posts table to support X's full post structure

-- Add new columns for post modes and relationships
ALTER TABLE posts 
ADD COLUMN mode VARCHAR(20) DEFAULT 'single' CHECK (mode IN ('single', 'thread', 'reply', 'quote')),
ADD COLUMN thread JSONB, -- Array of strings for thread tweets
ADD COLUMN reply_to_id VARCHAR(255), -- X tweet ID being replied to
ADD COLUMN quote_tweet_id VARCHAR(255), -- X tweet ID being quoted
ADD COLUMN media JSONB, -- Array of media items
ADD COLUMN x_thread_ids JSONB; -- Array of X tweet IDs for threads (stored after posting)

-- Update existing posts to have mode 'single'
UPDATE posts SET mode = 'single' WHERE mode IS NULL;

-- Add index for reply_to_id lookups
CREATE INDEX idx_posts_reply_to_id ON posts(reply_to_id) WHERE reply_to_id IS NOT NULL;

-- Add index for quote_tweet_id lookups
CREATE INDEX idx_posts_quote_tweet_id ON posts(quote_tweet_id) WHERE quote_tweet_id IS NOT NULL;

-- Note: content field is still used for single tweets
-- For threads, thread JSONB array contains the ordered tweets
-- Media is attached to the first tweet only (X rule)
