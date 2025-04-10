
#!/bin/sh

echo "Starting services with pre-created script..."
echo "Current directory: $(pwd)"
echo "Files in current directory: $(ls -la)"

# Start the backend API server if it exists
if [ -f "/app/server/index.js" ]; then
  echo "Starting API server..."
  echo "Server file contents (first 10 lines):"
  head -n 10 /app/server/index.js
  
  echo "Starting API server in Node.js ESM mode..."
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

# Check for package.json and scripts
echo "Package.json contents:"
cat package.json

# Check if there's a start script in package.json
if grep -q "\"start\":" package.json; then
  echo "Found start script in package.json, running npm start..."
  NODE_ENV=production npm start
else
  echo "No start script found in package.json. Using alternative method to start the app..."
  
  # Try to determine how to start the app
  if [ -f "dist/index.html" ]; then
    echo "Found dist/index.html, serving with a simple HTTP server..."
    npx serve -s dist
  elif [ -f "index.html" ]; then
    echo "Found index.html, serving with a simple HTTP server..."
    npx serve
  else
    echo "ERROR: Could not determine how to start the frontend. Files in current directory:"
    ls -la
    echo "Waiting indefinitely to keep container alive for debugging..."
    tail -f /dev/null
  fi
fi
