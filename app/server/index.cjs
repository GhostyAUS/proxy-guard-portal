
// Server file with CommonJS syntax
const express = require("express");
const app = express();
const PORT = process.env.API_PORT || 3001;

app.use(express.json());

// Basic health check endpoint
app.get("/api/health", (req, res) => {
  console.log("Health check requested");
  res.json({ 
    status: "ok", 
    timestamp: new Date(),
    environment: process.env.NODE_ENV || 'development'
  });
});

// Enhanced logging middleware
app.use((req, res, next) => {
  const timestamp = new Date().toISOString();
  console.log(`[${timestamp}] ${req.method} ${req.url}`);
  
  // Add response logging
  const originalSend = res.send;
  res.send = function(body) {
    console.log(`[${timestamp}] Response status: ${res.statusCode}`);
    return originalSend.call(this, body);
  };
  
  next();
});

// Global error handler
app.use((err, req, res, next) => {
  console.error(`[ERROR] ${new Date().toISOString()}:`, err);
  res.status(500).json({ error: "Internal server error" });
});

// Start server with more extensive logging
try {
  app.listen(PORT, () => {
    console.log(`API Server running on port ${PORT}`);
    console.log(`Server environment: ${process.env.NODE_ENV || 'development'}`);
    console.log(`Server time: ${new Date().toISOString()}`);
    console.log("Server endpoints:");
    console.log("  - GET /api/health");
  });
} catch (error) {
  console.error("Failed to start API server:", error);
  process.exit(1);
}
