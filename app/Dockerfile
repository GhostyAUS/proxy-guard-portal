
FROM node:18-alpine AS build

WORKDIR /app

# Add build argument for npm flags
ARG NPM_FLAGS=""

# Copy necessary files
COPY . .

# Debug what's in the directory
RUN echo "Current working directory contents:" && ls -la

# Install dependencies
RUN if [ -f "package.json" ]; then \
      echo "Found package.json, installing dependencies..." && \
      npm install $NPM_FLAGS; \
    else \
      echo "No package.json found in current directory, searching..." && \
      find / -name "package.json" -not -path "*/node_modules/*" -not -path "*/\.*" | head -n 5 && \
      echo "Error: package.json not found in expected location" && exit 1; \
    fi

# Install backend dependencies for NGINX operations
RUN npm install express bcrypt

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

# Copy built files from build stage
COPY --from=build /app/dist ./dist
COPY --from=build /app/node_modules ./node_modules
COPY --from=build /app/package.json ./
COPY --from=build /app/src/server ./server

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

# Create a startup script to run both frontend and backend
RUN echo '#!/bin/sh\n\
# Start the backend API server\n\
node server/index.js &\n\
\n\
# Start the frontend\n\
npm start\n'\
> /app/start.sh && chmod +x /app/start.sh

# Expose port
EXPOSE 3000
EXPOSE 3001

# Create server index file
RUN echo "const express = require('express');\n\
const app = express();\n\
const port = process.env.API_PORT || 3001;\n\
const nginxRoutes = require('./nginx-service');\n\
\n\
// Middleware\n\
app.use(express.json());\n\
\n\
// CORS\n\
app.use((req, res, next) => {\n\
  res.header('Access-Control-Allow-Origin', '*');\n\
  res.header('Access-Control-Allow-Headers', 'Origin, X-Requested-With, Content-Type, Accept');\n\
  next();\n\
});\n\
\n\
// Routes\n\
app.use(nginxRoutes);\n\
\n\
// Start server\n\
app.listen(port, () => {\n\
  console.log(`API server listening on port \${port}`);\n\
});" > /app/server/index.js

# Start application
CMD ["/app/start.sh"]
