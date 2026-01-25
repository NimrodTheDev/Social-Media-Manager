# X (Twitter) API Access Token Expiration

## Short Answer

**X API v2 OAuth 2.0 access tokens do NOT expire automatically** - they remain valid until:
- You manually revoke them
- Credentials are regenerated in the X Developer Portal
- The user clears their browser data (if stored client-side)

However, the token response **may include an `expires_in` field** that you should handle for best practices.

## Token Response Structure

When you exchange the authorization code for an access token, the response typically looks like:

```json
{
  "token_type": "bearer",
  "expires_in": 7200,  // Seconds until expiration (if provided)
  "access_token": "your_access_token_here",
  "refresh_token": "your_refresh_token_here",  // If offline.access scope is used
  "scope": "tweet.read tweet.write users.read offline.access"
}
```

## Current Implementation Issue

Your current code **doesn't capture or store the expiration time**:

```javascript
// Current code (apiRouter.js line 86)
const accessToken = tokenResponse.data.access_token;
// ❌ Not capturing expires_in or refresh_token
```

## What You Should Do

### 1. Capture Token Expiration (If Provided)

Even though tokens don't expire automatically, X may provide `expires_in` in the response. You should capture it:

```javascript
const tokenResponse = await axios.post(/* ... */);

const accessToken = tokenResponse.data.access_token;
const refreshToken = tokenResponse.data.refresh_token; // If available
const expiresIn = tokenResponse.data.expires_in; // Seconds until expiration
const tokenType = tokenResponse.data.token_type; // Usually "bearer"

// Calculate expiration timestamp
const expiresAt = expiresIn 
  ? new Date(Date.now() + (expiresIn * 1000))
  : null; // null if no expiration
```

### 2. Store in Database

Your schema already has `token_expires_at` in the `x_accounts` table:

```sql
token_expires_at TIMESTAMP
```

Update your OAuth callback to store this:

```javascript
await pool.query(
  `INSERT INTO x_accounts 
   (user_id, access_token, refresh_token, token_expires_at, x_user_id, x_username)
   VALUES ($1, $2, $3, $4, $5, $6)`,
  [userId, accessToken, refreshToken, expiresAt, xUser.id, xUser.username]
);
```

### 3. Handle Token Refresh (If Needed)

If `expires_in` is provided and the token expires:

```javascript
// Check if token is expired
const account = await pool.query(
  `SELECT * FROM x_accounts 
   WHERE x_user_id = $1 AND is_active = true`,
  [xUserId]
);

if (account.rows[0].token_expires_at < new Date()) {
  // Token expired - use refresh_token to get new one
  const newTokenResponse = await refreshAccessToken(account.rows[0].refresh_token);
  // Update database with new token
}
```

## Practical Recommendation for MVP

Since X tokens **don't expire automatically**, for your MVP you can:

1. **Store the expiration if provided** (for future-proofing)
2. **Set `token_expires_at` to NULL** if no expiration is provided
3. **Don't worry about refresh logic yet** (unless you see `expires_in` in responses)

### Updated OAuth Callback Example

```javascript
router.get('/auth/callback', async (req, res) => {
  // ... existing code ...
  
  const tokenResponse = await axios.post(/* ... */);
  
  const accessToken = tokenResponse.data.access_token;
  const refreshToken = tokenResponse.data.refresh_token || null;
  const expiresIn = tokenResponse.data.expires_in; // May be undefined
  
  // Calculate expiration (null if not provided)
  const expiresAt = expiresIn 
    ? new Date(Date.now() + (expiresIn * 1000))
    : null;
  
  // Get X user info
  const xUser = await getXUserInfo(accessToken);
  
  // Store in database with expiration
  await pool.query(
    `INSERT INTO x_accounts 
     (user_id, access_token, refresh_token, token_expires_at, x_user_id, x_username)
     VALUES ($1, $2, $3, $4, $5, $6)
     ON CONFLICT (user_id) 
     DO UPDATE SET 
       access_token = $2,
       refresh_token = $3,
       token_expires_at = $4,
       x_username = $6,
       updated_at = NOW()`,
    [userId, accessToken, refreshToken, expiresAt, xUser.id, xUser.username]
  );
  
  // ... rest of code ...
});
```

## Summary

- **Tokens don't expire automatically** - they're valid indefinitely
- **Capture `expires_in` if provided** - for future-proofing
- **Store `token_expires_at` in database** - even if NULL
- **No refresh logic needed for MVP** - unless you see expiration in responses

## References

- [X API Getting Started](https://developer.x.com/en/docs/twitter-api/getting-started/getting-access-to-the-twitter-api)
- [OAuth 2.0 Overview](https://docs.x.com/fundamentals/authentication/oauth-2-0/overview)
