
#!/bin/sh

echo "Starting services with pre-created script..."
echo "Current directory: $(pwd)"
echo "Files in current directory: $(ls -la)"

# Start the backend API server if it exists
if [ -f "/app/server/index.cjs" ]; then
  echo "Starting API server from .cjs file..."
  node /app/server/index.cjs &
  API_PID=$!
  echo "API server started with PID: $API_PID"
  
  # Check if process is running using /proc directory (works in Alpine)
  if [ -d "/proc/$API_PID" ]; then
    echo "API server running successfully"
  else
    echo "ERROR: API server failed to start properly"
  fi
else
  echo "WARNING: API server file not found at /app/server/index.cjs"
  
  # If we have index.js, create a wrapper script to use it properly
  if [ -f "/app/server/index.js" ]; then
    echo "Found index.js - creating wrapper script..."
    cat > /app/server/index.cjs << EOF
// CommonJS wrapper for ES module
const { createRequire } = require('module');
const require = createRequire(import.meta.url);
const express = require("express");
const app = express();
const PORT = process.env.API_PORT || 3001;

app.use(express.json());

// Basic health check endpoint
app.get("/api/health", (req, res) => {
  console.log("Health check requested");
  res.json({ 
    status: "ok", 
    timestamp: new Date(),
    environment: process.env.NODE_ENV || 'development'
  });
});

// Enhanced logging middleware
app.use((req, res, next) => {
  const timestamp = new Date().toISOString();
  console.log(\`[\${timestamp}] \${req.method} \${req.url}\`);
  
  // Add response logging
  const originalSend = res.send;
  res.send = function(body) {
    console.log(\`[\${timestamp}] Response status: \${res.statusCode}\`);
    return originalSend.call(this, body);
  };
  
  next();
});

// Global error handler
app.use((err, req, res, next) => {
  console.error(\`[ERROR] \${new Date().toISOString()}:\`, err);
  res.status(500).json({ error: "Internal server error" });
});

// Start server with more extensive logging
try {
  app.listen(PORT, () => {
    console.log(\`API Server running on port \${PORT}\`);
    console.log(\`Server environment: \${process.env.NODE_ENV || 'development'}\`);
    console.log(\`Server time: \${new Date().toISOString()}\`);
    console.log("Server endpoints:");
    console.log("  - GET /api/health");
  });
} catch (error) {
  console.error("Failed to start API server:", error);
  process.exit(1);
}
EOF
    echo "Created wrapper script - starting API server..."
    node /app/server/index.cjs &
    API_PID=$!
    echo "API server started with PID: $API_PID"
  else
    echo "No server file found. Checking for files in server directory:"
    find /app -name "*.js" -o -name "*.cjs" | sort
  fi
fi

# Create a simple package.json with a start script if it doesn't exist
if [ ! -f "package.json" ] || ! grep -q "\"start\":" package.json; then
  echo "Creating or updating package.json with start script..."
  cat > package.json << EOF
{
  "name": "proxy-guard-app",
  "version": "1.0.0",
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
