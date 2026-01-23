const express = require('express');
const router = express.Router();
const { isAuthenticated } = require('../utils/tokenStorage');

// GET / → render homepage with connect button or tweet form
router.get('/', (req, res) => {
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
      message: "User not authenticated" 
    });
  }
});

module.exports = router;
