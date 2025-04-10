
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
if [ -f "/app/nginx-manager.sh" ]; then
  chmod +x /app/nginx-manager.sh
else
  echo "nginx-manager.sh not found, creating it..."
  cat > /app/nginx-manager.sh << 'EOF'
#!/bin/bash

# Nginx Manager shell script
# A lightweight alternative to the Node.js API server

# Config paths
CONFIG_PATH="${NGINX_CONFIG_PATH:-/etc/nginx/nginx.conf}"
TEMPLATE_PATH="${NGINX_TEMPLATE_PATH:-/etc/nginx/nginx.conf.template}"

# Function to return JSON response for nginx status
get_nginx_status() {
  # Check if nginx is running
  if pgrep nginx > /dev/null; then
    IS_RUNNING="true"
  else
    IS_RUNNING="false"
  fi
  
  # Check if config exists and is writable
  if [ -f "$CONFIG_PATH" ]; then
    CONFIG_EXISTS="true"
    if [ -w "$CONFIG_PATH" ]; then
      CONFIG_WRITABLE="true"
    else
      CONFIG_WRITABLE="false"
    fi
    LAST_MODIFIED=$(date -r "$CONFIG_PATH" +"%Y-%m-%dT%H:%M:%S.000Z")
  else
    CONFIG_EXISTS="false"
    CONFIG_WRITABLE="false"
    LAST_MODIFIED=$(date +"%Y-%m-%dT%H:%M:%S.000Z")
  fi
  
  # Test nginx config
  if nginx -t > /dev/null 2>&1; then
    CONFIG_SUCCESS="true"
    CONFIG_MESSAGE="Configuration test successful"
  else
    CONFIG_SUCCESS="false"
    CONFIG_MESSAGE="Configuration test failed"
  fi
  
  # Return JSON
  cat << EOT
{
  "isRunning": $IS_RUNNING,
  "configExists": $CONFIG_EXISTS,
  "configWritable": $CONFIG_WRITABLE,
  "lastModified": "$LAST_MODIFIED",
  "lastConfigTest": {
    "success": $CONFIG_SUCCESS,
    "message": "$CONFIG_MESSAGE"
  }
}
EOT
}

# Function to get nginx config
get_nginx_config() {
  if [ -f "$CONFIG_PATH" ]; then
    CONFIG=$(cat "$CONFIG_PATH" | sed 's/"/\\"/g' | tr -d '\n')
    echo "{ \"config\": \"$CONFIG\" }"
  elif [ -f "$TEMPLATE_PATH" ]; then
    CONFIG=$(cat "$TEMPLATE_PATH" | sed 's/"/\\"/g' | tr -d '\n')
    echo "{ \"config\": \"$CONFIG\", \"isTemplate\": true }"
  else
    echo "{ \"error\": \"Configuration file not found\" }"
  fi
}

# Function to save nginx config
save_nginx_config() {
  CONFIG=$(cat)
  
  # Create backup of existing config
  if [ -f "$CONFIG_PATH" ]; then
    BACKUP_PATH="${CONFIG_PATH}.bak-$(date +%s)"
    cp "$CONFIG_PATH" "$BACKUP_PATH"
  fi
  
  # Ensure directory exists
  CONFIG_DIR=$(dirname "$CONFIG_PATH")
  mkdir -p "$CONFIG_DIR"
  
  # Save the config
  echo "$CONFIG" > "$CONFIG_PATH"
  
  # Check if saved successfully
  if [ $? -eq 0 ]; then
    echo "{ \"success\": true }"
  else
    echo "{ \"success\": false, \"error\": \"Failed to save configuration\" }"
  fi
}

# Function to validate nginx config
validate_nginx_config() {
  CONFIG=$(cat)
  
  # Write config to temp file
  TEMP_FILE="/tmp/nginx-test-$(date +%s).conf"
  echo "$CONFIG" > "$TEMP_FILE"
  
  # Test the configuration
  if nginx -c "$TEMP_FILE" -t 2>/tmp/nginx-test-result; then
    rm "$TEMP_FILE"
    echo "{ \"success\": true }"
  else
    ERROR=$(cat /tmp/nginx-test-result | sed 's/"/\\"/g' | tr -d '\n')
    rm "$TEMP_FILE"
    echo "{ \"success\": false, \"error\": \"$ERROR\" }"
  fi
}

# Function to reload nginx
reload_nginx() {
  if nginx -s reload 2>/tmp/nginx-reload-result; then
    echo "{ \"success\": true }"
  else
    ERROR=$(cat /tmp/nginx-reload-result | sed 's/"/\\"/g' | tr -d '\n')
    echo "{ \"success\": false, \"error\": \"$ERROR\" }"
  fi
}

# Main script logic - handle requests based on API path
case "$1" in
  "status")
    get_nginx_status
    ;;
  "config")
    get_nginx_config
    ;;
  "save")
    save_nginx_config
    ;;
  "validate")
    validate_nginx_config
    ;;
  "reload")
    reload_nginx
    ;;
  *)
    echo "{ \"error\": \"Unknown command: $1\" }"
    ;;
esac

exit 0
EOF
  chmod +x /app/nginx-manager.sh
fi

# Create logs directory if it doesn't exist
mkdir -p /var/log/nginx

# Start a simple HTTP server for the API endpoints
echo "Starting the shell-based API server..."
# Check if busybox is installed
if command -v busybox >/dev/null 2>&1; then
  echo "Using busybox httpd for API server..."
  mkdir -p /app/api-server
  nohup busybox httpd -f -p 3001 -h /app/api-server &
  API_PID=$!
  echo "API server started with PID: $API_PID"
else
  echo "Busybox not found, falling back to Python HTTP server..."
  if command -v python3 >/dev/null 2>&1; then
    mkdir -p /app/api-server
    cd /app/api-server && nohup python3 -m http.server 3001 &
    API_PID=$!
    cd /app
    echo "Python API server started with PID: $API_PID"
  elif command -v python >/dev/null 2>&1; then
    mkdir -p /app/api-server
    cd /app/api-server && nohup python -m SimpleHTTPServer 3001 &
    API_PID=$!
    cd /app
    echo "Python API server started with PID: $API_PID"
  else
    echo "ERROR: No suitable HTTP server found (busybox or python)"
    exit 1
  fi
fi

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
