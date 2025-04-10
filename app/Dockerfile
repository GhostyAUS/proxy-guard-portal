
FROM node:18-alpine

WORKDIR /app

# Add build argument for npm flags
ARG NPM_FLAGS="--legacy-peer-deps"

# Install nginx and other required packages
RUN apk add --no-cache nginx curl bash openssl sudo

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

# Copy nginx config template
COPY nginx/nginx.conf.template /app/nginx/nginx.conf.template

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
RUN npm install express bcrypt readline fs-extra --legacy-peer-deps

# Build the application (if there's a build script)
RUN if grep -q "\"build\":" package.json; then \
      echo "Building application..." && \
      npm run build; \
    else \
      echo "No build script found in package.json, skipping build step"; \
    fi

# Create server directory if it doesn't exist and copy server files
RUN mkdir -p /app/server
COPY ./src/server/index.cjs /app/server/
COPY ./src/server/nginx-service.cjs /app/server/

# Create the setup permissions script
COPY app/setup-permissions.sh /app/setup-permissions.sh
RUN chmod +x /app/setup-permissions.sh

# Create start.sh for process management
COPY app/start.sh /app/start.sh
RUN chmod +x /app/start.sh

# Create api-server directory for shell-based API
RUN mkdir -p /app/api-server

# Expose necessary ports
EXPOSE 3001 8080 8443

# Set the entrypoint
ENTRYPOINT ["/bin/sh", "-c", "/app/setup-permissions.sh && nginx && /app/start.sh"]
