require('dotenv').config();
const express = require('express');
const path = require('path');
const { createProxyMiddleware } = require('http-proxy-middleware');
const appRouter = require('./routers/appRouter');
const apiRouter = require('./routers/apiRouter');
const { startScheduler, stopScheduler } = require('./schedulers/postScheduler');

const app = express();
const PORT = process.env.PORT || 3000;
const VITE_DEV_PORT = process.env.VITE_PORT || 3100;
const isDev = process.env.NODE_ENV !== 'production';

// Middleware for parsing form data
const cookieParser = require('cookie-parser');
app.use(cookieParser());
app.use(express.urlencoded({ extended: true }));
app.use(express.json());

// API and auth routes first (so /auth/*, /api/* are not proxied to Vite)
app.use('/api', apiRouter);

// OAuth callback: GET /?code=... must redirect before proxy/static
app.get('/', (req, res, next) => {
  if (req.query.code) {
    const queryString = new URLSearchParams(req.query).toString();
    return res.redirect(`/auth/callback?${queryString}`);
  }
  next();
});

// Development: Proxy to Vite dev server (hot reload)
if (isDev) {
  app.use('/', createProxyMiddleware({
    target: `http://localhost:${VITE_DEV_PORT}`,
    changeOrigin: true,
    ws: true, // WebSocket for HMR
    logLevel: 'silent',
  }));
} else {
  // Production: Serve built files from dist
  app.use("/assets", express.static(path.join(__dirname, '..', 'mediaflow', 'dist')));
  // SPA fallback: serve index.html for any other GET
  app.use('/', appRouter);
}

// Static files from public (fallback)
app.use(express.static('public'));

// Start server
const server = app.listen(PORT, () => {
  console.log(`Server running on http://localhost:${PORT}`);

  // Start the post scheduler
  startScheduler();
});

// Graceful shutdown
process.on('SIGTERM', () => {
  console.log('SIGTERM signal received: closing HTTP server and stopping scheduler');
  stopScheduler();
  server.close(() => {
    console.log('HTTP server closed');
    process.exit(0);
  });
});

process.on('SIGINT', () => {
  console.log('SIGINT signal received: closing HTTP server and stopping scheduler');
  stopScheduler();
  server.close(() => {
    console.log('HTTP server closed');
    process.exit(0);
  });
});
