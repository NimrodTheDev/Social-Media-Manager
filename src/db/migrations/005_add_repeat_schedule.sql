-- Migration: Add repeat/recurring schedule support to posts
-- Allows users to schedule posts that repeat on a schedule (daily, weekly, monthly)

-- Add repeat/recurring schedule columns
ALTER TABLE posts 
ADD COLUMN repeat_enabled BOOLEAN DEFAULT false,
ADD COLUMN repeat_frequency VARCHAR(20) CHECK (repeat_frequency IN ('daily', 'weekly', 'monthly')),
ADD COLUMN repeat_until TIMESTAMP, -- Optional end date for repeating
ADD COLUMN repeat_count INTEGER, -- Optional max number of occurrences
ADD COLUMN repeat_parent_id INTEGER REFERENCES posts(id) ON DELETE CASCADE, -- Link to original recurring post
ADD COLUMN repeat_occurrence INTEGER DEFAULT 1; -- Which occurrence this is (1, 2, 3, etc.)

-- Add index for finding recurring posts
CREATE INDEX idx_posts_repeat_parent_id ON posts(repeat_parent_id) WHERE repeat_parent_id IS NOT NULL;
CREATE INDEX idx_posts_repeat_enabled ON posts(repeat_enabled) WHERE repeat_enabled = true;

-- Notes:
-- - repeat_enabled: true if this post should repeat
-- - repeat_frequency: how often to repeat (daily, weekly, monthly)
-- - repeat_until: stop repeating after this date (optional)
-- - repeat_count: stop after N occurrences (optional)
-- - repeat_parent_id: links child posts to the original recurring post
-- - repeat_occurrence: tracks which occurrence this post is (1st, 2nd, 3rd, etc.)
-- 
-- When a recurring post is published:
-- 1. Scheduler posts it to X
-- 2. Scheduler creates a new scheduled post for the next occurrence
-- 3. New post has same content but new scheduled_at time
-- 4. New post links to original via repeat_parent_id
