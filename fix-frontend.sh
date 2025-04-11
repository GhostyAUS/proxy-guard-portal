
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
EOL

# Make the file executable
chmod +x /opt/proxyguard/start-frontend.js
echo "File created and made executable."

# Restart the service
echo "Restarting the frontend service..."
systemctl restart proxyguard-frontend.service

echo "Done! The ProxyGuard frontend service should now be running."
echo "You can check its status with: systemctl status proxyguard-frontend.service"

