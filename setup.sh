
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

# Create application directory
APP_DIR="/opt/proxyguard"
echo "Creating application directory at $APP_DIR..."
sudo mkdir -p $APP_DIR
sudo chown $USER:$USER $APP_DIR

# Copy application files to installation directory
echo "Copying application files..."
cp -r ./* $APP_DIR/

# Switch to application directory
cd $APP_DIR

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
User=$USER
WorkingDirectory=$APP_DIR
ExecStart=$(which npm) run start
Restart=on-failure
Environment=NODE_ENV=production PORT=3000 VITE_WHITELIST_CONFIG_PATH=/etc/proxyguard/whitelist.json VITE_PROXY_SETTINGS_PATH=/etc/proxyguard/settings.json VITE_NGINX_CONFIG_PATH=/etc/nginx/nginx.conf

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
cd $APP_DIR/nginx && bash install.sh

echo "====================================================="
echo "ProxyGuard installation complete!"
echo "The application is running at: http://localhost:3000"
echo "The proxy server is running on port 8080"
echo "====================================================="
echo ""
echo "NOTE: You may need to log out and back in for group"
echo "      permissions to take effect."
echo "====================================================="
