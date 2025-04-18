
#!/bin/bash

# Exit on error
set -e

echo "Making ProxyGuard Frontend Executable"
echo "===================================="

# Create the start-frontend.js file if it doesn't exist
if [ ! -f "/opt/proxyguard/start-frontend.js" ]; then
  echo "Creating start-frontend.js file..."
  cat > /opt/proxyguard/start-frontend.js << 'EOL'
#!/usr/bin/env node

/**
 * ProxyGuard Static Frontend Server
 * 
 * A simplified static file server that serves only the built frontend files
 * without any routing complexity or React Router dependencies
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

// Basic logging middleware
app.use((req, res, next) => {
  console.log(`${new Date().toISOString()} - ${req.method} ${req.path}`);
  next();
});

// Serve static files from the build directory
app.use(express.static(STATIC_FILES_PATH));

// For any route, serve the index.html file (no client-side routing needed)
app.get('*', (req, res) => {
  res.sendFile(path.join(STATIC_FILES_PATH, 'index.html'));
});

// Start the server
app.listen(PORT, '0.0.0.0', () => {
  console.log(`ProxyGuard static file server running on port ${PORT}`);
  console.log(`Serving files from: ${STATIC_FILES_PATH}`);
  console.log(`Frontend UI available at: http://[server-ip]:${PORT}`);
});
EOL
fi

# Make the file executable
chmod +x /opt/proxyguard/start-frontend.js
echo "start-frontend.js has been made executable."

# Create a simple test file to verify the environment
echo "Done! The frontend script is now executable."
