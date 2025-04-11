
#!/usr/bin/env node

/**
 * ProxyGuard Static Frontend Server
 * 
 * A simplified static file server for the frontend application
 * that avoids React Router complexities during server-side execution
 */

import express from 'express';
import path from 'path';
import fs from 'fs';
import { fileURLToPath } from 'url';

// Get current directory path (ES module equivalent of __dirname)
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Configuration
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

// Logging middleware
app.use((req, res, next) => {
  console.log(`${new Date().toISOString()} - ${req.method} ${req.url}`);
  next();
});

// Serve static files from the React app build directory
app.use(express.static(STATIC_FILES_PATH));

// Return index.html for all routes to support client-side routing
app.get('*', (req, res) => {
  console.log(`Serving index.html for path: ${req.url}`);
  res.sendFile(path.join(STATIC_FILES_PATH, 'index.html'));
});

// Start the server
app.listen(PORT, '0.0.0.0', () => {
  console.log(`ProxyGuard static file server running on port ${PORT} (all interfaces)`);
  console.log(`Serving files from: ${STATIC_FILES_PATH}`);
});
