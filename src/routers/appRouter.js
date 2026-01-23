const express = require('express');
const router = express.Router();

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
  // Authentication state is now determined client-side via localStorage
  // We always render the page and let JavaScript handle showing the form or connect button
  res.render('index', { 
    message: req.query.message || null,
    token: req.query.token || null // Pass token to client if present in URL
  });
});

module.exports = router;
