
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
  cat << EOF
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
EOF
}

# Function to get nginx config
get_nginx_config() {
  if [ -f "$CONFIG_PATH" ]; then
    echo "{"
    echo "  \"config\": $(cat "$CONFIG_PATH" | jq -Rs .)"
    echo "}"
  elif [ -f "$TEMPLATE_PATH" ]; then
    echo "{"
    echo "  \"config\": $(cat "$TEMPLATE_PATH" | jq -Rs .)"
    echo "  \"isTemplate\": true"
    echo "}"
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
    ERROR=$(cat /tmp/nginx-test-result | jq -Rs .)
    rm "$TEMP_FILE"
    echo "{ \"success\": false, \"error\": $ERROR }"
  fi
}

# Function to reload nginx
reload_nginx() {
  if nginx -s reload 2>/tmp/nginx-reload-result; then
    echo "{ \"success\": true }"
  else
    ERROR=$(cat /tmp/nginx-reload-result | jq -Rs .)
    echo "{ \"success\": false, \"error\": $ERROR }"
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
