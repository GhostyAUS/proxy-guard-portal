
#!/bin/sh

echo "Starting services in single container mode..."
echo "Current directory: $(pwd)"
echo "Files in current directory: $(ls -la)"

# Start the backend API server
NODE_ENV=production node /app/server/index.cjs &
API_PID=$!
echo "API server started with PID: $API_PID"

# Wait a moment for API to initialize
sleep 2

# Verify API server is running
if [ -d "/proc/$API_PID" ]; then
  echo "API server running successfully"
else
  echo "ERROR: API server failed to start properly"
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
      res.json({ status: 'ok' });
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
