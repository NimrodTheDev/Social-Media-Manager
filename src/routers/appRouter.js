const express = require('express');
const path = require('path');
const router = express.Router();

// GET / → serve Vue app (public/index.html) or redirect OAuth callback
router.get('*', (req, res, next) => {
  if (req.path.startsWith('/api') || req.path.includes('.')) {
    return next();
  }
  // MUST point to the built dist/index.html so Vue Router can mount correctly on direct URL visits
  res.sendFile(path.join(__dirname, "../../mediaflow/dist/index.html"));
});

module.exports = router;
