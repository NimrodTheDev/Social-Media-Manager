const express = require('express');
const router = express.Router();
const { isAuthenticated } = require('../utils/tokenStorage');

// GET / → render homepage with connect button or tweet form
// Also handles OAuth callback if code parameter is present
router.get('/', async (req, res) => {
  // Check if this is an OAuth callback (has code parameter)
  if (req.query.code) {
    // Redirect to the callback handler to process OAuth
    // Preserve all query parameters (code, state, error, etc.)
    const queryString = new URLSearchParams(req.query).toString();
    return res.redirect(`/auth/callback?${queryString}`);
  }

  // Normal homepage rendering
  if (isAuthenticated()) {
    // User is authenticated - show tweet form
    res.render('index', { 
      authenticated: true,
      message: req.query.message || null 
    });
  } else {
    // User not authenticated - show connect button
    res.render('index', { 
      authenticated: false, 
      message: req.query.message || null
    });
  }
});

module.exports = router;
