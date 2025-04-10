
#!/bin/sh

echo "Starting services with pre-created script..."
echo "Current directory: $(pwd)"
echo "Files in current directory: $(ls -la)"

# Start the backend API server if it exists
if [ -f "/app/server/index.js" ]; then
  echo "Starting API server..."
  echo "Server file contents:"
  head -n 5 /app/server/index.js
  
  node /app/server/index.js &
  API_PID=$!
  echo "API server started with PID: $API_PID"
  
  # Check if process is actually running
  if ps -p $API_PID > /dev/null; then
    echo "API server running successfully"
  else
    echo "ERROR: API server failed to start properly"
  fi
else
  echo "WARNING: API server file not found, skipping backend startup"
  echo "Contents of /app directory:"
  find /app -type f -name "*.js" | sort
fi

# Start the frontend
echo "Starting frontend..."
echo "Package.json scripts:"
grep -A 10 "\"scripts\"" package.json || echo "No scripts section found"

# Start with verbose logging
NODE_ENV=production npm start
