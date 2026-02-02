require('dotenv').config();
const express = require('express');
const appRouter = require('./routers/appRouter');
const apiRouter = require('./routers/apiRouter');
const { startScheduler, stopScheduler } = require('./schedulers/postScheduler');

const app = express();
const PORT = process.env.PORT || 3100;

// Set EJS as the view engine
app.set('view engine', 'ejs');
app.set('views', './src/views');

// Middleware for parsing form data
app.use(express.urlencoded({ extended: true }));
app.use(express.json());

// Serve static files (if needed)
app.use(express.static('public'));

// Mount routers
app.use('/', appRouter);
app.use('/', apiRouter);

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
