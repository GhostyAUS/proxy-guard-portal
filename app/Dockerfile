
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

# Check if server directory exists in the source and copy it if it does
COPY --from=build /app/src/server ./server 2>/dev/null || echo "Server directory not found, creating minimal server"

# Create a minimal server file if it doesn't exist
RUN mkdir -p /app/server
RUN if [ ! -f "/app/server/index.js" ]; then \
    printf 'console.log("Creating minimal API server");\n\
const express = require("express");\n\
const app = express();\n\
const PORT = process.env.API_PORT || 3001;\n\
\n\
app.use(express.json());\n\
\n\
app.get("/api/health", (req, res) => {\n\
  res.json({ status: "ok", timestamp: new Date() });\n\
});\n\
\n\
app.listen(PORT, () => {\n\
  console.log(`API Server running on port ${PORT}`);\n\
});\n' > /app/server/index.js; \
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

# Create the start.sh script with better error handling
RUN printf '#!/bin/sh\n\
\n\
# Start the backend API server if it exists\n\
if [ -f "/app/server/index.js" ]; then\n\
  echo "Starting API server..."\n\
  node /app/server/index.js &\n\
else\n\
  echo "WARNING: API server file not found, skipping backend startup"\n\
fi\n\
\n\
# Start the frontend\n\
echo "Starting frontend..."\n\
npm start\n' > /app/start.sh

# Ensure the script exists and is executable
RUN chmod +x /app/start.sh
RUN ls -la /app/start.sh

# Expose port
EXPOSE 3000
EXPOSE 3001

# Start application
CMD ["/bin/sh", "/app/start.sh"]
