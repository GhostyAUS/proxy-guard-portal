
/**
 * API Server for Proxy Guard
 */
const express = require('express');
const nginxRouter = require('./nginx-service.js');
const fs = require('fs');
const path = require('path');

const app = express();
const PORT = process.env.API_PORT || 3001;

// Enable JSON parsing
app.use(express.json());

// Enable CORS
app.use((req, res, next) => {
  res.header('Access-Control-Allow-Origin', '*');
  res.header('Access-Control-Allow-Methods', 'GET, POST, PUT, DELETE, PATCH');
  res.header('Access-Control-Allow-Headers', 'Origin, X-Requested-With, Content-Type, Accept, Authorization');
  next();
});

// Set Content-Type header for all responses
app.use((req, res, next) => {
  res.setHeader('Content-Type', 'application/json');
  next();
});

// API Router - All API routes should be under /api
app.use('/api', nginxRouter);

// Additional API endpoints
app.get('/api/health', (req, res) => {
  res.json({
    status: 'ok',
    timestamp: new Date().toISOString(),
    environment: {
      NGINX_CONFIG_PATH: process.env.NGINX_CONFIG_PATH,
      NODE_ENV: process.env.NODE_ENV,
      SINGLE_CONTAINER: process.env.SINGLE_CONTAINER
    }
  });
});

// Check file paths
app.get('/api/debug/paths', (req, res) => {
  const configPath = process.env.NGINX_CONFIG_PATH || '/etc/nginx/nginx.conf';
  const templatePath = process.env.NGINX_TEMPLATE_PATH || '/etc/nginx/nginx.conf.template';

  const result = {
    configPath,
    templatePath,
    configExists: false,
    configWritable: false,
    templateExists: false,
    templateWritable: false
  };

  try {
    result.configExists = fs.existsSync(configPath);
    result.templateExists = fs.existsSync(templatePath);

    if (result.configExists) {
      try {
        fs.accessSync(configPath, fs.constants.W_OK);
        result.configWritable = true;
      } catch (e) {
        result.configWritable = false;
      }
    }

    if (result.templateExists) {
      try {
        fs.accessSync(templatePath, fs.constants.W_OK);
        result.templateWritable = true;
      } catch (e) {
        result.templateWritable = false;
      }
    }
  } catch (e) {
    console.error('Error checking paths:', e);
  }

  res.json(result);
});

// Catch-all route handler for non-existent API endpoints
app.use('/api/*', (req, res) => {
  res.status(404).json({
    error: `Endpoint not found: ${req.originalUrl}`,
    available: 'Use /api/debug/routes to see available endpoints'
  });
});

// Global error handler
app.use((err, req, res, next) => {
  console.error('API Error:', err);
  res.status(500).json({
    error: 'Internal Server Error',
    message: err.message
  });
});

// Start the server
try {
  app.listen(PORT, () => {
    console.log(`API Server running on port ${PORT}`);
    console.log(`Server time: ${new Date().toISOString()}`);
    console.log('Server endpoints:');
    console.log('  - GET /api/health');
    console.log('  - GET /api/debug/paths');
    console.log('  - GET /api/debug/routes');
    console.log('  - GET /api/nginx/status');
  });
} catch (error) {
  console.error('Failed to start API server:', error);
  process.exit(1);
}
