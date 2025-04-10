
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

# Create the server file with CommonJS syntax
RUN echo '// Server file with CommonJS syntax' > /app/server/index.cjs
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

# Create the start.sh script directly in the container
RUN echo '#!/bin/sh' > /app/start.sh && \
    echo 'echo "Starting services with pre-created script..."' >> /app/start.sh && \
    echo 'echo "Current directory: $(pwd)"' >> /app/start.sh && \
    echo 'echo "Files in current directory: $(ls -la)"' >> /app/start.sh && \
    echo '' >> /app/start.sh && \
    echo '# Start the backend API server if it exists' >> /app/start.sh && \
    echo 'if [ -f "/app/server/index.cjs" ]; then' >> /app/start.sh && \
    echo '  echo "Starting API server from .cjs file..."' >> /app/start.sh && \
    echo '  node /app/server/index.cjs &' >> /app/start.sh && \
    echo '  API_PID=$!' >> /app/start.sh && \
    echo '  echo "API server started with PID: $API_PID"' >> /app/start.sh && \
    echo '  ' >> /app/start.sh && \
    echo '  # Check if process is running using pgrep instead of ps -p' >> /app/start.sh && \
    echo '  if [ -d "/proc/$API_PID" ]; then' >> /app/start.sh && \
    echo '    echo "API server running successfully"' >> /app/start.sh && \
    echo '  else' >> /app/start.sh && \
    echo '    echo "ERROR: API server failed to start properly"' >> /app/start.sh && \
    echo '  fi' >> /app/start.sh && \
    echo 'else' >> /app/start.sh && \
    echo '  echo "WARNING: API server file not found at /app/server/index.cjs"' >> /app/start.sh && \
    echo '  ' >> /app/start.sh && \
    echo '  # If we have index.js, create a wrapper script to use it properly' >> /app/start.sh && \
    echo '  if [ -f "/app/server/index.js" ]; then' >> /app/start.sh && \
    echo '    echo "Found index.js - creating wrapper script..."' >> /app/start.sh && \
    echo '    cat > /app/server/index.cjs << EOF' >> /app/start.sh && \
    echo 'const express = require("express");' >> /app/start.sh && \
    echo 'const app = express();' >> /app/start.sh && \
    echo 'const PORT = process.env.API_PORT || 3001;' >> /app/start.sh && \
    echo '' >> /app/start.sh && \
    echo 'app.use(express.json());' >> /app/start.sh && \
    echo '' >> /app/start.sh && \
    echo '// Basic health check endpoint' >> /app/start.sh && \
    echo 'app.get("/api/health", (req, res) => {' >> /app/start.sh && \
    echo '  console.log("Health check requested");' >> /app/start.sh && \
    echo '  res.json({ ' >> /app/start.sh && \
    echo '    status: "ok", ' >> /app/start.sh && \
    echo '    timestamp: new Date(),' >> /app/start.sh && \
    echo '    environment: process.env.NODE_ENV || "development"' >> /app/start.sh && \
    echo '  });' >> /app/start.sh && \
    echo '});' >> /app/start.sh && \
    echo '' >> /app/start.sh && \
    echo 'app.listen(PORT, () => {' >> /app/start.sh && \
    echo '  console.log(`API Server running on port ${PORT}`);' >> /app/start.sh && \
    echo '});' >> /app/start.sh && \
    echo 'EOF' >> /app/start.sh && \
    echo '    echo "Created wrapper script - starting API server..."' >> /app/start.sh && \
    echo '    node /app/server/index.cjs &' >> /app/start.sh && \
    echo '    API_PID=$!' >> /app/start.sh && \
    echo '    echo "API server started with PID: $API_PID"' >> /app/start.sh && \
    echo '  else' >> /app/start.sh && \
    echo '    echo "No server file found. Checking for files in server directory:"' >> /app/start.sh && \
    echo '    find /app -name "*.js" -o -name "*.cjs" | sort' >> /app/start.sh && \
    echo '  fi' >> /app/start.sh && \
    echo 'fi' >> /app/start.sh && \
    echo '' >> /app/start.sh && \
    echo '# Create a simple package.json with a start script if it doesn'"'"'t exist' >> /app/start.sh && \
    echo 'if [ ! -f "package.json" ] || ! grep -q "\"start\":" package.json; then' >> /app/start.sh && \
    echo '  echo "Creating or updating package.json with start script..."' >> /app/start.sh && \
    echo '  cat > package.json << EOF' >> /app/start.sh && \
    echo '{' >> /app/start.sh && \
    echo '  "name": "proxy-guard-app",' >> /app/start.sh && \
    echo '  "version": "1.0.0",' >> /app/start.sh && \
    echo '  "scripts": {' >> /app/start.sh && \
    echo '    "start": "npx serve -s dist || npx serve || echo '"'"'No frontend to serve'"'"'"' >> /app/start.sh && \
    echo '  }' >> /app/start.sh && \
    echo '}' >> /app/start.sh && \
    echo 'EOF' >> /app/start.sh && \
    echo '  echo "Created package.json with start script"' >> /app/start.sh && \
    echo 'fi' >> /app/start.sh && \
    echo '' >> /app/start.sh && \
    echo '# Show package.json contents' >> /app/start.sh && \
    echo 'echo "Package.json contents:"' >> /app/start.sh && \
    echo 'cat package.json' >> /app/start.sh && \
    echo '' >> /app/start.sh && \
    echo '# Check if dist directory exists and if it has files' >> /app/start.sh && \
    echo 'if [ -d "dist" ]; then' >> /app/start.sh && \
    echo '  echo "Found dist directory, contents:"' >> /app/start.sh && \
    echo '  ls -la dist || echo "Empty dist directory"' >> /app/start.sh && \
    echo 'fi' >> /app/start.sh && \
    echo '' >> /app/start.sh && \
    echo '# Finally start the frontend with the npm start script that should now exist' >> /app/start.sh && \
    echo 'echo "Starting frontend..."' >> /app/start.sh && \
    echo 'NODE_ENV=production npm start || {' >> /app/start.sh && \
    echo '  echo "Frontend start script failed, trying alternatives..."' >> /app/start.sh && \
    echo '  ' >> /app/start.sh && \
    echo '  # Fallback serving mechanism' >> /app/start.sh && \
    echo '  if [ -d "dist" ] && [ -f "dist/index.html" ]; then' >> /app/start.sh && \
    echo '    echo "Serving dist directory..."' >> /app/start.sh && \
    echo '    npx serve -s dist' >> /app/start.sh && \
    echo '  elif [ -f "index.html" ]; then' >> /app/start.sh && \
    echo '    echo "Serving current directory..."' >> /app/start.sh && \
    echo '    npx serve' >> /app/start.sh && \
    echo '  else' >> /app/start.sh && \
    echo '    echo "ERROR: Could not determine how to start the frontend. Keeping container alive for debugging..."' >> /app/start.sh && \
    echo '    echo "Current directory structure:"' >> /app/start.sh && \
    echo '    find . -type f -name "*.html" | sort' >> /app/start.sh && \
    echo '    tail -f /dev/null' >> /app/start.sh && \
    echo '  fi' >> /app/start.sh && \
    echo '}' >> /app/start.sh

# Make the start script executable
RUN chmod +x /app/start.sh

# Set the entrypoint
ENTRYPOINT ["/app/start.sh"]
