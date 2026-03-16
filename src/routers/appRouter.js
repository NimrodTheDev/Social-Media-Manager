const express = require('express');
const path = require('path');
const router = express.Router();

// GET / → serve Vue app (public/index.html) or redirect OAuth callback
router.get('*', (req, res) => {
  if (req.query.code) {
    const queryString = new URLSearchParams(req.query).toString();
    return res.redirect(`/auth/callback?${queryString}`);
  }
  res.sendFile(path.join(__dirname, "../../mediaflow/index.html"));
});

module.exports = router;
