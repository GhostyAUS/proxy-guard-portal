
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
    sudo /bin/systemctl status nginx
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
  *)
    echo "Error: Unknown command '$COMMAND'"
    exit 1
    ;;
esac
