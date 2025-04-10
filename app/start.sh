
#!/bin/sh

echo "Starting services in single container mode..."
echo "Current directory: $(pwd)"
echo "Files in current directory: $(ls -la)"

# Make sure nginx config exists
if [ ! -f "/etc/nginx/nginx.conf" ] && [ -f "/etc/nginx/nginx.conf.template" ]; then
  echo "Copying nginx.conf.template to nginx.conf..."
  cp /etc/nginx/nginx.conf.template /etc/nginx/nginx.conf
fi

# Make the nginx manager script executable
chmod +x /app/nginx-manager.sh

# Create logs directory if it doesn't exist
mkdir -p /var/log/nginx

# Start a simple HTTP server for the API endpoints
echo "Starting the shell-based API server..."
nohup busybox httpd -f -p 3001 -h /app/api-server &
API_PID=$!
echo "API server started with PID: $API_PID"

# Create API endpoint handlers
mkdir -p /app/api-server/api/nginx
cat > /app/api-server/api/nginx/status << 'EOF'
#!/bin/sh
echo "Content-type: application/json"
echo ""
/app/nginx-manager.sh status
EOF
chmod +x /app/api-server/api/nginx/status

cat > /app/api-server/api/nginx/config << 'EOF'
#!/bin/sh
echo "Content-type: application/json"
echo ""
/app/nginx-manager.sh config
EOF
chmod +x /app/api-server/api/nginx/config

cat > /app/api-server/api/nginx/save << 'EOF'
#!/bin/sh
echo "Content-type: application/json"
echo ""
/app/nginx-manager.sh save
EOF
chmod +x /app/api-server/api/nginx/save

cat > /app/api-server/api/nginx/validate << 'EOF'
#!/bin/sh
echo "Content-type: application/json"
echo ""
/app/nginx-manager.sh validate
EOF
chmod +x /app/api-server/api/nginx/validate

cat > /app/api-server/api/nginx/reload << 'EOF'
#!/bin/sh
echo "Content-type: application/json"
echo ""
/app/nginx-manager.sh reload
EOF
chmod +x /app/api-server/api/nginx/reload

cat > /app/api-server/api/health << 'EOF'
#!/bin/sh
echo "Content-type: application/json"
echo ""
echo "{ \"status\": \"ok\", \"timestamp\": \"$(date -Iseconds)\" }"
EOF
chmod +x /app/api-server/api/health

# Wait a moment for API to initialize
sleep 2

# Finally start the frontend
echo "Starting frontend..."
if [ -d "dist" ] && [ -f "dist/index.html" ]; then
  echo "Serving dist directory..."
  npx serve -s dist
elif [ -f "index.html" ]; then
  echo "Serving current directory..."
  npx serve
else
  echo "ERROR: Could not determine how to start the frontend. Keeping container alive for debugging..."
  tail -f /dev/null
fi
