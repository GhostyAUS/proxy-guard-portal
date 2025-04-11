
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

# Add start script to package.json if it doesn't exist
echo "Adding start script to package.json..."
if ! grep -q '"start":' package.json; then
  # Use temporary file to avoid issues with inline editing
  jq '.scripts.start = "vite preview --host 0.0.0.0 --port 3000"' package.json > package.json.tmp
  mv package.json.tmp package.json
  # If jq is not available, use this alternative
  if [ $? -ne 0 ]; then
    # Alternative method if jq fails
    sed -i 's/"scripts": {/"scripts": {\n    "start": "vite preview --host 0.0.0.0 --port 3000",/g' package.json
  fi
fi

# Build the application
echo "Building the application..."
npm run build

# Install the command execution script
echo "Setting up command execution script..."
sudo cp proxyguard-exec.sh /usr/local/bin/proxyguard-exec
sudo chmod 755 /usr/local/bin/proxyguard-exec

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

# Set up sudo permissions for the execution script
echo "Setting up sudo permissions..."
cat > proxyguard_sudo << EOL
# Allow the ProxyGuard user to execute specific commands without password
%proxyguard ALL=(ALL) NOPASSWD: /usr/local/bin/proxyguard-exec
EOL

sudo mv proxyguard_sudo /etc/sudoers.d/proxyguard
sudo chmod 440 /etc/sudoers.d/proxyguard

echo "====================================================="
echo "ProxyGuard installation complete!"
echo "The application is running at: http://localhost:3000"
echo "The proxy server is running on port 8080"
echo "====================================================="
echo ""
echo "NOTE: You may need to log out and back in for group"
echo "      permissions to take effect."
echo "====================================================="
