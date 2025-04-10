
FROM node:18-alpine AS build

WORKDIR /app

# Add build argument for npm flags
ARG NPM_FLAGS="--legacy-peer-deps"

# Copy necessary files
COPY . .

# Debug what's in the directory
RUN echo "Current working directory contents:" && ls -la

# Install dependencies with --legacy-peer-deps flag to bypass peer dependency conflicts
RUN if [ -f "package.json" ]; then \
      echo "Found package.json, installing dependencies..." && \
      npm install $NPM_FLAGS; \
    else \
      echo "No package.json found in current directory, searching..." && \
      find / -name "package.json" -not -path "*/node_modules/*" -not -path "*/\.*" | head -n 5 && \
      echo "Error: package.json not found in expected location" && exit 1; \
    fi

# Install backend dependencies for NGINX operations with --legacy-peer-deps flag
RUN npm install express bcrypt readline --legacy-peer-deps

# Build the application (if there's a build script)
RUN if grep -q "\"build\":" package.json; then \
      echo "Building application..." && \
      npm run build; \
    else \
      echo "No build script found in package.json, skipping build step"; \
    fi

# Production stage
FROM node:18-alpine

WORKDIR /app

# Debug: Show what's in the environment
RUN echo "Environment variables:" && env | sort

# Install nginx for configuration testing
RUN apk add --no-cache nginx

# Create directory for NGINX operations
RUN mkdir -p /etc/nginx
RUN mkdir -p /var/log/nginx
RUN touch /var/log/nginx/access.log /var/log/nginx/error.log
RUN chmod 666 /var/log/nginx/access.log /var/log/nginx/error.log

# Copy built files from build stage
COPY --from=build /app/dist ./dist
COPY --from=build /app/node_modules ./node_modules
COPY --from=build /app/package.json ./

# Create server directory
RUN mkdir -p /app/server

# Write server file directly using ES module syntax (for index.cjs)
RUN echo '// This file uses ES Module syntax for compatibility with type:module in package.json' > /app/server/index.cjs
RUN echo 'console.log("Starting API server from pre-created file");' >> /app/server/index.cjs
RUN echo 'const express = require("express");' >> /app/server/index.cjs
RUN echo 'const app = express();' >> /app/server/index.cjs
RUN echo 'const PORT = process.env.API_PORT || 3001;' >> /app/server/index.cjs
RUN echo '' >> /app/server/index.cjs
RUN echo 'app.use(express.json());' >> /app/server/index.cjs
RUN echo '' >> /app/server/index.cjs
RUN echo '// Basic health check endpoint' >> /app/server/index.cjs
RUN echo 'app.get("/api/health", (req, res) => {' >> /app/server/index.cjs
RUN echo '  console.log("Health check requested");' >> /app/server/index.cjs
RUN echo '  res.json({ status: "ok", timestamp: new Date() });' >> /app/server/index.cjs
RUN echo '});' >> /app/server/index.cjs
RUN echo '' >> /app/server/index.cjs
RUN echo '// Enhanced logging middleware' >> /app/server/index.cjs
RUN echo 'app.use((req, res, next) => {' >> /app/server/index.cjs
RUN echo '  const timestamp = new Date().toISOString();' >> /app/server/index.cjs
RUN echo '  console.log(`[${timestamp}] ${req.method} ${req.url}`);' >> /app/server/index.cjs
RUN echo '  next();' >> /app/server/index.cjs
RUN echo '});' >> /app/server/index.cjs
RUN echo '' >> /app/server/index.cjs
RUN echo '// Start server' >> /app/server/index.cjs
RUN echo 'app.listen(PORT, () => {' >> /app/server/index.cjs
RUN echo '  console.log(`API Server running on port ${PORT}`);' >> /app/server/index.cjs
RUN echo '});' >> /app/server/index.cjs

# Update start.sh script
<lov-write file_path="app/start.sh">
#!/bin/sh

echo "Starting services with pre-created script..."
echo "Current directory: $(pwd)"
echo "Files in current directory: $(ls -la)"

# Start the backend API server if it exists
if [ -f "/app/server/index.cjs" ]; then
  echo "Starting API server..."
  echo "Server file contents (first 10 lines):"
  head -n 10 /app/server/index.cjs
  
  echo "Starting API server in Node.js CommonJS mode..."
  # No need for --no-warnings as we're using proper .cjs extension now
  node /app/server/index.cjs &
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
  find /app -type f -name "*.js" -o -name "*.cjs" | sort
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
