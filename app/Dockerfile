
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

# Copy server files from the app/server directory if they exist in the build context
COPY --from=build /app/app/server/index.js /app/server/ || echo "No custom server/index.js found, will create minimal version"

# Copy start script from app directory if it exists
COPY --from=build /app/app/start.sh /app/ || echo "No custom start.sh found, will create minimal version"

# Create a minimal server file if it doesn't exist
RUN if [ ! -f "/app/server/index.js" ]; then \
      echo "Creating minimal server/index.js file..." && \
      echo 'console.log("Creating minimal API server");' > /app/server/index.js && \
      echo 'const express = require("express");' >> /app/server/index.js && \
      echo 'const app = express();' >> /app/server/index.js && \
      echo 'const PORT = process.env.API_PORT || 3001;' >> /app/server/index.js && \
      echo '' >> /app/server/index.js && \
      echo 'app.use(express.json());' >> /app/server/index.js && \
      echo '' >> /app/server/index.js && \
      echo 'app.get("/api/health", (req, res) => {' >> /app/server/index.js && \
      echo '  res.json({ status: "ok", timestamp: new Date() });' >> /app/server/index.js && \
      echo '});' >> /app/server/index.js && \
      echo '' >> /app/server/index.js && \
      echo 'app.listen(PORT, () => {' >> /app/server/index.js && \
      echo '  console.log(`API Server running on port ${PORT}`);' >> /app/server/index.js && \
      echo '});' >> /app/server/index.js && \
      echo "Minimal server/index.js created successfully. Contents:" && \
      cat /app/server/index.js; \
    else \
      echo "Using existing server/index.js. Contents:" && \
      cat /app/server/index.js; \
    fi

# Create a minimal start script if it doesn't exist
RUN echo "Checking package.json for start script:" && \
    cat package.json | grep -A 10 "\"scripts\"" || echo "No scripts section found" && \
    if ! grep -q "\"start\":" package.json; then \
      echo "Adding start script to package.json" && \
      sed -i 's/"scripts": {/"scripts": {\n    "start": "vite preview --host 0.0.0.0 --port 3000",/' package.json || \
      (echo "Failed to add start script with sed, creating manually" && \
       if ! grep -q "\"scripts\"" package.json; then \
         echo "No scripts section found, creating one" && \
         sed -i 's/^{/{\n  "scripts": {\n    "start": "vite preview --host 0.0.0.0 --port 3000"\n  },/' package.json; \
       else \
         echo "Scripts section exists but no start script, adding one" && \
         sed -i '/"scripts": {/a \    "start": "vite preview --host 0.0.0.0 --port 3000",' package.json; \
       fi); \
    fi

# Make sure the start script is available and show final package.json
RUN echo "Final package.json content:" && cat package.json

# Create the start.sh script with better error handling if it doesn't exist
RUN if [ ! -f "/app/start.sh" ]; then \
      echo "Creating minimal start.sh file..." && \
      echo '#!/bin/sh' > /app/start.sh && \
      echo '' >> /app/start.sh && \
      echo '# Start the backend API server if it exists' >> /app/start.sh && \
      echo 'if [ -f "/app/server/index.js" ]; then' >> /app/start.sh && \
      echo '  echo "Starting API server..."' >> /app/start.sh && \
      echo '  node /app/server/index.js &' >> /app/start.sh && \
      echo 'else' >> /app/start.sh && \
      echo '  echo "WARNING: API server file not found, skipping backend startup"' >> /app/start.sh && \
      echo 'fi' >> /app/start.sh && \
      echo '' >> /app/start.sh && \
      echo '# Start the frontend' >> /app/start.sh && \
      echo 'echo "Starting frontend..."' >> /app/start.sh && \
      echo 'npm start' >> /app/start.sh && \
      echo "Minimal start.sh created successfully. Contents:" && \
      cat /app/start.sh; \
    else \
      echo "Using existing start.sh. Contents:" && \
      cat /app/start.sh; \
    fi

# Ensure the script exists and is executable
RUN chmod +x /app/start.sh
RUN ls -la /app/start.sh
RUN echo "Final check - start.sh exists and is executable:" && \
    if [ -x "/app/start.sh" ]; then echo "✅ start.sh is ready"; else echo "❌ start.sh issues detected"; exit 1; fi

# Final validation
RUN echo "Validating all required files exist:"
RUN test -f "/app/server/index.js" && echo "✅ server/index.js exists" || (echo "❌ server/index.js missing"; exit 1)
RUN test -f "/app/start.sh" && echo "✅ start.sh exists" || (echo "❌ start.sh missing"; exit 1)
RUN test -f "/app/package.json" && echo "✅ package.json exists" || (echo "❌ package.json missing"; exit 1)

# Expose port
EXPOSE 3000
EXPOSE 3001

# Start application
CMD ["/bin/sh", "/app/start.sh"]
