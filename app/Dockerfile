
FROM node:18-alpine AS build

WORKDIR /app

# Copy package files and verify they exist
COPY package*.json ./
RUN ls -la && \
    if [ ! -f package.json ]; then \
      echo "Error: package.json not found" && exit 1; \
    fi && \
    npm install

# Copy the rest of the project files and verify
COPY . .
RUN ls -la && \
    if [ ! -f package.json ]; then \
      echo "Error: package.json still not found after full copy" && exit 1; \
    fi

# Build the application
RUN npm run build

# Production stage
FROM node:18-alpine

WORKDIR /app

# Copy built files from build stage
COPY --from=build /app/dist ./dist
RUN if [ ! -d dist ]; then echo "Error: dist directory not copied correctly"; exit 1; fi

COPY --from=build /app/node_modules ./node_modules
RUN if [ ! -d node_modules ]; then echo "Error: node_modules directory not copied correctly"; exit 1; fi

COPY --from=build /app/package.json ./
RUN if [ ! -f package.json ]; then echo "Error: package.json not copied correctly"; exit 1; fi

# Expose port
EXPOSE 3000

# Start application
CMD ["npm", "start"]
