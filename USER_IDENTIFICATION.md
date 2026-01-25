# User Identification Guide

## Current State

**Problem**: Your current setup has **no user identification system**. 

After OAuth:
- ✅ You get an `access_token` from X
- ❌ You don't fetch the X user's information
- ❌ You don't create a user in your database
- ❌ You don't know which user is making requests

## How to Get User Information

### Step 1: Fetch User Info from X API

After getting the access token, call X API to get the authenticated user's details:

```javascript
// Using the X API v2 /users/me endpoint
const response = await axios.get('https://api.twitter.com/2/users/me', {
  headers: {
    'Authorization': `Bearer ${accessToken}`
  },
  params: {
    'user.fields': 'id,username,name,created_at'
  }
});

const xUser = response.data.data;
// Returns: { id: '123456789', username: 'johndoe', name: 'John Doe', ... }
```

### Step 2: Create or Find User in Database

You have several options:

#### Option A: One User Per X Account (Recommended for MVP)

```javascript
// In /auth/callback after getting access token
const xUser = await getXUserInfo(accessToken);

// Check if X account already exists
const existingAccount = await pool.query(
  'SELECT user_id FROM x_accounts WHERE x_user_id = $1',
  [xUser.id]
);

let userId;

if (existingAccount.rows.length > 0) {
  // Account exists - use existing user
  userId = existingAccount.rows[0].user_id;
  
  // Update tokens
  await pool.query(
    `UPDATE x_accounts 
     SET access_token = $1, 
         refresh_token = $2,
         token_expires_at = $3,
         updated_at = NOW()
     WHERE x_user_id = $4`,
    [accessToken, refreshToken, expiresAt, xUser.id]
  );
} else {
  // New account - create user and X account
  const userResult = await pool.query(
    'INSERT INTO users (name) VALUES ($1) RETURNING id',
    [xUser.name || xUser.username]
  );
  userId = userResult.rows[0].id;
  
  await pool.query(
    `INSERT INTO x_accounts 
     (user_id, access_token, refresh_token, token_expires_at, x_user_id, x_username)
     VALUES ($1, $2, $3, $4, $5, $6)`,
    [userId, accessToken, refreshToken, expiresAt, xUser.id, xUser.username]
  );
}
```

#### Option B: Session-Based User Tracking

```javascript
// After creating/finding user, create a session
req.session.userId = userId;

// In subsequent requests, get user from session
const userId = req.session.userId;
const user = await pool.query('SELECT * FROM users WHERE id = $1', [userId]);
```

#### Option C: Token-Based (Current Approach - Needs Enhancement)

Currently you're storing tokens in localStorage. To identify users:

1. **Store user_id with token** (in database):
```javascript
// After OAuth callback
const userId = /* create or find user */;
const tokenData = {
  accessToken,
  userId,  // Add this
  xUserId: xUser.id
};
// Store in database, return token + userId to client
```

2. **Send user_id with requests**:
```javascript
// Client sends both token and userId
fetch('/post', {
  method: 'POST',
  body: JSON.stringify({
    tweetText: 'Hello',
    accessToken: token,
    userId: userId  // Add this
  })
});
```

3. **Server validates and gets user**:
```javascript
// In /post route
const { tweetText, accessToken, userId } = req.body;

// Verify token belongs to user
const account = await pool.query(
  `SELECT * FROM x_accounts 
   WHERE user_id = $1 AND access_token = $2`,
  [userId, accessToken]
);

if (account.rows.length === 0) {
  return res.status(401).json({ error: 'Invalid token' });
}

const user = await pool.query('SELECT * FROM users WHERE id = $1', [userId]);
```

## Recommended Approach for Your MVP

### Simple Token-Based with Database Lookup

1. **After OAuth callback**:
   - Get X user info
   - Create/find user in database
   - Store X account with tokens
   - Return token to client (as you do now)

2. **When client makes requests**:
   - Client sends access token
   - Server looks up token in `x_accounts` table
   - Gets `user_id` from the account
   - Uses that user for the operation

### Implementation Example

```javascript
// In apiRouter.js - OAuth callback
router.get('/auth/callback', async (req, res) => {
  // ... existing token exchange code ...
  
  const accessToken = tokenResponse.data.access_token;
  const refreshToken = tokenResponse.data.refresh_token;
  const expiresAt = new Date(Date.now() + (tokenResponse.data.expires_in * 1000));
  
  // NEW: Get X user info
  const xUser = await getXUserInfo(accessToken);
  
  // NEW: Create or find user and X account
  const pool = require('../db/config');
  
  // Check if X account exists
  const existing = await pool.query(
    'SELECT user_id FROM x_accounts WHERE x_user_id = $1',
    [xUser.id]
  );
  
  let userId;
  if (existing.rows.length > 0) {
    // Update existing account
    userId = existing.rows[0].user_id;
    await pool.query(
      `UPDATE x_accounts 
       SET access_token = $1, refresh_token = $2, token_expires_at = $3,
           x_username = $4, updated_at = NOW()
       WHERE x_user_id = $5`,
      [accessToken, refreshToken, expiresAt, xUser.username, xUser.id]
    );
  } else {
    // Create new user and account
    const userResult = await pool.query(
      'INSERT INTO users (name) VALUES ($1) RETURNING id',
      [xUser.name || xUser.username]
    );
    userId = userResult.rows[0].id;
    
    await pool.query(
      `INSERT INTO x_accounts 
       (user_id, access_token, refresh_token, token_expires_at, x_user_id, x_username)
       VALUES ($1, $2, $3, $4, $5, $6)`,
      [userId, accessToken, refreshToken, expiresAt, xUser.id, xUser.username]
    );
  }
  
  // Redirect with token (as before)
  res.redirect(`/?token=${encodeURIComponent(accessToken)}&message=Account connected!`);
});

// In /post route - get user from token
router.post('/post', async (req, res) => {
  const { tweetText, accessToken } = req.body;
  
  // NEW: Get user from token
  const pool = require('../db/config');
  const accountResult = await pool.query(
    `SELECT xa.*, u.id as user_id, u.name as user_name
     FROM x_accounts xa
     JOIN users u ON xa.user_id = u.id
     WHERE xa.access_token = $1 AND xa.is_active = true`,
    [accessToken]
  );
  
  if (accountResult.rows.length === 0) {
    return res.render('error', { 
      message: 'Invalid or expired token. Please reconnect your account.' 
    });
  }
  
  const account = accountResult.rows[0];
  const userId = account.user_id;
  const xAccountId = account.id;
  
  // Now you have the user! Use it for posting
  // ... existing tweet posting code ...
  
  // NEW: Save post to database
  await pool.query(
    `INSERT INTO posts (x_account_id, content, status)
     VALUES ($1, $2, 'posted')`,
    [xAccountId, tweetText]
  );
});
```

## Quick Reference: Getting User from Token

```javascript
// Helper function to get user from access token
async function getUserFromToken(accessToken) {
  const pool = require('../db/config');
  const result = await pool.query(
    `SELECT u.*, xa.x_user_id, xa.x_username
     FROM users u
     JOIN x_accounts xa ON u.id = xa.user_id
     WHERE xa.access_token = $1 AND xa.is_active = true`,
    [accessToken]
  );
  
  return result.rows[0] || null;
}

// Usage
const user = await getUserFromToken(accessToken);
if (!user) {
  // Token invalid or expired
}
```

## Summary

**Current Problem**: No user identification - you only have tokens.

**Solution**: 
1. After OAuth, fetch X user info using the access token
2. Create/find user in database
3. Store X account linked to user
4. When client sends token, look it up in database to get user

**Key Point**: The `x_accounts` table links tokens to users. Use the token to find the account, then get the user from `user_id`.
