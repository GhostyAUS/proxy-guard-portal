
#!/bin/sh

echo "Starting services with pre-created script..."

# Start the backend API server if it exists
if [ -f "/app/server/index.js" ]; then
  echo "Starting API server..."
  node /app/server/index.js &
  API_PID=$!
  echo "API server started with PID: $API_PID"
else
  echo "WARNING: API server file not found, skipping backend startup"
fi

# Start the frontend
echo "Starting frontend..."
npm start
