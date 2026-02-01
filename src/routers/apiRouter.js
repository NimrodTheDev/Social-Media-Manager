const express = require('express');
const axios = require('axios');
const router = express.Router();

// OAuth 2.0 Configuration
const X_CLIENT_ID = process.env.X_CLIENT_ID;
const X_CLIENT_SECRET = process.env.X_CLIENT_SECRET;
const X_REDIRECT_URI = process.env.X_REDIRECT_URI || 'http://localhost:3100/auth/callback';
const X_AUTH_URL = 'https://twitter.com/i/oauth2/authorize';
const X_TOKEN_URL = 'https://api.twitter.com/2/oauth2/token';
const X_API_BASE = 'https://api.twitter.com/2';

// GET /auth/x → redirect user to X OAuth authorization page
router.get('/auth/x', (req, res) => {
  if (!X_CLIENT_ID || !X_REDIRECT_URI) {
    return res.render('error', { 
      message: 'X API credentials not configured. Please set X_CLIENT_ID and X_REDIRECT_URI environment variables.' 
    });
  }

  // Generate a random state parameter for CSRF protection (simplified for MVP)
  const state = Math.random().toString(36).substring(7);
  
  // Build OAuth 2.0 authorization URL
  const authParams = new URLSearchParams({
    response_type: 'code',
    client_id: X_CLIENT_ID,
    redirect_uri: X_REDIRECT_URI,
    scope: 'tweet.read tweet.write users.read offline.access',
    state: state,
    code_challenge: 'challenge', // Simplified for MVP - should use PKCE in production
    code_challenge_method: 'plain'
  });

  const authUrl = `${X_AUTH_URL}?${authParams.toString()}`;
  
  // Redirect user to X authorization page
  res.redirect(authUrl);
});

// GET /auth/callback → exchange authorization code for access token
// GET /auth/callback → exchange authorization code for access token
router.get('/auth/callback', async (req, res) => {
  const { code, error } = req.query;

  if (error) {
    return res.render('error', { 
      message: `OAuth error: ${error}` 
    });
  }

  if (!code) {
    return res.render('error', { 
      message: 'No authorization code received' 
    });
  }

  if (!X_CLIENT_ID || !X_CLIENT_SECRET || !X_REDIRECT_URI) {
    return res.render('error', { 
      message: 'X API credentials not configured. Please set X_CLIENT_ID, X_CLIENT_SECRET, and X_REDIRECT_URI environment variables.' 
    });
  }

  const pool = require('../db/config');
  const { getXUserInfo } = require('../utils/xApi');

  try {
    // Exchange authorization code for access token
    const credentials = Buffer.from(`${X_CLIENT_ID}:${X_CLIENT_SECRET}`).toString('base64');
    
    const tokenResponse = await axios.post(
      X_TOKEN_URL,
      new URLSearchParams({
        code: code,
        grant_type: 'authorization_code',
        redirect_uri: X_REDIRECT_URI,
        code_verifier: 'challenge'
      }),
      {
        headers: {
          'Content-Type': 'application/x-www-form-urlencoded',
          'Authorization': `Basic ${credentials}`
        }
      }
    );

    // Extract token data
    const accessToken = tokenResponse.data.access_token;
    const refreshToken = tokenResponse.data.refresh_token || null;
    const expiresIn = tokenResponse.data.expires_in;
    const expiresAt = expiresIn ? new Date(Date.now() + (expiresIn * 1000)) : null;

    // Get X user information
    const xUser = await getXUserInfo(accessToken);

    // Check if X account already exists
    const existingAccount = await pool.query(
      'SELECT user_id FROM x_accounts WHERE x_user_id = $1',
      [xUser.id]
    );

    let userId;

    if (existingAccount.rows.length > 0) {
      // Account exists - update tokens
      userId = existingAccount.rows[0].user_id;
      
      await pool.query(
        `UPDATE x_accounts 
         SET access_token = $1, 
             refresh_token = $2,
             token_expires_at = $3,
             x_username = $4,
             is_active = true,
             updated_at = NOW()
         WHERE x_user_id = $5`,
        [accessToken, refreshToken, expiresAt, xUser.username, xUser.id]
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

    // Redirect to homepage with token
    res.redirect(`/?token=${encodeURIComponent(accessToken)}&message=Account connected successfully!`);
  } catch (error) {
    console.error('Token exchange error:', {
      status: error.response?.status,
      statusText: error.response?.statusText,
      data: error.response?.data,
      message: error.message
    });
    
    const errorMessage = error.response?.data?.error_description 
      || error.response?.data?.error 
      || error.message 
      || 'Unknown error occurred';
    
    res.render('error', { 
      message: `Failed to exchange authorization code: ${errorMessage}` 
    });
  }
});

// POST /post → submit tweet text from form and post it to X
router.post('/post', async (req, res) => {
  const { tweetText, accessToken } = req.body;

  if (!tweetText || tweetText.trim().length === 0) {
    return res.render('error', { 
      message: 'Tweet text cannot be empty' 
    });
  }

  // Get access token from request body (sent from client localStorage)
  const token = accessToken;

  if (!token) {
    return res.render('error', { 
      message: 'Not authenticated. Please connect your X account first.' 
    });
  }

  // X API v2 tweet character limit is 280
  if (tweetText.length > 280) {
    return res.render('error', { 
      message: 'Tweet text exceeds 280 characters' 
    });
  }

  try {
    // Post tweet to X API v2
    const tweetResponse = await axios.post(
      `${X_API_BASE}/tweets`,
      {
        text: tweetText.trim()
      },
      {
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        }
      }
    );

    // Success - render success page
    res.render('success', { 
      tweetId: tweetResponse.data.data.id,
      tweetText: tweetText.trim()
    });
  } catch (error) {
    console.error('Tweet posting error:', error.response?.data || error.message);
    res.render('error', { 
      message: `Failed to post tweet: ${error.response?.data?.detail || error.message}` 
    });
  }
});

// GET /api/user → get authenticated user's data
router.get('/api/user', async (req, res) => {
  const { accessToken } = req.query;

  if (!accessToken) {
    return res.status(401).json({ error: 'Access token required' });
  }

  const pool = require('../db/config');
  const { getUserFromToken } = require('../utils/userHelpers');

  try {
    const user = await getUserFromToken(accessToken);

    if (!user) {
      return res.status(401).json({ error: 'Invalid or expired token' });
    }

    // Get user's post statistics
    const statsResult = await pool.query(
      `SELECT 
        COUNT(*) as total_posts,
        COUNT(*) FILTER (WHERE status = 'posted') as posted_count,
        COUNT(*) FILTER (WHERE status = 'draft') as draft_count,
        COUNT(*) FILTER (WHERE status = 'scheduled') as scheduled_count,
        COUNT(*) FILTER (WHERE status = 'failed') as failed_count
      FROM posts
      WHERE x_account_id = $1`,
      [user.x_account_id]
    );

    const stats = statsResult.rows[0] || {
      total_posts: 0,
      posted_count: 0,
      draft_count: 0,
      scheduled_count: 0,
      failed_count: 0
    };

    // Return user data with statistics
    res.json({
      user: {
        id: user.user_id,
        name: user.user_name,
        email: user.email,
        created_at: user.user_created_at,
        x_account: {
          id: user.x_account_id,
          username: user.x_username,
          x_user_id: user.x_user_id
        },
        stats: {
          total: parseInt(stats.total_posts),
          posted: parseInt(stats.posted_count),
          draft: parseInt(stats.draft_count),
          scheduled: parseInt(stats.scheduled_count),
          failed: parseInt(stats.failed_count)
        }
      }
    });
  } catch (error) {
    console.error('Error fetching user data:', error);
    res.status(500).json({ error: 'Failed to fetch user data' });
  }
});

module.exports = router;
