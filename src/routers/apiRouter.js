const express = require('express');
const axios = require('axios');
const router = express.Router();
const { setAccessToken, getAccessToken } = require('../utils/tokenStorage');

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

  try {
    // Exchange authorization code for access token
    // Note: X API v2 OAuth 2.0 requires Basic Auth with client_id:client_secret
    // When using Basic Auth, do NOT include client_id in the request body
    const credentials = Buffer.from(`${X_CLIENT_ID}:${X_CLIENT_SECRET}`).toString('base64');
    
    const tokenResponse = await axios.post(
      X_TOKEN_URL,
      new URLSearchParams({
        code: code,
        grant_type: 'authorization_code',
        redirect_uri: X_REDIRECT_URI,
        code_verifier: 'challenge' // Should match code_challenge from auth step
      }),
      {
        headers: {
          'Content-Type': 'application/x-www-form-urlencoded',
          'Authorization': `Basic ${credentials}`
        }
      }
    );

    // Store access token in memory
    setAccessToken(tokenResponse.data.access_token);

    // Redirect to homepage with success message
    res.redirect('/?message=Account connected successfully!');
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
  const { tweetText } = req.body;

  if (!tweetText || tweetText.trim().length === 0) {
    return res.render('error', { 
      message: 'Tweet text cannot be empty' 
    });
  }

  // Get access token from shared storage
  const token = getAccessToken();

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

  try {
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

    // Success - render success page
    res.render('success', { 
      tweetId: tweetResponse.data.data.id,
      tweetText: tweetText.trim()
    });
  } catch (error) {
    console.error('Tweet posting error:', error.response?.data || error.message);
    res.render('error', { 
      message: `Failed to post tweet: ${error.response?.data?.detail || error.message}` 
    });
  }
});

module.exports = router;
