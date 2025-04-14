
#!/bin/bash

# Exit on error
set -e

echo "ProxyGuard Frontend Fix Script"
echo "============================="
echo "This script will fix missing start-frontend.js issues"

# Create the start-frontend.js file
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

// For any route, serve the index.html file and let client-side React Router handle routing
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

# Make the file executable
chmod +x /opt/proxyguard/start-frontend.js
echo "File created and made executable."

# Restart the service
echo "Restarting the frontend service..."
systemctl restart proxyguard-frontend.service || echo "Warning: Failed to restart frontend service. You may need to restart it manually."

echo "Done! The ProxyGuard frontend service should now be running."
echo "You can check its status with: systemctl status proxyguard-frontend.service"
