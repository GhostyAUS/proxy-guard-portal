
#!/bin/bash

# ProxyGuard Setup Script for Ubuntu Server
# This script sets up the entire application on a dedicated Ubuntu server

# Exit on error
set -e

# Get the absolute path of the script directory
SCRIPT_DIR="$( cd "$( dirname "${BASH_SOURCE[0]}" )" &> /dev/null && pwd )"

echo "Setting up ProxyGuard on Ubuntu server..."

# Install Node.js and npm if not already installed
if ! command -v node &> /dev/null; then
  echo "Installing Node.js and npm..."
  curl -fsSL https://deb.nodesource.com/setup_18.x | sudo -E bash -
  sudo apt-get install -y nodejs
fi

# Install required system packages
echo "Installing required system packages..."
sudo apt-get update
sudo apt-get install -y nginx openssl

# Create proxyguard user and group
if ! id -u proxyguard > /dev/null 2>&1; then
  echo "Creating proxyguard user and group..."
  sudo useradd -m -r -s /bin/false proxyguard
  sudo usermod -aG www-data proxyguard
fi

# Create application directory
APP_DIR="/opt/proxyguard"
echo "Creating application directory at $APP_DIR..."
sudo mkdir -p $APP_DIR
sudo chown proxyguard:proxyguard $APP_DIR

# Create necessary directories
echo "Creating necessary directories..."
sudo mkdir -p /etc/proxyguard
sudo mkdir -p /var/log/proxyguard
sudo mkdir -p /etc/nginx/certs

# Set proper permissions
sudo chown -R proxyguard:proxyguard /etc/proxyguard
sudo chown -R proxyguard:proxyguard /var/log/proxyguard
sudo chmod 755 /etc/proxyguard
sudo chmod 755 /var/log/proxyguard

# Copy application files to installation directory
echo "Copying application files..."
if [ "$SCRIPT_DIR" != "$APP_DIR" ]; then
  sudo cp -r "$SCRIPT_DIR"/* $APP_DIR/
  sudo chown -R proxyguard:proxyguard $APP_DIR
else
  echo "Already in destination directory. Skipping copy."
fi

# Make scripts executable
echo "Making scripts executable..."
sudo chmod +x $APP_DIR/server/generate-api-key.sh
sudo chmod +x $APP_DIR/opt/proxyguard/make-frontend-executable.sh
sudo chmod +x $APP_DIR/opt/proxyguard/setup-frontend-service.sh
sudo chmod +x $APP_DIR/server/setup-api-server.sh

# Generate self-signed SSL certificates (for development)
echo "Generating self-signed SSL certificates..."
sudo openssl req -x509 -nodes -days 365 -newkey rsa:2048 \
  -keyout /etc/nginx/certs/server.key \
  -out /etc/nginx/certs/server.crt \
  -subj "/CN=localhost" \
  -addext "subjectAltName=DNS:localhost,IP:127.0.0.1"

# Set proper permissions for certificates
sudo chmod 600 /etc/nginx/certs/server.key
sudo chmod 644 /etc/nginx/certs/server.crt

# Generate API key for secure communication
echo "Generating API key for secure communication..."
$APP_DIR/server/generate-api-key.sh

# Install command execution script
echo "Setting up command execution script..."
sudo cp "$APP_DIR/proxyguard-exec.sh" /usr/local/bin/proxyguard-exec
sudo chmod 755 /usr/local/bin/proxyguard-exec

# Set up sudo permissions for the execution script
echo "Setting up sudo permissions..."
cat > /tmp/proxyguard_sudo << EOL
# Allow the proxyguard user to execute specific commands without password
proxyguard ALL=(ALL) NOPASSWD: /usr/local/bin/proxyguard-exec
EOL

sudo cp /tmp/proxyguard_sudo /etc/sudoers.d/proxyguard
sudo chmod 440 /etc/sudoers.d/proxyguard

# Switch to application directory
cd $APP_DIR

# Install project dependencies
echo "Installing project dependencies..."
sudo -u proxyguard npm install

# Build the application
echo "Building the application..."
sudo -u proxyguard npm run build

# Create the start-frontend.js file explicitly with ES module syntax
echo "Creating frontend starter script using ES module syntax..."
cat > $APP_DIR/start-frontend.js << 'EOL'
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

sudo chmod +x $APP_DIR/start-frontend.js
sudo chown proxyguard:proxyguard $APP_DIR/start-frontend.js

# Set up Nginx configuration
echo "Setting up Nginx proxy server..."
cd $APP_DIR/nginx && sudo bash install.sh

# Set up API server
echo "Setting up API proxy server..."
cd $APP_DIR/server && sudo bash setup-api-server.sh

# Set up frontend server
echo "Setting up frontend server..."
cd $APP_DIR && sudo bash opt/proxyguard/setup-frontend-service.sh

echo "====================================================="
echo "ProxyGuard installation complete!"
echo "The application is running at: http://server-ip:3000"
echo "The API server is running on port 3001"
echo "The proxy server is running on port 8080"
echo "====================================================="
echo ""
echo "NOTE: For production use, consider:"
echo "- Setting up a proper domain name and SSL certificates"
echo "- Configuring firewall rules to restrict access"
echo "- Setting up monitoring and alerts"
echo "====================================================="
