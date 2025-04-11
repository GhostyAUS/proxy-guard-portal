
#!/bin/bash

# Exit on error
set -e

# Application directory
APP_DIR="/opt/proxyguard"

# Navigate to app directory
cd $APP_DIR

# Add start script to package.json
echo "Adding start script to package.json..."
if ! grep -q '"start":' package.json; then
  # Try with jq if available
  if command -v jq &> /dev/null; then
    jq '.scripts.start = "vite preview --host 0.0.0.0 --port 3000"' package.json > package.json.tmp
    mv package.json.tmp package.json
  else
    # Fallback to sed
    sed -i 's/"scripts": {/"scripts": {\n    "start": "vite preview --host 0.0.0.0 --port 3000",/g' package.json
  fi
  echo "Start script added successfully!"
else
  echo "Start script already exists."
fi

# Restart the service
echo "Restarting ProxyGuard service..."
sudo systemctl daemon-reload
sudo systemctl restart proxyguard.service

# Display status
echo "Service status:"
sudo systemctl status proxyguard.service --no-pager

echo "If the service is now running, you can access the ProxyGuard UI at:"
echo "http://SERVER_IP:3000"
echo "(replace SERVER_IP with your server's IP address)"
