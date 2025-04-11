
#!/bin/bash

FRONTEND_JS="/opt/proxyguard/start-frontend.js"

# Check if the file exists
if [ ! -f "$FRONTEND_JS" ]; then
  echo "Error: $FRONTEND_JS not found!"
  echo "Creating the frontend starter script..."
  
  # Create the directory if it doesn't exist
  mkdir -p /opt/proxyguard
  
  # Create the start-frontend.js file
  cat > /opt/proxyguard/start-frontend.js << 'EOL'
#!/usr/bin/env node

/**
 * ProxyGuard Frontend Server
 * 
 * This script starts a simple server to host the frontend application
 */

import express from 'express';
import path from 'path';
import fs from 'fs';
import { fileURLToPath } from 'url';

// Get current directory path (ES module equivalent of __dirname)
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

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
fi

# Make the start-frontend.js file executable
chmod +x /opt/proxyguard/start-frontend.js
echo "Frontend starter script is now executable"
