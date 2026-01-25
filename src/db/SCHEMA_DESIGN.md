# Database Schema Design - Social Media Manager MVP

## Overview

This schema is designed for an MVP that posts content to X (Twitter). It's intentionally minimal, focused, and extensible.

## Entity Relationship Diagram

```
┌──────────┐
│  users   │
│──────────│
│ id (PK)  │
│ email    │◄──┐
│ name     │   │
└──────────┘   │
               │ 1:1
               │
┌──────────────┴──────┐
│    x_accounts       │
│────────────────────│
│ id (PK)            │    │
│ user_id (FK)   ├────┘
│ access_token   │
│ refresh_token  │
│ x_user_id      │
│ x_username     │
└────────┬───────┘
         │ 1:many
         │
┌────────┴──────┐
│    posts      │
│───────────────│
│ id (PK)       │
│ x_account_id  │◄──┐
│ content       │   │
│ status        │   │
│ scheduled_at  │   │
│ posted_at     │   │
│ x_tweet_id    │   │
└───────────────┘   │
```

## Tables

### 1. `users`

**Purpose**: Minimal user representation (no authentication system yet)

**Fields**:
- `id`: Primary key
- `email`: Optional, unique identifier
- `name`: Optional display name
- `created_at`, `updated_at`: Timestamps

**Why it exists**: 
- Foundation for future multi-user support
- Links X accounts to users
- Can be extended with authentication later

**Constraints**:
- Email is unique (if provided)

---

### 2. `x_accounts`

**Purpose**: Store X (Twitter) OAuth credentials and account metadata

**Fields**:
- `id`: Primary key
- `user_id`: Foreign key to `users` (one account per user)
- `access_token`: OAuth 2.0 access token (current token)
- `refresh_token`: OAuth 2.0 refresh token (for token renewal)
- `token_expires_at`: When access token expires
- `x_user_id`: X platform user ID (from OAuth)
- `x_username`: X username (for display)
- `is_active`: Enable/disable account without deletion
- `created_at`, `updated_at`: Timestamps

**Why it exists**:
- Persists OAuth credentials (currently stored in browser localStorage)
- Supports token refresh (OAuth 2.0 tokens expire)
- Stores X account metadata for reference

**OAuth Token Storage**:
- `access_token`: Current token used for API calls
- `refresh_token`: Used to get new access tokens when they expire
- `token_expires_at`: Tracks when to refresh (OAuth 2.0 tokens typically expire in hours/days)

**Token Refresh Flow** (future):
1. Check if `token_expires_at` is in the past
2. Use `refresh_token` to call X OAuth token endpoint
3. Update `access_token`, `refresh_token`, and `token_expires_at`

**Constraints**:
- One X account per user (`UNIQUE (user_id)`)
- `user_id` cannot be null

---

### 3. `posts`

**Purpose**: Store posts/tweets with lifecycle management

**Fields**:
- `id`: Primary key
- `x_account_id`: Foreign key to `x_accounts`
- `content`: Tweet text (max 280 characters)
- `status`: Post lifecycle state
- `scheduled_at`: When to post (nullable for immediate posts)
- `posted_at`: When post was successfully published
- `x_tweet_id`: X platform tweet ID (after successful posting)
- `error_message`: Error details if posting fails
- `created_at`, `updated_at`: Timestamps

**Why it exists**:
- Persists posts created by the system
- Tracks post lifecycle (draft → scheduled → posted/failed)
- Enables scheduling feature
- Stores X tweet IDs for reference/deletion

**Post Status Lifecycle**:

```
draft → scheduled → posted
                  ↘ failed
```

1. **draft**: Post created but not scheduled or posted
2. **scheduled**: Post has `scheduled_at` set, waiting to be posted
3. **posted**: Successfully posted to X (has `x_tweet_id`)
4. **failed**: Posting attempt failed (has `error_message`)

**Scheduling Workflow** (future implementation):

1. **Create scheduled post**:
   ```sql
   INSERT INTO posts (x_account_id, content, status, scheduled_at)
   VALUES (1, 'Hello world!', 'scheduled', '2024-01-15 10:00:00');
   ```

2. **Background job** (cron/scheduler):
   - Query: `SELECT * FROM posts WHERE status = 'scheduled' AND scheduled_at <= NOW()`
   - For each post:
     - Attempt to post to X API
     - On success: Update `status = 'posted'`, `posted_at = NOW()`, `x_tweet_id = <tweet_id>`
     - On failure: Update `status = 'failed'`, `error_message = <error>`

3. **Query scheduled posts**:
   ```sql
   SELECT * FROM posts 
   WHERE status = 'scheduled' 
   AND scheduled_at BETWEEN NOW() AND NOW() + INTERVAL '1 hour'
   ORDER BY scheduled_at;
   ```

**Constraints**:
- Content max 280 characters (enforced by CHECK constraint)
- Status must be one of: draft, scheduled, posted, failed
- `x_account_id` cannot be null

**Indexes**:
- `idx_posts_x_account_id`: Fast lookup of all posts for an account
- `idx_posts_status`: Fast filtering by status
- `idx_posts_scheduled_at`: Fast querying of scheduled posts (partial index)

---

## Design Decisions

### Why One Account Per User?

**Constraint**: `UNIQUE (user_id)` on `x_accounts`

**Reason**: MVP simplicity. One user = one X account is sufficient for MVP.

**Future extension**: Remove the unique constraint to support multiple accounts per user.

### Why Store Tokens in Database?

**Current**: Tokens stored in browser localStorage

**Future**: Move to database for:
- Server-side token refresh
- Multi-device support
- Better security (encrypted at rest)
- Scheduled posting (needs server-side tokens)

### Why Separate `x_accounts` Table?

Instead of storing OAuth data directly in `users`:

**Benefits**:
- Clear separation of concerns
- Easy to add other platforms later (e.g., `linkedin_accounts`, `facebook_accounts`)
- Can have multiple accounts per user in the future
- OAuth-specific fields don't clutter user table

### Why Status Enum Instead of Boolean?

**Options considered**:
- `is_posted` (boolean) - too simple
- `status` (enum) - chosen

**Benefits**:
- Supports draft, scheduled, posted, failed states
- Clear lifecycle tracking
- Easy to query by state
- Extensible (can add more states later)

### Why `scheduled_at` is Nullable?

**Reason**: Not all posts are scheduled. Immediate posts don't need this field.

**Query pattern**:
- Scheduled posts: `WHERE scheduled_at IS NOT NULL`
- Immediate posts: `WHERE scheduled_at IS NULL`

### Automatic `updated_at` Timestamps

**Implementation**: PostgreSQL triggers

**Why**: Ensures `updated_at` is always current without application code changes.

---

## Example Queries

### Get all posts for a user's X account
```sql
SELECT p.* 
FROM posts p
JOIN x_accounts xa ON p.x_account_id = xa.id
WHERE xa.user_id = 1
ORDER BY p.created_at DESC;
```

### Get scheduled posts ready to post
```sql
SELECT p.*, xa.access_token, xa.x_username
FROM posts p
JOIN x_accounts xa ON p.x_account_id = xa.id
WHERE p.status = 'scheduled'
  AND p.scheduled_at <= NOW()
  AND xa.is_active = true
ORDER BY p.scheduled_at ASC;
```

### Get user's X account with valid token
```sql
SELECT * 
FROM x_accounts
WHERE user_id = 1
  AND is_active = true
  AND (token_expires_at IS NULL OR token_expires_at > NOW());
```

### Update post after successful posting
```sql
UPDATE posts
SET status = 'posted',
    posted_at = NOW(),
    x_tweet_id = '1234567890',
    updated_at = NOW()
WHERE id = 1;
```

---

## Future Extensions

### Multi-Platform Support
Add similar tables:
- `linkedin_accounts`
- `facebook_accounts`
- `instagram_accounts`

### Analytics
Add `post_analytics` table:
- `post_id` (FK)
- `impressions`, `likes`, `retweets`, etc.

### Teams/Organizations
Add `organizations` and `organization_members` tables.

### Post Templates
Add `post_templates` table for reusable content.

---

## Security Considerations

⚠️ **MVP Note**: This schema is for MVP. Production needs:

1. **Encrypt tokens at rest**: Use encryption for `access_token` and `refresh_token`
2. **Secure token transmission**: Use HTTPS only
3. **Token rotation**: Implement refresh token rotation
4. **Access control**: Add row-level security or application-level checks
5. **Audit logging**: Track who accessed/modified sensitive data

---

## Migration Notes

To apply this schema:

```bash
npm run migrate
```

This will:
1. Create all tables
2. Create indexes
3. Create triggers for `updated_at`
4. Record migration in `migrations` table
