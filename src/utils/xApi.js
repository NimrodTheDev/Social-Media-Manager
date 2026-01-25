const axios = require('axios');

const X_API_BASE = 'https://api.twitter.com/2';

/**
 * Get the authenticated user's information from X API
 * @param {string} accessToken - OAuth 2.0 access token
 * @returns {Promise<Object>} User information (id, username, name, etc.)
 */
async function getXUserInfo(accessToken) {
  try {
    const response = await axios.get(
      `${X_API_BASE}/users/me`,
      {
        headers: {
          'Authorization': `Bearer ${accessToken}`,
        },
        params: {
          'user.fields': 'id,username,name,created_at'
        }
      }
    );

    return response.data.data;
  } catch (error) {
    console.error('Error fetching X user info:', error.response?.data || error.message);
    throw error;
  }
}

module.exports = { getXUserInfo };
