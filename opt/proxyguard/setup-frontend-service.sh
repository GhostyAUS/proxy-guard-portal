
#!/bin/bash

# Exit on error
set -e

echo "Setting up ProxyGuard Frontend Service..."

# Make the frontend script executable
chmod +x /opt/proxyguard/start-frontend.js

# Install the frontend service
echo "Installing systemd service..."
cp /opt/proxyguard/server/proxyguard-frontend.service /etc/systemd/system/
systemctl daemon-reload
systemctl enable proxyguard-frontend.service

# Restart services
echo "Restarting services..."
systemctl restart proxyguard-api.service
systemctl restart proxyguard-frontend.service

# Check service status
echo "Service status:"
systemctl status proxyguard-api.service --no-pager
systemctl status proxyguard-frontend.service --no-pager

echo "ProxyGuard Frontend Service setup complete!"
