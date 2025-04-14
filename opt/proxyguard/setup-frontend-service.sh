
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
  
  # Ensure the script has the latest content
  echo "Updating the frontend script with the latest version..."
  bash /opt/proxyguard/fix-frontend.sh
fi

# Update the systemd service file
echo "Updating systemd service file..."
cat > /etc/systemd/system/proxyguard-frontend.service << 'EOL'
[Unit]
Description=ProxyGuard Frontend Application
After=network.target proxyguard-api.service
Requires=proxyguard-api.service

[Service]
Type=simple
User=proxyguard
Group=proxyguard
WorkingDirectory=/opt/proxyguard
ExecStart=/usr/bin/node /opt/proxyguard/start-frontend.js
Restart=on-failure
RestartSec=5
StandardOutput=journal
StandardError=journal
SyslogIdentifier=proxyguard-frontend
Environment=NODE_ENV=production PORT=3000

[Install]
WantedBy=multi-user.target
EOL

# Install the frontend service
echo "Installing systemd service..."
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
