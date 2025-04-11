
#!/bin/bash

# ProxyGuard API Proxy Server Setup Script
# This script sets up the API proxy server for the ProxyGuard application

# Exit on error
set -e

echo "Setting up ProxyGuard API Proxy Server..."

# Install required Node.js packages
echo "Installing required packages..."
npm install express body-parser helmet express-rate-limit morgan

# Create required directories
echo "Creating configuration directories..."
sudo mkdir -p /etc/proxyguard
sudo mkdir -p /var/log/proxyguard
sudo touch /var/log/proxyguard/access.log

# Create proxyguard user and group if they don't exist
if ! id -u proxyguard > /dev/null 2>&1; then
  echo "Creating proxyguard user..."
  sudo useradd -m -r -s /bin/false proxyguard
fi

# Set proper permissions
echo "Setting permissions..."
sudo chown -R proxyguard:proxyguard /etc/proxyguard
sudo chown -R proxyguard:proxyguard /var/log/proxyguard
sudo chmod 755 /etc/proxyguard
sudo chmod 755 /var/log/proxyguard

# Create empty configuration files if they don't exist
if [ ! -f /etc/proxyguard/whitelist.json ]; then
  echo "Creating empty whitelist configuration..."
  echo "[]" | sudo tee /etc/proxyguard/whitelist.json > /dev/null
  sudo chown proxyguard:proxyguard /etc/proxyguard/whitelist.json
  sudo chmod 644 /etc/proxyguard/whitelist.json
fi

if [ ! -f /etc/proxyguard/settings.json ]; then
  echo "Creating default settings configuration..."
  cat > /tmp/settings.json << EOL
{
  "nginxConfigPath": "/etc/nginx/nginx.conf",
  "isReadOnly": false,
  "proxyPort": "8080",
  "authType": "none",
  "logSettings": {
    "accessLogPath": "/var/log/nginx/access.log",
    "errorLogPath": "/var/log/nginx/error.log",
    "deniedLogPath": "/var/log/nginx/denied.log"
  }
}
EOL
  sudo mv /tmp/settings.json /etc/proxyguard/settings.json
  sudo chown proxyguard:proxyguard /etc/proxyguard/settings.json
  sudo chmod 644 /etc/proxyguard/settings.json
fi

# Copy API server to installation directory
echo "Installing API proxy server..."
sudo mkdir -p /opt/proxyguard/server
sudo cp api-proxy.js /opt/proxyguard/server/
sudo chmod +x /opt/proxyguard/server/api-proxy.js
sudo chown -R proxyguard:proxyguard /opt/proxyguard/server

# Ensure proxyguard user can access nginx configuration
echo "Setting up nginx access permissions..."
sudo usermod -aG www-data proxyguard
sudo chmod g+r /etc/nginx/nginx.conf

# Install service file
echo "Installing systemd service..."
sudo cp proxyguard-api.service /etc/systemd/system/
sudo systemctl daemon-reload
sudo systemctl enable proxyguard-api.service

# Install command execution script
echo "Setting up command execution script..."
sudo cp ../proxyguard-exec.sh /usr/local/bin/proxyguard-exec
sudo chmod 755 /usr/local/bin/proxyguard-exec

# Set up sudo permissions for the execution script
echo "Setting up sudo permissions..."
cat > /tmp/proxyguard_sudo << EOL
# Allow the proxyguard user to execute specific commands without password
proxyguard ALL=(ALL) NOPASSWD: /usr/local/bin/proxyguard-exec
EOL

sudo cp /tmp/proxyguard_sudo /etc/sudoers.d/proxyguard
sudo chmod 440 /etc/sudoers.d/proxyguard

# Start the service
echo "Starting ProxyGuard API service..."
sudo systemctl start proxyguard-api.service

echo "====================================================="
echo "ProxyGuard API Proxy Server installation complete!"
echo "The API server is running on port 3000"
echo "====================================================="
