const pool = require('../db/config');

/**
 * Get user information from an access token
 * Looks up the token in social_accounts table and returns the associated user
 * Currently supports X platform, but designed to be platform-agnostic
 * 
 * @param {string} accessToken - OAuth 2.0 access token
 * @param {string} platform - Platform name (default: 'x')
 * @returns {Promise<Object|null>} User object with account info, or null if not found
 */
async function getUserFromToken(accessToken, platform = 'x') {
  try {
    const result = await pool.query(
      `SELECT 
        u.id as user_id,
        u.name as user_name,
        u.email,
        u.created_at as user_created_at,
        sa.id as account_id,
        sa.platform,
        sa.platform_user_id,
        sa.platform_username,
        sa.is_active as account_is_active
      FROM users u
      JOIN social_accounts sa ON u.id = sa.user_id
      WHERE sa.access_token = $1 
        AND sa.platform = $2 
        AND sa.is_active = true`,
      [accessToken, platform]
    );

    if (result.rows[0]) {
      // For backward compatibility, map to old field names
      const row = result.rows[0];
      return {
        ...row,
        x_account_id: row.account_id, // Backward compat
        x_user_id: row.platform_user_id, // Backward compat
        x_username: row.platform_username // Backward compat
      };
    }

    return null;
  } catch (error) {
    console.error('Error getting user from token:', error);
    return null;
  }
}

/**
 * Get social account information from an access token
 * 
 * @param {string} accessToken - OAuth 2.0 access token
 * @param {string} platform - Platform name (default: 'x')
 * @returns {Promise<Object|null>} Social account object, or null if not found
 */
async function getAccountFromToken(accessToken, platform = 'x') {
  try {
    const result = await pool.query(
      `SELECT * FROM social_accounts 
       WHERE access_token = $1 
         AND platform = $2 
         AND is_active = true`,
      [accessToken, platform]
    );

    return result.rows[0] || null;
  } catch (error) {
    console.error('Error getting account from token:', error);
    return null;
  }
}

/**
 * Get X account information from an access token (backward compatibility)
 * 
 * @param {string} accessToken - OAuth 2.0 access token
 * @returns {Promise<Object|null>} X account object, or null if not found
 */
async function getXAccountFromToken(accessToken) {
  return getAccountFromToken(accessToken, 'x');
}

module.exports = {
  getUserFromToken,
  getAccountFromToken,
  getXAccountFromToken // Backward compatibility
};
