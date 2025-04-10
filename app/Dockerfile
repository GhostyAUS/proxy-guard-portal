
FROM node:18-alpine

WORKDIR /app

# Add build argument for npm flags
ARG NPM_FLAGS="--legacy-peer-deps"

# Install nginx and other required packages
RUN apk add --no-cache nginx curl bash openssl

# Create directories for NGINX operations
RUN mkdir -p /etc/nginx
RUN mkdir -p /var/log/nginx
RUN mkdir -p /etc/nginx/certs
RUN touch /var/log/nginx/access.log /var/log/nginx/error.log
RUN chmod 666 /var/log/nginx/access.log /var/log/nginx/error.log

# Generate self-signed SSL certificates for HTTPS proxy
RUN openssl req -x509 -nodes -days 365 -newkey rsa:2048 \
    -keyout /etc/nginx/certs/server.key -out /etc/nginx/certs/server.crt \
    -subj "/C=US/ST=State/L=City/O=Organization/CN=localhost"

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

# Create server directory if it doesn't exist
RUN mkdir -p /app/server

# Copy server files
COPY ./src/server /app/server/

# Create the start.sh script with combined functionality
RUN echo '#!/bin/sh' > /app/start.sh && \
    echo 'echo "Starting services in single container mode..."' >> /app/start.sh && \
    echo 'echo "Current directory: $(pwd)"' >> /app/start.sh && \
    echo '' >> /app/start.sh && \
    echo '# Start the backend API server' >> /app/start.sh && \
    echo 'if [ -f "/app/server/index.cjs" ]; then' >> /app/start.sh && \
    echo '  echo "Starting API server from .cjs file..."' >> /app/start.sh && \
    echo '  node /app/server/index.cjs &' >> /app/start.sh && \
    echo '  API_PID=$!' >> /app/start.sh && \
    echo '  echo "API server started with PID: $API_PID"' >> /app/start.sh && \
    echo 'elif [ -f "/app/server/nginx-service.js" ]; then' >> /app/start.sh && \
    echo '  echo "Creating API server with nginx-service.js..."' >> /app/start.sh && \
    echo '  cat > /app/server/index.cjs << EOF' >> /app/start.sh && \
    echo 'const express = require("express");' >> /app/start.sh && \
    echo 'const nginxRouter = require("./nginx-service.js");' >> /app/start.sh && \
    echo 'const app = express();' >> /app/start.sh && \
    echo 'const PORT = process.env.API_PORT || 3001;' >> /app/start.sh && \
    echo '' >> /app/start.sh && \
    echo 'app.use(express.json());' >> /app/start.sh && \
    echo '' >> /app/start.sh && \
    echo '// Enable CORS' >> /app/start.sh && \
    echo 'app.use((req, res, next) => {' >> /app/start.sh && \
    echo '  res.header("Access-Control-Allow-Origin", "*");' >> /app/start.sh && \
    echo '  res.header("Access-Control-Allow-Methods", "GET, POST, PUT, DELETE, PATCH");' >> /app/start.sh && \
    echo '  res.header("Access-Control-Allow-Headers", "Origin, X-Requested-With, Content-Type, Accept, Authorization");' >> /app/start.sh && \
    echo '  next();' >> /app/start.sh && \
    echo '});' >> /app/start.sh && \
    echo '' >> /app/start.sh && \
    echo '// Basic health check endpoint' >> /app/start.sh && \
    echo 'app.get("/api/health", (req, res) => {' >> /app/start.sh && \
    echo '  console.log("Health check requested");' >> /app/start.sh && \
    echo '  res.json({ status: "ok", timestamp: new Date() });' >> /app/start.sh && \
    echo '});' >> /app/start.sh && \
    echo '' >> /app/start.sh && \
    echo '// Use nginx router' >> /app/start.sh && \
    echo 'app.use("/api", nginxRouter);' >> /app/start.sh && \
    echo '' >> /app/start.sh && \
    echo '// Enhanced logging middleware' >> /app/start.sh && \
    echo 'app.use((req, res, next) => {' >> /app/start.sh && \
    echo '  const timestamp = new Date().toISOString();' >> /app/start.sh && \
    echo '  console.log(`[${timestamp}] ${req.method} ${req.url}`);' >> /app/start.sh && \
    echo '  next();' >> /app/start.sh && \
    echo '});' >> /app/start.sh && \
    echo '' >> /app/start.sh && \
    echo '// Start server' >> /app/start.sh && \
    echo 'app.listen(PORT, () => {' >> /app/start.sh && \
    echo '  console.log(`API Server running on port ${PORT}`);' >> /app/start.sh && \
    echo '});' >> /app/start.sh && \
    echo 'EOF' >> /app/start.sh && \
    echo '  node /app/server/index.cjs &' >> /app/start.sh && \
    echo '  API_PID=$!' >> /app/start.sh && \
    echo '  echo "API server started with PID: $API_PID"' >> /app/start.sh && \
    echo 'else' >> /app/start.sh && \
    echo '  echo "No server file found. Creating minimal API service..."' >> /app/start.sh && \
    echo '  cat > /app/server/index.cjs << EOF' >> /app/start.sh && \
    echo 'const express = require("express");' >> /app/start.sh && \
    echo 'const app = express();' >> /app/start.sh && \
    echo 'const PORT = process.env.API_PORT || 3001;' >> /app/start.sh && \
    echo '' >> /app/start.sh && \
    echo 'app.use(express.json());' >> /app/start.sh && \
    echo '' >> /app/start.sh && \
    echo '// Enable CORS' >> /app/start.sh && \
    echo 'app.use((req, res, next) => {' >> /app/start.sh && \
    echo '  res.header("Access-Control-Allow-Origin", "*");' >> /app/start.sh && \
    echo '  res.header("Access-Control-Allow-Methods", "GET, POST, PUT, DELETE, PATCH");' >> /app/start.sh && \
    echo '  res.header("Access-Control-Allow-Headers", "Origin, X-Requested-With, Content-Type, Accept, Authorization");' >> /app/start.sh && \
    echo '  next();' >> /app/start.sh && \
    echo '});' >> /app/start.sh && \
    echo '' >> /app/start.sh && \
    echo '// Basic health check endpoint' >> /app/start.sh && \
    echo 'app.get("/api/health", (req, res) => {' >> /app/start.sh && \
    echo '  res.json({ status: "ok", timestamp: new Date() });' >> /app/start.sh && \
    echo '});' >> /app/start.sh && \
    echo '' >> /app/start.sh && \
    echo '// Start server' >> /app/start.sh && \
    echo 'app.listen(PORT, () => {' >> /app/start.sh && \
    echo '  console.log(`Minimal API Server running on port ${PORT}`);' >> /app/start.sh && \
    echo '});' >> /app/start.sh && \
    echo 'EOF' >> /app/start.sh && \
    echo '  node /app/server/index.cjs &' >> /app/start.sh && \
    echo '  API_PID=$!' >> /app/start.sh && \
    echo '  echo "Minimal API server started with PID: $API_PID"' >> /app/start.sh && \
    echo 'fi' >> /app/start.sh && \
    echo '' >> /app/start.sh && \
    echo '# Finally start the frontend' >> /app/start.sh && \
    echo 'echo "Starting frontend..."' >> /app/start.sh && \
    echo 'if [ -d "dist" ] && [ -f "dist/index.html" ]; then' >> /app/start.sh && \
    echo '  echo "Serving dist directory..."' >> /app/start.sh && \
    echo '  npx serve -s dist' >> /app/start.sh && \
    echo 'elif [ -f "index.html" ]; then' >> /app/start.sh && \
    echo '  echo "Serving current directory..."' >> /app/start.sh && \
    echo '  npx serve' >> /app/start.sh && \
    echo 'else' >> /app/start.sh && \
    echo '  echo "ERROR: Could not determine how to start the frontend. Keeping container alive for debugging..."' >> /app/start.sh && \
    echo '  tail -f /dev/null' >> /app/start.sh && \
    echo 'fi' >> /app/start.sh

# Make the script executable
RUN chmod +x /app/start.sh

# Expose necessary ports
EXPOSE 3001 8080 8443

# Set the entrypoint
ENTRYPOINT ["/bin/sh", "-c", "nginx && /app/start.sh"]
