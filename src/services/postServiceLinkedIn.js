const axios = require('axios');

// X API Configuration
const LINKEDIN_API_BASE = 'https://api.linkedin.com/v2';

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

//LinkedIn

/**
 * Post a single tweet to LinkedIn API
 * @param {string} text - Tweet text
 * @param {string} accessToken - OAuth access token
 * @param {Array} media - Optional media array
 * @returns {Promise<Object>} { success: boolean, tweetId: string, error: string }
 */
async function postSingleLinkedInPost(text, accessToken, media = null) {

    try {
        const author = await axios.get("https://api.linkedin.com/v2/me", {
            headers: {
                Authorization: `Bearer ${accessToken}`,
                "Content-Type": "application/json",
                "X-Restli-Protocol-Version": "2.0.0"
            }
        });

        const authorUrn = `urn:li:person:${author.data.id}`;

        const mediaData = safeParseJSON(media);
        const linkedInResponse = await axios.post(
            `${LINKEDIN_API_BASE}/ugcPosts`,
            {
                author: authorUrn, // e.g. "urn:li:person:xxxx"
                lifecycleState: "PUBLISHED",
                specificContent: {
                    "com.linkedin.ugc.ShareContent": {
                        shareCommentary: {
                            text: text
                        },
                        shareMediaCategory: "NONE"
                    }
                },
                visibility: {
                    "com.linkedin.ugc.MemberNetworkVisibility": "PUBLIC"
                }
            },
            {
                headers: {
                    Authorization: `Bearer ${accessToken}`,
                    "Content-Type": "application/json",
                    "X-Restli-Protocol-Version": "2.0.0"
                }
            }
        );
        return {
            success: true,
            linkedInResponse: linkedInResponse.data.data.id,
            linkedInPostId: null
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
 * @param {string} platform - Platform name
 * @param {Array<{text: string, media: Array<{media_id: string}>}>} content - Post object from database
 * @param {string} accessToken - OAuth access token
 * @returns {Promise<Object>} { success: boolean, tweetId: string, threadIds: Array|null, error: string }
 */

module.exports = {
    postSingleLinkedInPost,
};
