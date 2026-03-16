const { makeResponse } = require("../utils/responder");
const pool = require('../db/config');
const jwt = require('jsonwebtoken');
const { default: axios } = require("axios");

const X_TOKEN_URL = 'https://api.twitter.com/2/oauth2/token';

const { X_CLIENT_ID, X_REDIRECT_URI, X_CLIENT_SECRET } = process.env;


const X_AUTH_URL = 'https://twitter.com/i/oauth2/authorize';

const Social = {
    connectX: async (req, res) => {
        try {
            const token = req.query.token;


            if (!token) {
                return res.status(400).json(makeResponse(false, 'Token not provided.'));
            }
            if (!X_CLIENT_ID || !X_REDIRECT_URI) {
                return res.status(400).json(makeResponse(false, 'X API credentials not configured. Set X_CLIENT_ID and X_REDIRECT_URI.'));
            }

            const decoded = jwt.verify(token, process.env.JWT_SECRET);

            // Generate a random state parameter for CSRF protection (simplified for MVP)
            const state = jwt.sign({ userId: decoded.id }, process.env.JWT_SECRET, { expiresIn: '15m' });

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
        } catch (error) {
            console.error('Error connecting to X:', error);
            return res.status(500).json(makeResponse(false, 'Internal server error'));
        }
    },
    callbackX: async (req, res) => {
        const { code, state, error } = req.query;

        if (error) {
            return res.redirect(`/app/dashboard`);
        }

        if (!code) {
            return res.redirect(`/app/dashboard`);
        }

        if (!X_CLIENT_ID || !X_CLIENT_SECRET || !X_REDIRECT_URI) {
            return res.redirect(`/app/dashboard`);
        }

        const { getXUserInfo } = require('../utils/xApi');

        try {
            // Verify the state token so we confidently know which logged-in user this is!
            const decodedState = jwt.verify(state, process.env.JWT_SECRET);
            const userId = decodedState.userId;

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
                'SELECT id FROM social_accounts WHERE platform = $1 AND platform_user_id = $2',
                ['x', xUser.id]
            );


            if (existingAccount.rows.length > 0) {
                // Account exists - update tokens safely linked to THIS user
                await pool.query(
                    `UPDATE social_accounts 
             SET access_token = $1, 
                 refresh_token = $2,
                 token_expires_at = $3,
                 platform_username = $4,
                 user_id = $5,
                 is_active = true,
                 updated_at = NOW()
             WHERE platform = $6 AND platform_user_id = $7`,
                    [accessToken, refreshToken, expiresAt, xUser.username, userId, 'x', xUser.id]
                );
            } else {
                // New account - link the new social account to the currently logged in user
                await pool.query(
                    `INSERT INTO social_accounts 
             (user_id, platform, access_token, refresh_token, token_expires_at, platform_user_id, platform_username)
             VALUES ($1, $2, $3, $4, $5, $6, $7)`,
                    [userId, 'x', accessToken, refreshToken, expiresAt, xUser.id, xUser.username]
                );
            }

            // Redirect to homepage with token
            res.redirect(`/app/dashboard`);
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

            res.status(500).json(makeResponse(false, errorMessage));
        }
    },
    connectedAccounts: async (req, res) => {
        try {
            const userId = req.user.id;

            if (!userId) {
                return res.status(400).json(makeResponse(false, 'User not found.'));
            }

            const accounts = await pool.query(
                'SELECT id, platform, platform_user_id, platform_username, is_active, created_at, updated_at FROM social_accounts WHERE user_id = $1',
                [userId]
            );

            res.status(200).json(makeResponse(true, 'Connected accounts fetched successfully', accounts.rows));
        } catch (error) {
            console.error('Error fetching connected accounts:', error);
            res.status(500).json(makeResponse(false, 'Internal server error'));
        }
    }
}

module.exports = Social;