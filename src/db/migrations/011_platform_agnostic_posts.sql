-- Migration: Support platform-agnostic posts/drafts
-- This allows posts to exist without being tied to a specific social account

-- 1. Add user_id to posts table
ALTER TABLE posts ADD COLUMN user_id INTEGER REFERENCES users(id) ON DELETE CASCADE;

-- 2. Backfill user_id from social_accounts
-- For existing posts, we set user_id to the owner of the social_account
UPDATE posts p
SET user_id = sa.user_id
FROM social_accounts sa
WHERE p.account_id = sa.id;

-- 3. Make user_id NOT NULL for future safety (after backfill)
ALTER TABLE posts ALTER COLUMN user_id SET NOT NULL;

-- 4. Make account_id nullable
-- Now we can create posts without a platform assignment
ALTER TABLE posts ALTER COLUMN account_id DROP NOT NULL;

-- 5. Add index for user_id on posts
CREATE INDEX idx_posts_user_id ON posts(user_id);
