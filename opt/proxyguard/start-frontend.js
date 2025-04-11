
#!/usr/bin/env node

/**
 * ProxyGuard Frontend Server
 * 
 * This script starts a simple server to host the frontend application
 */

const express = require('express');
const path = require('path');
const fs = require('fs');

const PORT = process.env.PORT || 3000;
const STATIC_FILES_PATH = path.join(__dirname, 'dist');

// Check if the dist directory exists
if (!fs.existsSync(STATIC_FILES_PATH)) {
  console.error('Error: Frontend build directory (dist) not found!');
  console.error('Please run "npm run build" before starting the server');
  process.exit(1);
}

// Create Express app
const app = express();

// Serve static files from the React app
app.use(express.static(STATIC_FILES_PATH));

// All GET requests not handled before will return React app
app.get('*', (req, res) => {
  res.sendFile(path.resolve(STATIC_FILES_PATH, 'index.html'));
});

// Start server
app.listen(PORT, '0.0.0.0', () => {
  console.log(`ProxyGuard frontend server running on port ${PORT} (all interfaces)`);
});
