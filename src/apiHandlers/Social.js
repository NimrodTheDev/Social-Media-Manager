const { makeResponse } = require("../utils/responder");
const pool = require('../db/config');
const jwt = require('jsonwebtoken');
const { default: axios } = require("axios");

const X_TOKEN_URL = 'https://api.twitter.com/2/oauth2/token';

const { X_CLIENT_ID, X_REDIRECT_URI, X_CLIENT_SECRET } = process.env;
const LINKEDIN_CLIENT_ID = process.env.LINKEDIN_CLIENT_ID;
const LINKEDIN_CLIENT_SECRET = process.env.LINKEDIN_CLIENT_SECRET;
const LINKEDIN_REDIRECT_URI = process.env.LINKEDIN_REDIRECT_URI;

const LINKEDIN_AUTH_URL = "https://www.linkedin.com/oauth/v2/authorization";
const LINKEDIN_TOKEN_URL = "https://www.linkedin.com/oauth/v2/accessToken";

const X_AUTH_URL = 'https://twitter.com/i/oauth2/authorize';

const SUPPORTED_PLATFORMS = [
    {
        id: 'x',
        name: '𝕏 (Twitter)',
        color: '#e7e9ea',
        icon: '𝕏',
        enabled: true,
        description: 'Connect your 𝕏 account to post tweets and threads.'
    },
    {
        id: 'linkedin',
        name: 'LinkedIn',
        color: '#0a66c2',
        icon: 'in',
        enabled: true,
        description: 'Connect your LinkedIn profile to share professional updates.'
    },
    {
        id: 'instagram',
        name: 'Instagram',
        color: '#e1306c',
        icon: '📸',
        enabled: false,
        description: 'Instagram posting coming soon!'
    },
    {
        id: 'facebook',
        name: 'Facebook',
        color: '#1877f2',
        icon: 'f',
        enabled: false,
        description: 'Facebook posting coming soon!'
    }
];

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
                'SELECT id, platform, platform_user_id, platform_username, is_active, created_at, updated_at, token_expires_at, access_token  FROM social_accounts WHERE user_id = $1',
                [userId]
            );

            res.status(200).json(makeResponse(true, 'Connected accounts fetched successfully', accounts.rows));
        } catch (error) {
            console.error('Error fetching connected accounts:', error);
            res.status(500).json(makeResponse(false, 'Internal server error'));
        }
    },
    connectLinkedIn: async (req, res) => {
        try {
            const token = req.query.token;

            if (!token) {
                return res.status(400).json(makeResponse(false, 'Token not provided.'));
            }

            const decoded = jwt.verify(token, process.env.JWT_SECRET);

            const state = jwt.sign(
                { userId: decoded.id },
                process.env.JWT_SECRET,
                { expiresIn: '15m' }
            );

            const params = new URLSearchParams({
                response_type: 'code',
                client_id: LINKEDIN_CLIENT_ID,
                redirect_uri: LINKEDIN_REDIRECT_URI,
                scope: 'openid profile email w_member_social',
                state
            });

            const authUrl = `${LINKEDIN_AUTH_URL}?${params.toString()}`;

            res.redirect(authUrl);
        } catch (err) {
            console.error(err);
            res.status(500).json(makeResponse(false, 'Internal server error'));
        }
    },
    callbackLinkedIn: async (req, res) => {
        const { code, state, error } = req.query;

        if (error || !code) {
            return res.redirect('/app/dashboard');
        }

        try {
            const decodedState = jwt.verify(state, process.env.JWT_SECRET);
            const userId = decodedState.userId;

            // Exchange code for token
            const tokenResponse = await axios.post(
                LINKEDIN_TOKEN_URL,
                new URLSearchParams({
                    grant_type: 'authorization_code',
                    code,
                    redirect_uri: LINKEDIN_REDIRECT_URI,
                    client_id: LINKEDIN_CLIENT_ID,
                    client_secret: LINKEDIN_CLIENT_SECRET
                }),
                {
                    headers: { 'Content-Type': 'application/x-www-form-urlencoded' }
                }
            );

            const accessToken = tokenResponse.data.access_token;
            const expiresIn = tokenResponse.data.expires_in;
            const expiresAt = new Date(Date.now() + expiresIn * 1000);

            // Get LinkedIn profile
            const profileRes = await axios.get(
                'https://api.linkedin.com/v2/userinfo',
                {
                    headers: {
                        Authorization: `Bearer ${accessToken}`
                    }
                }
            );

            const linkedinUser = profileRes.data;

            const platformUserId = linkedinUser.sub; // LinkedIn user ID
            const username = linkedinUser.name;

            // Check existing
            const existing = await pool.query(
                'SELECT id FROM social_accounts WHERE platform = $1 AND platform_user_id = $2',
                ['linkedin', platformUserId]
            );

            if (existing.rows.length > 0) {
                await pool.query(
                    `UPDATE social_accounts
                 SET access_token=$1,
                     token_expires_at=$2,
                     platform_username=$3,
                     user_id=$4,
                     is_active=true,
                     updated_at=NOW()
                 WHERE platform=$5 AND platform_user_id=$6`,
                    [accessToken, expiresAt, username, userId, 'linkedin', platformUserId]
                );
            } else {
                await pool.query(
                    `INSERT INTO social_accounts
                 (user_id, platform, access_token, token_expires_at, platform_user_id, platform_username)
                 VALUES ($1,$2,$3,$4,$5,$6)`,
                    [userId, 'linkedin', accessToken, expiresAt, platformUserId, username]
                );
            }

            res.redirect('/app/dashboard');
        } catch (err) {
            console.error(err.response?.data || err.message);
            res.redirect('/app/dashboard');
        }
    },
    disconnectSocial: async (req, res) => {
        try {
            const userId = req.user.id;
            const { id } = req.params;

            if (!userId) {
                return res.status(400).json(makeResponse(false, 'User not found.'));
            }

            const account = await pool.query(
                'SELECT id FROM social_accounts WHERE user_id = $1 AND id = $2',
                [userId, id]
            );

            if (account.rows.length === 0) {
                return res.status(404).json(makeResponse(false, 'Account not found.'));
            }

            await pool.query(
                'DELETE FROM social_accounts WHERE id = $1',
                [id]
            );

            res.status(200).json(makeResponse(true, 'Account disconnected successfully'));
        } catch (error) {
            console.error('Error disconnecting account:', error);
            res.status(500).json(makeResponse(false, 'Internal server error'));
        }
    },
    getAllSocialAccounts: async (req, res) => {
        try {
            // This returns the list of platforms the APP supports/allows
            const userId = req.user.id;
            const accounts = await pool.query(
                'SELECT id, platform, platform_user_id, platform_username, is_active, created_at, updated_at, token_expires_at, access_token  FROM social_accounts WHERE user_id = $1',
                [userId]
            );
            const supportedPlatforms = SUPPORTED_PLATFORMS.map(platform => {
                const account = accounts.rows.find(account => account.platform === platform.id);
                return {
                    ...platform,
                    connected: !!account,
                    accountId: account ? account.id : null,
                    handle: account ? account.platform_username : null
                };
            });
            res.status(200).json(makeResponse(true, 'Supported platforms fetched successfully', supportedPlatforms));
        } catch (error) {
            console.error('Error fetching all social accounts:', error);
            res.status(500).json(makeResponse(false, 'Internal server error'));
        }
    }
}

module.exports = Social;