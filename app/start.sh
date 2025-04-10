
#!/bin/sh

echo "Starting services in single container mode..."
echo "Current directory: $(pwd)"
echo "Files in current directory: $(ls -la)"

# Make sure nginx config exists
if [ ! -f "/etc/nginx/nginx.conf" ] && [ -f "/etc/nginx/nginx.conf.template" ]; then
  echo "Copying nginx.conf.template to nginx.conf..."
  cp /etc/nginx/nginx.conf.template /etc/nginx/nginx.conf
fi

# Create directory for the server if it doesn't exist
mkdir -p /app/server

# Ensure server files exist in the correct location
if [ ! -f "/app/server/index.cjs" ] && [ -f "/app/src/server/index.cjs" ]; then
  echo "Copying server files from src/server to server directory..."
  cp /app/src/server/index.cjs /app/server/
  cp /app/src/server/nginx-service.cjs /app/server/
fi

echo "Starting the backend API server..."
NODE_ENV=production node /app/server/index.cjs &
API_PID=$!
echo "API server started with PID: $API_PID"

# Wait a moment for API to initialize
sleep 3

# Verify API server is running
if kill -0 $API_PID 2>/dev/null; then
  echo "API server running successfully"
else
  echo "ERROR: API server failed to start properly"
  # Show last error logs
  echo "Last error logs:"
  tail -n 20 /var/log/nginx/error.log 2>/dev/null
  
  # Try to start a minimal API server as fallback
  echo "Starting minimal API server as fallback..."
  node -e "
    const express = require('express');
    const app = express();
    const PORT = process.env.API_PORT || 3001;
    app.use(express.json());
    app.use((req, res, next) => {
      res.header('Access-Control-Allow-Origin', '*');
      res.header('Access-Control-Allow-Methods', 'GET, POST, PUT, DELETE');
      res.header('Access-Control-Allow-Headers', 'Origin, X-Requested-With, Content-Type, Accept');
      next();
    });
    app.get('/api/health', (req, res) => {
      res.setHeader('Content-Type', 'application/json');
      res.json({ status: 'ok', mode: 'minimal' });
    });
    app.listen(PORT, () => console.log('Minimal API running on port ' + PORT));
  " &
  API_PID=$!
  echo "Minimal API server started with PID: $API_PID"
fi

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
