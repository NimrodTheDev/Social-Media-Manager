const express = require('express');
const axios = require('axios');
const router = express.Router();
const { postToPlatform } = require('../services/postService');
const Auth = require('../apiHandlers/Auth');
const authMiddleware = require('../middleware/auth');
const Social = require('../apiHandlers/Social');
const { makeResponse } = require('../utils/responder');


// OAuth 2.0 Configuration

const X_API_BASE = 'https://api.twitter.com/2';


// Auth routes (email/password)
router.post('/auth/login', Auth.login);
router.post('/auth/signup', Auth.signUp);
router.post('/auth/request-reset', Auth.requestResetPassword);
router.post('/auth/reset-password', Auth.resetPassword);
router.get('/auth/me', authMiddleware, Auth.me);
router.post('/auth/refresh', Auth.refresh);
router.post('/auth/logout', Auth.logout);




// Transactional email (Resend) – test endpoint
router.post('/api/email/test', async (req, res) => {
  const to = req.body?.to || req.query?.to;
  if (!to) {
    return res.status(400).json({ success: false, message: 'Missing "to" email' });
  }
  if (!isConfigured) {
    return res.status(503).json({ success: false, message: 'Email service not configured (set RESEND_API_KEY)' });
  }
  const result = await sendHtml(
    to,
    'Test from SocialMediaManager',
    '<p>If you see this, Resend is working.</p>'
  );
  if (!result.success) {
    return res.status(500).json({ success: false, message: result.error });
  }
  res.json({ success: true, message: 'Email sent', id: result.id });
});


//Social connenctions
// GET /auth/x → redirect user to X OAuth authorization page
router.get('/connect/x', Social.connectX);
// GET /auth/callback → exchange authorization code for access token
router.get('/connect/x/callback', Social.callbackX);
// GET /api/connected-accounts → get connected accounts for authenticated user
router.get('/connected-accounts', authMiddleware, Social.connectedAccounts);



// POST /post → submit tweet text from form and post it to X
router.post('/post', async (req, res) => {
  const { tweetText, accessToken } = req.body;

  if (!tweetText || tweetText.trim().length === 0) {
    return res.redirect(`/?error=${encodeURIComponent('Tweet text cannot be empty')}`);
  }

  const token = accessToken;

  if (!token) {
    return res.redirect(`/?error=${encodeURIComponent('Not authenticated. Connect your X account first.')}`);
  }

  if (tweetText.length > 280) {
    return res.redirect(`/?error=${encodeURIComponent('Tweet text exceeds 280 characters')}`);
  }

  const pool = require('../db/config');
  const { getUserFromToken } = require('../utils/userHelpers');

  try {
    // Verify token is valid before attempting to post
    const user = await getUserFromToken(token);
    if (!user) {
      return res.redirect(`/?error=${encodeURIComponent('Invalid or expired token. Reconnect your X account.')}`);
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

    res.redirect(`/?message=${encodeURIComponent('Post published successfully!')}`);
  } catch (error) {
    console.error('Tweet posting error:', error.response?.data || error.message);

    // Check if it's an authentication error from X API
    const isAuthError = error.response?.status === 401 ||
      error.response?.status === 403 ||
      error.response?.data?.title === 'Unauthorized';

    if (isAuthError) {
      return res.redirect(`/?error=${encodeURIComponent('X account access expired or revoked. Reconnect your account.')}`);
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

    res.redirect(`/?error=${encodeURIComponent('Failed to post: ' + (error.response?.data?.detail || error.message))}`);
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
        p.repeat_enabled,
        p.repeat_frequency,
        p.repeat_until,
        p.repeat_count,
        p.repeat_parent_id,
        p.repeat_occurrence,
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
    scheduledAt,
    repeat
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

    // Handle repeat settings
    const repeatEnabled = repeat && repeat.frequency ? true : false;
    const repeatFrequency = repeat && repeat.frequency ? repeat.frequency : null;
    const repeatUntil = repeat && repeat.until ? new Date(repeat.until) : null;
    const repeatCount = repeat && repeat.count ? repeat.count : null;

    // Create post in database (platform determined from account when posting)
    const result = await pool.query(
      `INSERT INTO posts 
       (account_id, content, mode, thread, reply_to_id, quote_tweet_id, media, status, scheduled_at, 
        repeat_enabled, repeat_frequency, repeat_until, repeat_count, repeat_occurrence)
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14)
       RETURNING id, content, mode, thread, reply_to_id, quote_tweet_id, media, status, scheduled_at, 
                 repeat_enabled, repeat_frequency, repeat_until, repeat_count, repeat_parent_id, repeat_occurrence,
                 created_at, updated_at`,
      [
        user.account_id,
        content.trim(),
        mode,
        threadData,
        replyToId || null,
        quoteTweetId || null,
        media ? JSON.stringify(media) : null,
        status,
        scheduled_at,
        repeatEnabled,
        repeatFrequency,
        repeatUntil,
        repeatCount,
        1 // First occurrence
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
        repeat_enabled: post.repeat_enabled,
        repeat_frequency: post.repeat_frequency,
        repeat_until: post.repeat_until,
        repeat_count: post.repeat_count,
        created_at: post.created_at,
        updated_at: post.updated_at
      },
      message: status === 'scheduled'
        ? (repeatEnabled ? 'Recurring post scheduled successfully' : 'Post scheduled successfully')
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
      return res.status(400).json({ error: 'Post already published. Use Repost to create a new post with the same content.' });
    }

    // Post to X API using the service
    const postedAt = new Date();
    const result = await postToPlatform(post, accessToken);

    if (!result.success) {
      // Update post status to failed
      await pool.query(
        `UPDATE posts 
         SET status = 'failed',
             error_message = $1,
             updated_at = NOW()
         WHERE id = $2`,
        [result.error, id]
      );

      return res.status(500).json({
        error: 'Failed to post tweet',
        message: result.error
      });
    }

    // Success - update post in database
    const threadIds = result.threadIds ? JSON.stringify(result.threadIds) : null;
    await pool.query(
      `UPDATE posts 
       SET status = 'posted',
           posted_at = $1,
           platform_post_id = $2,
           platform_thread_ids = $3,
           error_message = NULL,
           updated_at = NOW()
       WHERE id = $4`,
      [postedAt, result.tweetId, threadIds, id]
    );

    res.json({
      success: true,
      tweetId: result.tweetId,
      threadIds: result.threadIds,
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

// PATCH /api/posts/:id → update a post (e.g., reschedule, update repeat settings)
router.patch('/api/posts/:id', async (req, res) => {
  const { id } = req.params;
  const { accessToken, scheduledAt, repeat } = req.body;

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

    // Get the post
    const postResult = await pool.query(
      `SELECT * FROM posts 
       WHERE id = $1 AND account_id = $2`,
      [id, user.account_id]
    );

    if (postResult.rows.length === 0) {
      return res.status(404).json({ error: 'Post not found' });
    }

    const post = postResult.rows[0];

    // Build update query dynamically
    const updates = [];
    const values = [];
    let paramIndex = 1;

    // Handle scheduledAt update (reschedule)
    if (scheduledAt !== undefined) {
      const scheduledDate = new Date(scheduledAt);
      if (isNaN(scheduledDate.getTime())) {
        return res.status(400).json({ error: 'Invalid scheduled_at date format' });
      }
      if (scheduledDate <= new Date()) {
        return res.status(400).json({ error: 'Scheduled date must be in the future' });
      }

      updates.push(`scheduled_at = $${paramIndex}`);
      values.push(scheduledDate);
      paramIndex++;

      // If setting scheduled_at, ensure status is 'scheduled'
      if (post.status !== 'posted') {
        updates.push(`status = $${paramIndex}`);
        values.push('scheduled');
        paramIndex++;
      }
    }

    // Handle repeat settings update
    if (repeat !== undefined) {
      if (repeat === null || repeat === false) {
        // Disable repeat
        updates.push(`repeat_enabled = $${paramIndex}`);
        values.push(false);
        paramIndex++;
        updates.push(`repeat_frequency = $${paramIndex}`);
        values.push(null);
        paramIndex++;
        updates.push(`repeat_until = $${paramIndex}`);
        values.push(null);
        paramIndex++;
        updates.push(`repeat_count = $${paramIndex}`);
        values.push(null);
        paramIndex++;
      } else if (typeof repeat === 'object') {
        // Update repeat settings
        updates.push(`repeat_enabled = $${paramIndex}`);
        values.push(true);
        paramIndex++;

        if (repeat.frequency) {
          if (!['daily', 'weekly', 'monthly'].includes(repeat.frequency)) {
            return res.status(400).json({ error: 'Invalid repeat frequency. Must be: daily, weekly, or monthly' });
          }
          updates.push(`repeat_frequency = $${paramIndex}`);
          values.push(repeat.frequency);
          paramIndex++;
        }

        if (repeat.until !== undefined) {
          updates.push(`repeat_until = $${paramIndex}`);
          values.push(repeat.until ? new Date(repeat.until) : null);
          paramIndex++;
        }

        if (repeat.count !== undefined) {
          updates.push(`repeat_count = $${paramIndex}`);
          values.push(repeat.count ? parseInt(repeat.count) : null);
          paramIndex++;
        }
      }
    }

    if (updates.length === 0) {
      return res.status(400).json({ error: 'No valid fields to update' });
    }

    // Add updated_at
    updates.push(`updated_at = NOW()`);

    // Add WHERE clause params
    values.push(id);

    const updateQuery = `
      UPDATE posts 
      SET ${updates.join(', ')}
      WHERE id = $${paramIndex}
      RETURNING *
    `;

    const result = await pool.query(updateQuery, values);

    res.json({
      success: true,
      post: result.rows[0],
      message: 'Post updated successfully'
    });
  } catch (error) {
    console.error('Error updating post:', error);
    res.status(500).json({ error: 'Failed to update post' });
  }
});


module.exports = router;
