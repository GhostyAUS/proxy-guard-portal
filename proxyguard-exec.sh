
#!/bin/bash
# ProxyGuard privileged command execution script
# This script is designed to be installed at /usr/local/bin/proxyguard-exec
# and configured with proper sudo permissions

# Check if a command was provided
if [ $# -lt 1 ]; then
  echo "Error: No command specified"
  exit 1
fi

# The first argument is the command to execute
COMMAND="$1"
shift

# Define allowed commands and their corresponding sudo commands
case "$COMMAND" in
  "reload_nginx")
    sudo /bin/systemctl reload nginx
    exit $?
    ;;
  "restart_nginx")
    sudo /bin/systemctl restart nginx
    exit $?
    ;;
  "test_config")
    sudo /usr/sbin/nginx -t
    exit $?
    ;;
  "check_status")
    sudo /bin/systemctl is-active nginx > /dev/null
    exit $?
    ;;
  "check_writable")
    # Check if a file path was provided
    if [ $# -lt 1 ]; then
      echo "Error: No file path specified for check_writable"
      exit 1
    fi
    
    # Check if the file exists and is writable
    if [ -w "$1" ]; then
      echo "File is writable"
      exit 0
    else
      echo "File is not writable"
      exit 1
    fi
    ;;
  "move_file")
    # Check if source and destination are provided
    if [ $# -lt 2 ]; then
      echo "Error: Source and destination paths required"
      exit 1
    fi
    
    SOURCE="$1"
    DEST="$2"
    
    # Validate paths to prevent abuse
    if [[ ! "$DEST" =~ ^/etc/(nginx|proxyguard)/ ]]; then
      echo "Error: Destination path not allowed"
      exit 1
    fi
    
    # Move the file with proper ownership and permissions
    if [ -f "$SOURCE" ]; then
      sudo cp "$SOURCE" "$DEST"
      sudo chmod 644 "$DEST"
      
      # Set appropriate ownership
      if [[ "$DEST" =~ ^/etc/nginx/ ]]; then
        sudo chown root:www-data "$DEST"
      elif [[ "$DEST" =~ ^/etc/proxyguard/ ]]; then
        sudo chown proxyguard:proxyguard "$DEST"
      fi
      
      rm -f "$SOURCE"
      exit 0
    else
      echo "Error: Source file not found"
      exit 1
    fi
    ;;
  *)
    echo "Error: Unknown command '$COMMAND'"
    exit 1
    ;;
esac
