const cron = require('node-cron');
const pool = require('../db/config');
const { postToPlatform } = require('../services/postService');

// Configuration
const SCHEDULER_ENABLED = process.env.SCHEDULER_ENABLED !== 'false'; // Default: true
const CRON_EXPRESSION = process.env.SCHEDULER_INTERVAL || '*/1 * * * *'; // Every minute
const BATCH_SIZE = 10; // Process max 10 posts per cycle

let schedulerTask = null;

/**
 * Process scheduled posts that are ready to be published
 */
async function processScheduledPosts() {
  if (!SCHEDULER_ENABLED) {
    return;
  }

  try {
    // Query for posts ready to be published
    const result = await pool.query(
      `SELECT 
        p.id,
        p.content,
        p.mode,
        p.thread,
        p.reply_to_id,
        p.quote_tweet_id,
        p.media,
        p.scheduled_at,
        p.repeat_enabled,
        p.repeat_frequency,
        p.repeat_until,
        p.repeat_count,
        p.repeat_parent_id,
        p.repeat_occurrence,
        p.account_id,
        sa.platform,
        sa.access_token,
        sa.is_active
      FROM posts p
      JOIN social_accounts sa ON p.account_id = sa.id
      WHERE p.status = 'scheduled'
        AND p.scheduled_at <= NOW()
        AND sa.is_active = true
      ORDER BY p.scheduled_at ASC
      LIMIT $1`,
      [BATCH_SIZE]
    );

    const posts = result.rows;

    if (posts.length === 0) {
      // No posts to process - silent (don't log every minute)
      return;
    }

    console.log(`[Scheduler] Found ${posts.length} post(s) ready to publish`);

    // Process each post
    for (const post of posts) {
      await processPost(post);
    }

    console.log(`[Scheduler] Completed cycle. Processed ${posts.length} post(s)`);
  } catch (error) {
    console.error('[Scheduler] Error processing scheduled posts:', error);
  }
}

/**
 * Process a single post
 * @param {Object} post - Post object from database
 */
async function processPost(post) {
  const postId = post.id;
  const accessToken = post.access_token;
  const platform = post.platform;

  try {
    // Validate platform (currently only X is supported)
    if (platform !== 'x') {
      console.warn(`[Scheduler] Post #${postId}: Platform '${platform}' not yet supported, skipping`);
      await markPostAsFailed(postId, `Platform '${platform}' not yet supported`);
      return;
    }

    // Validate access token
    if (!accessToken) {
      console.error(`[Scheduler] Post #${postId}: No access token found`);
      await markPostAsFailed(postId, 'No access token found');
      return;
    }

    console.log(`[Scheduler] Posting post #${postId}...`);

    // Post to platform
    const result = await postToPlatform(post, accessToken);

    if (result.success) {
      // Success - update post status
      const postedAt = new Date();
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
        [postedAt, result.tweetId, threadIds, postId]
      );

      console.log(`[Scheduler] ✓ Posted post #${postId} successfully (Tweet ID: ${result.tweetId})`);

      // Handle recurring posts - create next occurrence
      if (post.repeat_enabled && post.repeat_frequency) {
        await createNextRecurringPost(post);
      }
    } else {
      // Failure - mark as failed
      await markPostAsFailed(postId, result.error);
      console.error(`[Scheduler] ✗ Failed to post #${postId}: ${result.error}`);
    }
  } catch (error) {
    // Unexpected error
    const errorMessage = error.response?.data?.detail || error.message || 'Unknown error';
    await markPostAsFailed(postId, errorMessage);
    console.error(`[Scheduler] ✗ Error posting #${postId}:`, errorMessage);
  }
}

/**
 * Create the next occurrence of a recurring post
 * @param {Object} post - The post that was just published
 */
async function createNextRecurringPost(post) {
  try {
    // Check if we should stop repeating
    const now = new Date();
    
    // Check repeat_until (end date)
    if (post.repeat_until && new Date(post.repeat_until) < now) {
      console.log(`[Scheduler] Post #${post.id}: Recurring post reached end date, stopping`);
      return;
    }
    
    // Check repeat_count (max occurrences)
    if (post.repeat_count && post.repeat_occurrence >= post.repeat_count) {
      console.log(`[Scheduler] Post #${post.id}: Recurring post reached max count (${post.repeat_count}), stopping`);
      return;
    }

    // Calculate next scheduled time based on frequency
    const currentScheduled = new Date(post.scheduled_at || now);
    let nextScheduled = new Date(currentScheduled);

    switch (post.repeat_frequency) {
      case 'daily':
        nextScheduled.setDate(nextScheduled.getDate() + 1);
        break;
      case 'weekly':
        nextScheduled.setDate(nextScheduled.getDate() + 7);
        break;
      case 'monthly':
        nextScheduled.setMonth(nextScheduled.getMonth() + 1);
        break;
      default:
        console.warn(`[Scheduler] Unknown repeat frequency: ${post.repeat_frequency}`);
        return;
    }

    // Check if next occurrence exceeds repeat_until
    if (post.repeat_until && nextScheduled > new Date(post.repeat_until)) {
      console.log(`[Scheduler] Post #${post.id}: Next occurrence would exceed end date, stopping`);
      return;
    }

    // Determine parent post ID (original recurring post)
    const parentId = post.repeat_parent_id || post.id;
    const nextOccurrence = (post.repeat_occurrence || 1) + 1;

    // Create new scheduled post for next occurrence
    await pool.query(
      `INSERT INTO posts 
       (account_id, content, mode, thread, reply_to_id, quote_tweet_id, media, 
        status, scheduled_at, 
        repeat_enabled, repeat_frequency, repeat_until, repeat_count, 
        repeat_parent_id, repeat_occurrence)
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, $15)`,
      [
        post.account_id,
        post.content,
        post.mode,
        post.thread,
        post.reply_to_id,
        post.quote_tweet_id,
        post.media,
        'scheduled',
        nextScheduled,
        true, // repeat_enabled
        post.repeat_frequency,
        post.repeat_until,
        post.repeat_count,
        parentId, // Link to original post
        nextOccurrence
      ]
    );

    console.log(`[Scheduler] ✓ Created next occurrence (#${nextOccurrence}) for recurring post #${post.id} (scheduled: ${nextScheduled.toISOString()})`);
  } catch (error) {
    console.error(`[Scheduler] Error creating next recurring post for #${post.id}:`, error);
  }
}

/**
 * Mark a post as failed in the database
 * @param {number} postId - Post ID
 * @param {string} errorMessage - Error message
 */
async function markPostAsFailed(postId, errorMessage) {
  try {
    await pool.query(
      `UPDATE posts 
       SET status = 'failed',
           error_message = $1,
           updated_at = NOW()
       WHERE id = $2`,
      [errorMessage, postId]
    );
  } catch (dbError) {
    console.error(`[Scheduler] Error updating failed post #${postId}:`, dbError);
  }
}

/**
 * Start the scheduler
 */
function startScheduler() {
  if (!SCHEDULER_ENABLED) {
    console.log('[Scheduler] Scheduler is disabled (SCHEDULER_ENABLED=false)');
    return;
  }

  if (schedulerTask) {
    console.log('[Scheduler] Scheduler is already running');
    return;
  }

  console.log(`[Scheduler] Starting scheduler (interval: ${CRON_EXPRESSION})`);
  
  // Run immediately on startup to catch any missed posts
  processScheduledPosts();

  // Schedule recurring job
  schedulerTask = cron.schedule(CRON_EXPRESSION, () => {
    processScheduledPosts();
  }, {
    scheduled: true,
    timezone: 'UTC'
  });

  console.log('[Scheduler] Scheduler started successfully');
}

/**
 * Stop the scheduler
 */
function stopScheduler() {
  if (schedulerTask) {
    schedulerTask.stop();
    schedulerTask = null;
    console.log('[Scheduler] Scheduler stopped');
  }
}

module.exports = {
  startScheduler,
  stopScheduler,
  processScheduledPosts // Exported for testing
};
