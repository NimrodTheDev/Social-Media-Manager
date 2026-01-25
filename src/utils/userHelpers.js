const pool = require('../db/config');

/**
 * Get user information from an access token
 * Looks up the token in x_accounts table and returns the associated user
 * 
 * @param {string} accessToken - OAuth 2.0 access token
 * @returns {Promise<Object|null>} User object with account info, or null if not found
 */
async function getUserFromToken(accessToken) {
  try {
    const result = await pool.query(
      `SELECT 
        u.id as user_id,
        u.name as user_name,
        u.email,
        u.created_at as user_created_at,
        xa.id as x_account_id,
        xa.x_user_id,
        xa.x_username,
        xa.is_active as account_is_active
      FROM users u
      JOIN x_accounts xa ON u.id = xa.user_id
      WHERE xa.access_token = $1 AND xa.is_active = true`,
      [accessToken]
    );

    return result.rows[0] || null;
  } catch (error) {
    console.error('Error getting user from token:', error);
    return null;
  }
}

/**
 * Get X account information from an access token
 * 
 * @param {string} accessToken - OAuth 2.0 access token
 * @returns {Promise<Object|null>} X account object, or null if not found
 */
async function getXAccountFromToken(accessToken) {
  try {
    const result = await pool.query(
      `SELECT * FROM x_accounts 
       WHERE access_token = $1 AND is_active = true`,
      [accessToken]
    );

    return result.rows[0] || null;
  } catch (error) {
    console.error('Error getting X account from token:', error);
    return null;
  }
}

module.exports = {
  getUserFromToken,
  getXAccountFromToken
};
