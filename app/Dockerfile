
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

# Write server file with CommonJS extension
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

# Copy the start script
COPY start.sh /app/start.sh
RUN chmod +x /app/start.sh

# Set the entrypoint
ENTRYPOINT ["/app/start.sh"]
