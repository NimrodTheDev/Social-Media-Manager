-- Migration: Remove unique constraint from username
-- This allows multiple users to have the same display name

ALTER TABLE users DROP CONSTRAINT IF EXISTS users_username_key;
