ALTER TABLE users
ADD COLUMN avatar_path CHAR(255),
ADD COLUMN post_failure_notification BOOLEAN DEFAULT TRUE,
ADD COLUMN post_success_notification BOOLEAN DEFAULT TRUE;

