
#!/bin/bash

# Nginx installation script for Ubuntu server
# This script installs Nginx and sets up the proxy configuration

# Exit on error
set -e

echo "Installing Nginx and required packages..."
sudo apt-get update
sudo apt-get install -y nginx openssl

# Create directory for SSL certificates
sudo mkdir -p /etc/nginx/certs

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

# Set permissions
sudo chmod 644 /etc/nginx/nginx.conf
sudo chmod 600 /etc/nginx/certs/server.key

# Restart Nginx
echo "Restarting Nginx service..."
sudo systemctl restart nginx

echo "Nginx installation complete!"
echo "The proxy server is now running on port 8080"
