
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
  # Use node --no-warnings to suppress ESM warnings
  node --no-warnings /app/server/index.js &
  API_PID=$!
  echo "API server started with PID: $API_PID"
  
  # Check if process is actually running
  if ps -p $API_PID > /dev/null; then
    echo "API server running successfully"
  else
    echo "ERROR: API server failed to start properly"
    # Try to detect what went wrong
    echo "Node.js version: $(node --version)"
    echo "Testing ES module import support..."
    node -e "import('fs').then(() => console.log('ESM imports work'))" || echo "ESM imports fail"
  fi
else
  echo "WARNING: API server file not found, skipping backend startup"
  echo "Contents of /app directory:"
  find /app -type f -name "*.js" | sort
fi

# Create a simple package.json with a start script if it doesn't exist
if [ ! -f "package.json" ] || ! grep -q "\"start\":" package.json; then
  echo "Creating or updating package.json with start script..."
  cat > package.json << EOF
{
  "name": "proxy-guard-app",
  "version": "1.0.0",
  "type": "module",
  "scripts": {
    "start": "npx serve -s dist || npx serve || echo 'No frontend to serve'"
  }
}
EOF
  echo "Created package.json with start script"
fi

# Show package.json contents
echo "Package.json contents:"
cat package.json

# Check if dist directory exists and if it has files
if [ -d "dist" ]; then
  echo "Found dist directory, contents:"
  ls -la dist || echo "Empty dist directory"
fi

# Finally start the frontend with the npm start script that should now exist
echo "Starting frontend..."
NODE_ENV=production npm start || {
  echo "Frontend start script failed, trying alternatives..."
  
  # Fallback serving mechanism
  if [ -d "dist" ] && [ -f "dist/index.html" ]; then
    echo "Serving dist directory..."
    npx serve -s dist
  elif [ -f "index.html" ]; then
    echo "Serving current directory..."
    npx serve
  else
    echo "ERROR: Could not determine how to start the frontend. Keeping container alive for debugging..."
    echo "Current directory structure:"
    find . -type f -name "*.html" | sort
    tail -f /dev/null
  fi
}
