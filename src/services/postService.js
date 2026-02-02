const axios = require('axios');

// X API Configuration
const X_API_BASE = 'https://api.twitter.com/2';

/**
 * Helper function to safely parse JSON (handles already-parsed JSONB)
 */
function safeParseJSON(value) {
  if (!value) return null;
  if (typeof value === 'string') {
    try {
      return JSON.parse(value);
    } catch (e) {
      return value; // Return as-is if parsing fails
    }
  }
  return value; // Already parsed (JSONB from PostgreSQL)
}

/**
 * Post a single tweet to X API
 * @param {string} text - Tweet text
 * @param {string} accessToken - OAuth access token
 * @param {Array} media - Optional media array
 * @returns {Promise<Object>} { success: boolean, tweetId: string, error: string }
 */
async function postSingleTweet(text, accessToken, media = null) {
  try {
    const mediaData = safeParseJSON(media);
    const tweetResponse = await axios.post(
      `${X_API_BASE}/tweets`,
      {
        text: text,
        ...(mediaData && { media: { media_ids: mediaData.map(m => m.media_id) } })
      },
      {
        headers: {
          'Authorization': `Bearer ${accessToken}`,
          'Content-Type': 'application/json'
        }
      }
    );
    return {
      success: true,
      tweetId: tweetResponse.data.data.id,
      threadIds: null
    };
  } catch (error) {
    return {
      success: false,
      error: error.response?.data?.detail || error.message
    };
  }
}

/**
 * Post a thread to X API
 * @param {Array} thread - Array of tweet texts
 * @param {string} accessToken - OAuth access token
 * @param {Array} media - Optional media array (attached to first tweet)
 * @returns {Promise<Object>} { success: boolean, tweetId: string, threadIds: Array, error: string }
 */
async function postThread(thread, accessToken, media = null) {
  try {
    const threadArray = safeParseJSON(thread);
    if (!Array.isArray(threadArray) || threadArray.length < 2) {
      return {
        success: false,
        error: 'Thread must have at least 2 tweets'
      };
    }

    const mediaData = safeParseJSON(media);
    const tweetIds = [];
    
    // Post first tweet
    const firstTweetResponse = await axios.post(
      `${X_API_BASE}/tweets`,
      {
        text: threadArray[0],
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
    for (let i = 1; i < threadArray.length; i++) {
      const replyResponse = await axios.post(
        `${X_API_BASE}/tweets`,
        {
          text: threadArray[i],
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
    
    return {
      success: true,
      tweetId: tweetIds[0], // First tweet ID
      threadIds: tweetIds
    };
  } catch (error) {
    return {
      success: false,
      error: error.response?.data?.detail || error.message
    };
  }
}

/**
 * Post a reply tweet to X API
 * @param {string} text - Reply text
 * @param {string} replyToId - Tweet ID being replied to
 * @param {string} accessToken - OAuth access token
 * @param {Array} media - Optional media array
 * @returns {Promise<Object>} { success: boolean, tweetId: string, error: string }
 */
async function postReply(text, replyToId, accessToken, media = null) {
  try {
    const mediaData = safeParseJSON(media);
    const replyResponse = await axios.post(
      `${X_API_BASE}/tweets`,
      {
        text: text,
        reply: { in_reply_to_tweet_id: replyToId },
        ...(mediaData && { media: { media_ids: mediaData.map(m => m.media_id) } })
      },
      {
        headers: {
          'Authorization': `Bearer ${accessToken}`,
          'Content-Type': 'application/json'
        }
      }
    );
    return {
      success: true,
      tweetId: replyResponse.data.data.id,
      threadIds: null
    };
  } catch (error) {
    return {
      success: false,
      error: error.response?.data?.detail || error.message
    };
  }
}

/**
 * Post a quote tweet to X API
 * @param {string} text - Quote text
 * @param {string} quoteTweetId - Tweet ID being quoted
 * @param {string} accessToken - OAuth access token
 * @param {Array} media - Optional media array
 * @returns {Promise<Object>} { success: boolean, tweetId: string, error: string }
 */
async function postQuote(text, quoteTweetId, accessToken, media = null) {
  try {
    const mediaData = safeParseJSON(media);
    const quoteResponse = await axios.post(
      `${X_API_BASE}/tweets`,
      {
        text: text,
        quote_tweet_id: quoteTweetId,
        ...(mediaData && { media: { media_ids: mediaData.map(m => m.media_id) } })
      },
      {
        headers: {
          'Authorization': `Bearer ${accessToken}`,
          'Content-Type': 'application/json'
        }
      }
    );
    return {
      success: true,
      tweetId: quoteResponse.data.data.id,
      threadIds: null
    };
  } catch (error) {
    return {
      success: false,
      error: error.response?.data?.detail || error.message
    };
  }
}

/**
 * Post a post to X API based on its mode
 * @param {Object} post - Post object from database
 * @param {string} accessToken - OAuth access token
 * @returns {Promise<Object>} { success: boolean, tweetId: string, threadIds: Array|null, error: string }
 */
async function postToPlatform(post, accessToken) {
  const mode = post.mode || 'single';

  switch (mode) {
    case 'single':
      return await postSingleTweet(post.content, accessToken, post.media);
    
    case 'thread':
      return await postThread(post.thread, accessToken, post.media);
    
    case 'reply':
      if (!post.reply_to_id) {
        return {
          success: false,
          error: 'reply_to_id is required for reply mode'
        };
      }
      return await postReply(post.content, post.reply_to_id, accessToken, post.media);
    
    case 'quote':
      if (!post.quote_tweet_id) {
        return {
          success: false,
          error: 'quote_tweet_id is required for quote mode'
        };
      }
      return await postQuote(post.content, post.quote_tweet_id, accessToken, post.media);
    
    default:
      return {
        success: false,
        error: `Unknown post mode: ${mode}`
      };
  }
}

module.exports = {
  postToPlatform,
  postSingleTweet,
  postThread,
  postReply,
  postQuote
};
