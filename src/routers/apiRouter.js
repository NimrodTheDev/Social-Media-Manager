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
      'SELECT user_id FROM social_accounts WHERE platform = $1 AND platform_user_id = $2',
      ['x', xUser.id]
    );

    let userId;

    if (existingAccount.rows.length > 0) {
      // Account exists - update tokens
      userId = existingAccount.rows[0].user_id;
      
      await pool.query(
        `UPDATE social_accounts 
         SET access_token = $1, 
             refresh_token = $2,
             token_expires_at = $3,
             platform_username = $4,
             is_active = true,
             updated_at = NOW()
         WHERE platform = $5 AND platform_user_id = $6`,
        [accessToken, refreshToken, expiresAt, xUser.username, 'x', xUser.id]
      );
    } else {
      // New account - create user and X account
      const userResult = await pool.query(
        'INSERT INTO users (name) VALUES ($1) RETURNING id',
        [xUser.name || xUser.username]
      );
      userId = userResult.rows[0].id;
      
      await pool.query(
        `INSERT INTO social_accounts 
         (user_id, platform, access_token, refresh_token, token_expires_at, platform_user_id, platform_username)
         VALUES ($1, $2, $3, $4, $5, $6, $7)`,
        [userId, 'x', accessToken, refreshToken, expiresAt, xUser.id, xUser.username]
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

  const pool = require('../db/config');
  const { getUserFromToken } = require('../utils/userHelpers');

  try {
    // Verify token is valid before attempting to post
    const user = await getUserFromToken(token);
    if (!user) {
      return res.render('error', { 
        message: 'Invalid or expired token. Please reconnect your X account.' 
      });
    }

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

    const tweetId = tweetResponse.data.data.id;
    const postedAt = new Date();

    // Save post to database
    await pool.query(
      `INSERT INTO posts 
       (account_id, content, status, posted_at, platform_post_id)
       VALUES ($1, $2, $3, $4, $5)`,
      [user.account_id, tweetText.trim(), 'posted', postedAt, tweetId]
    );

    // Success - render success page
    res.render('success', { 
      tweetId: tweetId,
      tweetText: tweetText.trim()
    });
  } catch (error) {
    console.error('Tweet posting error:', error.response?.data || error.message);
    
    // Check if it's an authentication error from X API
    const isAuthError = error.response?.status === 401 || 
                       error.response?.status === 403 ||
                       error.response?.data?.title === 'Unauthorized';
    
    if (isAuthError) {
      return res.render('error', { 
        message: 'Your X account access has expired or been revoked. Please reconnect your account.' 
      });
    }
    
    // Save failed post to database if we have user info
    try {
      const user = await getUserFromToken(token);
      if (user) {
        await pool.query(
          `INSERT INTO posts 
           (account_id, content, status, error_message)
           VALUES ($1, $2, $3, $4)`,
          [
            user.account_id, 
            tweetText.trim(), 
            'failed', 
            error.response?.data?.detail || error.message
          ]
        );
      }
    } catch (dbError) {
      console.error('Error saving failed post:', dbError);
    }
    
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
      WHERE account_id = $1`,
      [user.account_id]
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
          id: user.account_id,
          username: user.platform_username,
          x_user_id: user.platform_user_id
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

// GET /api/posts → get all posts for authenticated user
router.get('/api/posts', async (req, res) => {
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

    // Fetch all posts for this user's account (platform determined from account)
    const result = await pool.query(
      `SELECT 
        p.id,
        p.content,
        p.mode,
        p.thread,
        p.reply_to_id,
        p.quote_tweet_id,
        p.media,
        p.status,
        p.scheduled_at,
        p.posted_at,
        p.platform_post_id,
        p.platform_thread_ids,
        p.error_message,
        p.created_at,
        p.updated_at,
        sa.platform
      FROM posts p
      JOIN social_accounts sa ON p.account_id = sa.id
      WHERE p.account_id = $1
      ORDER BY p.created_at DESC`,
      [user.account_id]
    );

    // Helper function to safely parse JSON (handles already-parsed JSONB)
    const safeParseJSON = (value) => {
      if (!value) return null;
      if (typeof value === 'string') {
        try {
          return JSON.parse(value);
        } catch (e) {
          return value; // Return as-is if parsing fails
        }
      }
      return value; // Already parsed (JSONB from PostgreSQL)
    };

    // Parse JSON fields (JSONB columns are already parsed by pg library)
    const posts = result.rows.map(post => ({
      ...post,
      thread: safeParseJSON(post.thread),
      media: safeParseJSON(post.media),
      platform_thread_ids: safeParseJSON(post.platform_thread_ids),
      // Backward compatibility
      x_tweet_id: post.platform_post_id,
      x_thread_ids: safeParseJSON(post.platform_thread_ids)
    }));

    res.json({ posts: posts });
  } catch (error) {
    console.error('Error fetching posts:', error);
    res.status(500).json({ error: 'Failed to fetch posts' });
  }
});

// POST /api/posts → create a new post and store it in database (as draft)
router.post('/api/posts', async (req, res) => {
  const { 
    text, 
    mode = 'single', 
    thread, 
    replyToId, 
    quoteTweetId, 
    media, 
    accessToken, 
    scheduledAt 
  } = req.body;

  if (!accessToken) {
    return res.status(401).json({ error: 'Access token required' });
  }

  // Validate mode
  if (!['single', 'thread', 'reply', 'quote'].includes(mode)) {
    return res.status(400).json({ error: 'Invalid mode. Must be: single, thread, reply, or quote' });
  }

  // Validate content based on mode
  if (mode === 'single') {
    if (!text || text.trim().length === 0) {
      return res.status(400).json({ error: 'Post text cannot be empty' });
    }
    if (text.length > 280) {
      return res.status(400).json({ error: 'Post text exceeds 280 characters' });
    }
  } else if (mode === 'thread') {
    if (!thread || !Array.isArray(thread) || thread.length < 2) {
      return res.status(400).json({ error: 'Thread must have at least 2 tweets' });
    }
    // Validate each thread tweet
    for (let i = 0; i < thread.length; i++) {
      if (!thread[i] || thread[i].trim().length === 0) {
        return res.status(400).json({ error: `Thread tweet ${i + 1} cannot be empty` });
      }
      if (thread[i].length > 280) {
        return res.status(400).json({ error: `Thread tweet ${i + 1} exceeds 280 characters` });
      }
    }
  } else if (mode === 'reply') {
    if (!text || text.trim().length === 0) {
      return res.status(400).json({ error: 'Reply text cannot be empty' });
    }
    if (text.length > 280) {
      return res.status(400).json({ error: 'Reply text exceeds 280 characters' });
    }
    if (!replyToId) {
      return res.status(400).json({ error: 'replyToId is required for reply mode' });
    }
  } else if (mode === 'quote') {
    if (!text || text.trim().length === 0) {
      return res.status(400).json({ error: 'Quote text cannot be empty' });
    }
    if (text.length > 280) {
      return res.status(400).json({ error: 'Quote text exceeds 280 characters' });
    }
    if (!quoteTweetId) {
      return res.status(400).json({ error: 'quoteTweetId is required for quote mode' });
    }
  }

  // Validate media if provided
  if (media && Array.isArray(media)) {
    // Media validation can be added here (check types, sizes, etc.)
    // For now, just ensure it's an array
  }

  const pool = require('../db/config');
  const { getUserFromToken } = require('../utils/userHelpers');

  try {
    const user = await getUserFromToken(accessToken);

    if (!user) {
      return res.status(401).json({ error: 'Invalid or expired token' });
    }

    // Determine status based on scheduledAt
    let status = 'draft';
    let scheduled_at = null;

    if (scheduledAt) {
      const scheduledDate = new Date(scheduledAt);
      if (isNaN(scheduledDate.getTime())) {
        return res.status(400).json({ error: 'Invalid scheduled_at date format' });
      }
      if (scheduledDate <= new Date()) {
        return res.status(400).json({ error: 'Scheduled date must be in the future' });
      }
      status = 'scheduled';
      scheduled_at = scheduledDate;
    }

    // Prepare data for database
    // For single mode, use text as content
    // For thread mode, use first tweet as content, store rest in thread JSONB
    const content = mode === 'thread' ? thread[0] : (text || '');
    const threadData = mode === 'thread' ? JSON.stringify(thread) : null;

    // Create post in database (platform determined from account when posting)
    const result = await pool.query(
      `INSERT INTO posts 
       (account_id, content, mode, thread, reply_to_id, quote_tweet_id, media, status, scheduled_at)
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9)
       RETURNING id, content, mode, thread, reply_to_id, quote_tweet_id, media, status, scheduled_at, created_at, updated_at`,
      [
        user.account_id,
        content.trim(), 
        mode,
        threadData,
        replyToId || null,
        quoteTweetId || null,
        media ? JSON.stringify(media) : null,
        status, 
        scheduled_at
      ]
    );

    const post = result.rows[0];

    // Helper function to safely parse JSON (handles already-parsed JSONB)
    const safeParseJSON = (value) => {
      if (!value) return null;
      if (typeof value === 'string') {
        try {
          return JSON.parse(value);
        } catch (e) {
          return value; // Return as-is if parsing fails
        }
      }
      return value; // Already parsed (JSONB from PostgreSQL)
    };

    res.status(201).json({
      success: true,
      post: {
        id: post.id,
        text: post.content,
        mode: post.mode,
        thread: safeParseJSON(post.thread),
        reply_to_id: post.reply_to_id,
        quote_tweet_id: post.quote_tweet_id,
        media: safeParseJSON(post.media),
        status: post.status,
        scheduled_at: post.scheduled_at,
        created_at: post.created_at,
        updated_at: post.updated_at
      },
      message: status === 'scheduled' 
        ? 'Post scheduled successfully' 
        : 'Post created as draft'
    });
  } catch (error) {
    console.error('Error creating post:', error);
    res.status(500).json({ error: 'Failed to create post' });
  }
});

// POST /api/posts/:id/post → post a specific post to X
router.post('/api/posts/:id/post', async (req, res) => {
  const { id } = req.params;
  const { accessToken } = req.body;

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

    // Get the post with account info to determine platform
    const postResult = await pool.query(
      `SELECT p.*, sa.platform
       FROM posts p
       JOIN social_accounts sa ON p.account_id = sa.id
       WHERE p.id = $1 AND p.account_id = $2`,
      [id, user.account_id]
    );

    if (postResult.rows.length === 0) {
      return res.status(404).json({ error: 'Post not found' });
    }

    const post = postResult.rows[0];

    if (post.status === 'posted') {
      return res.status(400).json({ error: 'Post already published' });
    }

    // Post to X API based on mode
    let tweetId;
    let threadIds = null;
    const postedAt = new Date();

    // Helper function to safely parse JSON (handles already-parsed JSONB)
    const safeParseJSON = (value) => {
      if (!value) return null;
      if (typeof value === 'string') {
        try {
          return JSON.parse(value);
        } catch (e) {
          return value; // Return as-is if parsing fails
        }
      }
      return value; // Already parsed (JSONB from PostgreSQL)
    };

    if (post.mode === 'single') {
      // Single tweet
      const mediaData = safeParseJSON(post.media);
      const tweetResponse = await axios.post(
        `${X_API_BASE}/tweets`,
        {
          text: post.content,
          ...(mediaData && { media: { media_ids: mediaData.map(m => m.media_id) } })
        },
        {
          headers: {
            'Authorization': `Bearer ${accessToken}`,
            'Content-Type': 'application/json'
          }
        }
      );
      tweetId = tweetResponse.data.data.id;
    } else if (post.mode === 'thread') {
      // Thread - post first tweet, then reply to it for subsequent tweets
      const thread = safeParseJSON(post.thread);
      const mediaData = safeParseJSON(post.media);
      const tweetIds = [];
      
      // Post first tweet
      const firstTweetResponse = await axios.post(
        `${X_API_BASE}/tweets`,
        {
          text: thread[0],
          ...(mediaData && { media: { media_ids: mediaData.map(m => m.media_id) } })
        },
        {
          headers: {
            'Authorization': `Bearer ${accessToken}`,
            'Content-Type': 'application/json'
          }
        }
      );
      tweetIds.push(firstTweetResponse.data.data.id);
      
      // Post subsequent tweets as replies
      let inReplyToId = firstTweetResponse.data.data.id;
      for (let i = 1; i < thread.length; i++) {
        const replyResponse = await axios.post(
          `${X_API_BASE}/tweets`,
          {
            text: thread[i],
            reply: { in_reply_to_tweet_id: inReplyToId }
          },
          {
            headers: {
              'Authorization': `Bearer ${accessToken}`,
              'Content-Type': 'application/json'
            }
          }
        );
        tweetIds.push(replyResponse.data.data.id);
        inReplyToId = replyResponse.data.data.id;
      }
      
      tweetId = tweetIds[0]; // First tweet ID
      threadIds = JSON.stringify(tweetIds);
    } else if (post.mode === 'reply') {
      // Reply tweet
      const mediaData = safeParseJSON(post.media);
      const replyResponse = await axios.post(
        `${X_API_BASE}/tweets`,
        {
          text: post.content,
          reply: { in_reply_to_tweet_id: post.reply_to_id },
          ...(mediaData && { media: { media_ids: mediaData.map(m => m.media_id) } })
        },
        {
          headers: {
            'Authorization': `Bearer ${accessToken}`,
            'Content-Type': 'application/json'
          }
        }
      );
      tweetId = replyResponse.data.data.id;
    } else if (post.mode === 'quote') {
      // Quote tweet
      const mediaData = safeParseJSON(post.media);
      const quoteResponse = await axios.post(
        `${X_API_BASE}/tweets`,
        {
          text: post.content,
          quote_tweet_id: post.quote_tweet_id,
          ...(mediaData && { media: { media_ids: mediaData.map(m => m.media_id) } })
        },
        {
          headers: {
            'Authorization': `Bearer ${accessToken}`,
            'Content-Type': 'application/json'
          }
        }
      );
      tweetId = quoteResponse.data.data.id;
    }

    // Update post in database
    await pool.query(
      `UPDATE posts 
       SET status = 'posted',
           posted_at = $1,
           platform_post_id = $2,
           platform_thread_ids = $3,
           error_message = NULL,
           updated_at = NOW()
       WHERE id = $4`,
      [postedAt, tweetId, threadIds, id]
    );

    res.json({ 
      success: true, 
      tweetId: tweetId,
      threadIds: threadIds ? safeParseJSON(threadIds) : null,
      message: 'Post published successfully' 
    });
  } catch (error) {
    console.error('Error posting tweet:', error.response?.data || error.message);
    
    // Update post status to failed
    try {
      await pool.query(
        `UPDATE posts 
         SET status = 'failed',
             error_message = $1,
             updated_at = NOW()
         WHERE id = $2`,
        [error.response?.data?.detail || error.message, id]
      );
    } catch (dbError) {
      console.error('Error updating failed post:', dbError);
    }

    res.status(500).json({ 
      error: 'Failed to post tweet',
      message: error.response?.data?.detail || error.message 
    });
  }
});

module.exports = router;
