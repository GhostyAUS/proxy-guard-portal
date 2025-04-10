
// Server file with CommonJS syntax
const express = require("express");
const app = express();
const PORT = process.env.API_PORT || 3001;
const nginxService = require("./nginx-service");

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

// Mount the NGINX service
app.use("/api", nginxService);

// Whitelist groups storage (in-memory for development)
const whitelistGroups = [
  {
    id: "group-1",
    name: "Default Group",
    description: "Default whitelist group",
    clients: [
      { id: "client-1", value: "192.168.0.0/16", description: "Local network" },
      { id: "client-2", value: "127.0.0.1", description: "Localhost" }
    ],
    destinations: [
      { id: "dest-1", value: "example.com", description: "Example site" },
      { id: "dest-2", value: "*.google.com", description: "Google domains" }
    ],
    enabled: true
  }
];

// Mock endpoint for whitelist groups
app.get("/api/whitelist-groups", (req, res) => {
  console.log("Whitelist groups requested - returning:", whitelistGroups);
  res.json({ groups: whitelistGroups });
});

// Create or update a whitelist group
app.post("/api/whitelist-groups", (req, res) => {
  const group = req.body;
  console.log("Received whitelist group update request:", group);
  
  if (!group || !group.id) {
    return res.status(400).json({ error: "Invalid whitelist group data" });
  }

  // Check if group exists to update it
  const existingIndex = whitelistGroups.findIndex(g => g.id === group.id);
  if (existingIndex >= 0) {
    whitelistGroups[existingIndex] = group;
    console.log("Updated existing whitelist group:", group.id);
  } else {
    whitelistGroups.push(group);
    console.log("Added new whitelist group:", group.id);
  }

  res.json({ success: true, group });
});

// Delete a whitelist group
app.delete("/api/whitelist-groups/:id", (req, res) => {
  const id = req.params.id;
  console.log("Received delete request for whitelist group:", id);
  
  const initialLength = whitelistGroups.length;
  const filteredGroups = whitelistGroups.filter(g => g.id !== id);
  
  if (filteredGroups.length < initialLength) {
    // Update the in-memory array
    whitelistGroups.length = 0;
    whitelistGroups.push(...filteredGroups);
    console.log("Deleted whitelist group:", id);
    res.json({ success: true });
  } else {
    console.log("Whitelist group not found:", id);
    res.status(404).json({ error: "Group not found" });
  }
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
    console.log("  - GET/POST /api/whitelist-groups");
    console.log("  - DELETE /api/whitelist-groups/:id");
    console.log("  - GET/POST /api/nginx/*");
  });
} catch (error) {
  console.error("Failed to start API server:", error);
  process.exit(1);
}
