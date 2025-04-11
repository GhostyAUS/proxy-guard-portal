
#!/bin/bash

# Exit on error
set -e

echo "Setting up ProxyGuard Frontend Service..."

# Make sure the frontend script exists and is executable
if [ ! -f "/opt/proxyguard/start-frontend.js" ]; then
  echo "Frontend script not found. Creating it now..."
  bash /opt/proxyguard/fix-frontend.sh
else
  echo "Frontend script found. Making it executable..."
  chmod +x /opt/proxyguard/start-frontend.js
fi

# Install the frontend service
echo "Installing systemd service..."
cp /opt/proxyguard/server/proxyguard-frontend.service /etc/systemd/system/
systemctl daemon-reload
systemctl enable proxyguard-frontend.service

# Restart services
echo "Restarting services..."
systemctl restart proxyguard-api.service || echo "Warning: Failed to restart API service. Will continue anyway."
systemctl restart proxyguard-frontend.service

# Check service status
echo "Service status:"
systemctl status proxyguard-api.service --no-pager || true
systemctl status proxyguard-frontend.service --no-pager || true

echo "ProxyGuard Frontend Service setup complete!"
