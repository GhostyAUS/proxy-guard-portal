
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

# Write simple server file directly without complex quoting
RUN echo 'console.log("Starting API server");' > /app/server/index.js
RUN echo 'const express = require("express");' >> /app/server/index.js
RUN echo 'const app = express();' >> /app/server/index.js
RUN echo 'const PORT = process.env.API_PORT || 3001;' >> /app/server/index.js
RUN echo '' >> /app/server/index.js
RUN echo 'app.use(express.json());' >> /app/server/index.js
RUN echo '' >> /app/server/index.js
RUN echo 'app.get("/api/health", (req, res) => {' >> /app/server/index.js
RUN echo '  res.json({ status: "ok", timestamp: new Date() });' >> /app/server/index.js
RUN echo '});' >> /app/server/index.js
RUN echo '' >> /app/server/index.js
RUN echo 'app.use((req, res, next) => {' >> /app/server/index.js
RUN echo '  console.log(`[${new Date().toISOString()}] ${req.method} ${req.url}`);' >> /app/server/index.js
RUN echo '  next();' >> /app/server/index.js
RUN echo '});' >> /app/server/index.js
RUN echo '' >> /app/server/index.js
RUN echo 'app.listen(PORT, () => {' >> /app/server/index.js
RUN echo '  console.log(`API Server running on port ${PORT}`);' >> /app/server/index.js
RUN echo '});' >> /app/server/index.js

# Write simple start script
RUN echo '#!/bin/sh' > /app/start.sh
RUN echo '' >> /app/start.sh
RUN echo 'echo "Starting services..."' >> /app/start.sh
RUN echo '' >> /app/start.sh
RUN echo 'if [ -f "/app/server/index.js" ]; then' >> /app/start.sh
RUN echo '  echo "Starting API server..."' >> /app/start.sh
RUN echo '  node /app/server/index.js &' >> /app/start.sh
RUN echo '  API_PID=$!' >> /app/start.sh
RUN echo '  echo "API server started with PID: $API_PID"' >> /app/start.sh
RUN echo 'else' >> /app/start.sh
RUN echo '  echo "WARNING: API server file not found, skipping backend startup"' >> /app/start.sh
RUN echo 'fi' >> /app/start.sh
RUN echo '' >> /app/start.sh
RUN echo '# Start the frontend' >> /app/start.sh
RUN echo 'echo "Starting frontend..."' >> /app/start.sh
RUN echo 'npm start' >> /app/start.sh

# Ensure the script exists and is executable
RUN chmod +x /app/start.sh
RUN ls -la /app/start.sh

# Validate files exist
RUN echo "Validating required files exist:"
RUN test -f "/app/server/index.js" && echo "✅ server/index.js exists" || (echo "❌ server/index.js missing"; exit 1)
RUN test -f "/app/start.sh" && echo "✅ start.sh exists" || (echo "❌ start.sh missing"; exit 1)
RUN test -f "/app/package.json" && echo "✅ package.json exists" || (echo "❌ package.json missing"; exit 1)

# Expose port
EXPOSE 3000
EXPOSE 3001

# Start application
CMD ["/bin/sh", "/app/start.sh"]
