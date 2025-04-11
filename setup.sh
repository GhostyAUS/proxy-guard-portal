
#!/bin/bash

# ProxyGuard Setup Script for Ubuntu Server
# This script sets up the entire application on a dedicated Ubuntu server

# Exit on error
set -e

echo "Setting up ProxyGuard on Ubuntu server..."

# Install Node.js and npm if not already installed
if ! command -v node &> /dev/null; then
  echo "Installing Node.js and npm..."
  curl -fsSL https://deb.nodesource.com/setup_18.x | sudo -E bash -
  sudo apt-get install -y nodejs
fi

# Install project dependencies
echo "Installing project dependencies..."
npm install

# Build the application
echo "Building the application..."
npm run build

# Create a service file for the application
echo "Creating systemd service for the application..."
cat > proxyguard.service << EOL
[Unit]
Description=ProxyGuard Proxy Management Application
After=network.target

[Service]
Type=simple
User=ubuntu
WorkingDirectory=$(pwd)
ExecStart=$(which npm) run start
Restart=on-failure
Environment=NODE_ENV=production PORT=3000

[Install]
WantedBy=multi-user.target
EOL

# Install the service
sudo mv proxyguard.service /etc/systemd/system/
sudo systemctl daemon-reload
sudo systemctl enable proxyguard.service
sudo systemctl start proxyguard.service

# Run the Nginx setup script
echo "Setting up Nginx proxy server..."
cd nginx && bash install.sh

echo "====================================================="
echo "ProxyGuard installation complete!"
echo "The application is running at: http://localhost:3000"
echo "The proxy server is running on port 8080"
echo "====================================================="
