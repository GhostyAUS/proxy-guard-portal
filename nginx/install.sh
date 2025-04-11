
#!/bin/bash

# Nginx installation script for Ubuntu server
# This script installs Nginx and sets up the proxy configuration

# Exit on error
set -e

echo "Installing Nginx and required packages..."
sudo apt-get update
sudo apt-get install -y nginx openssl

# Create directory for SSL certificates and ProxyGuard configs
sudo mkdir -p /etc/nginx/certs
sudo mkdir -p /etc/proxyguard
sudo chmod 755 /etc/proxyguard

# Generate self-signed SSL certificates (for development)
echo "Generating self-signed SSL certificates..."
sudo openssl req -x509 -nodes -days 365 -newkey rsa:2048 \
  -keyout /etc/nginx/certs/server.key \
  -out /etc/nginx/certs/server.crt \
  -subj "/CN=localhost" \
  -addext "subjectAltName=DNS:localhost,IP:127.0.0.1"

# Copy Nginx configuration
echo "Setting up Nginx configuration..."
sudo cp nginx.conf.template /etc/nginx/nginx.conf

# Create .htpasswd file for basic auth (if needed)
sudo touch /etc/nginx/.htpasswd

# Create configuration files for ProxyGuard
echo "Setting up ProxyGuard configuration files..."
echo '[]' | sudo tee /etc/proxyguard/whitelist.json > /dev/null
echo '{"nginxConfigPath":"/etc/nginx/nginx.conf","isReadOnly":false,"proxyPort":"8080","authType":"none"}' | sudo tee /etc/proxyguard/settings.json > /dev/null

# Set proper permissions for files
sudo chmod 644 /etc/nginx/nginx.conf
sudo chmod 600 /etc/nginx/certs/server.key
sudo chmod 644 /etc/nginx/certs/server.crt
sudo chmod 644 /etc/proxyguard/whitelist.json
sudo chmod 644 /etc/proxyguard/settings.json

# Create a proxyguard group and add the current user to it
echo "Setting up user permissions..."
sudo groupadd -f proxyguard
sudo usermod -aG proxyguard $USER
sudo usermod -aG proxyguard www-data

# Set group ownership for configuration files
sudo chown :proxyguard /etc/nginx/nginx.conf
sudo chown :proxyguard /etc/proxyguard/whitelist.json
sudo chown :proxyguard /etc/proxyguard/settings.json

# Make config files group-writable
sudo chmod g+w /etc/nginx/nginx.conf
sudo chmod g+w /etc/proxyguard/whitelist.json
sudo chmod g+w /etc/proxyguard/settings.json

# Restart Nginx
echo "Restarting Nginx service..."
sudo systemctl restart nginx

echo "Nginx installation complete!"
echo "The proxy server is now running on port 8080"
