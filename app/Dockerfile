
FROM node:18-alpine AS build

WORKDIR /app

# First, check if we're in the right directory structure
RUN echo "Current directory: $(pwd)" && ls -la

# Try to find package.json in current and parent directories
RUN find / -name "package.json" -type f | grep -v "node_modules" || echo "No package.json found in system"

# Copy all files to ensure we get package.json regardless of location
COPY . .
RUN echo "After copying, contents of /app:" && ls -la

# Look for package.json again
RUN if [ -f "package.json" ]; then \
    echo "package.json found in the WORKDIR" && cat package.json | head -5; \
  elif [ -f "../package.json" ]; then \
    echo "package.json found in parent directory" && cp ../package.json . && ls -la; \
  else \
    echo "Error: package.json not found anywhere" && exit 1; \
  fi

# Now that we've confirmed package.json exists, install dependencies
RUN npm install

# Build the application
RUN npm run build && echo "Build completed successfully" && ls -la dist || echo "Build failed or dist not created"

# Production stage
FROM node:18-alpine

WORKDIR /app

# Copy built files from build stage
COPY --from=build /app/dist ./dist
RUN if [ -d dist ]; then \
    echo "dist directory copied correctly" && ls -la dist; \
  else \
    echo "Error: dist directory not found" && exit 1; \
  fi

# Copy dependencies and package.json
COPY --from=build /app/node_modules ./node_modules
RUN if [ -d node_modules ]; then \
    echo "node_modules copied correctly" && ls -la node_modules | head; \
  else \
    echo "Error: node_modules directory not found" && exit 1; \
  fi

COPY --from=build /app/package.json ./
RUN if [ -f package.json ]; then \
    echo "package.json copied correctly" && cat package.json | grep -E 'name|version' ; \
  else \
    echo "Error: package.json not found" && exit 1; \
  fi

# Expose port
EXPOSE 3000

# Start application
CMD ["npm", "start"]
