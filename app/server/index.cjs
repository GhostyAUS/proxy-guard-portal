
// Server file with CommonJS syntax
const express = require("express");
const app = express();
const PORT = process.env.API_PORT || 3001;
const nginxService = require("./nginx-service");
const path = require('path');
const fs = require('fs');

app.use(express.json());

// Enable CORS for development
app.use((req, res, next) => {
  res.header('Access-Control-Allow-Origin', '*');
  res.header('Access-Control-Allow-Headers', 'Origin, X-Requested-With, Content-Type, Accept');
  res.header('Access-Control-Allow-Methods', 'GET, POST, PUT, DELETE, OPTIONS');
  if (req.method === 'OPTIONS') {
    return res.sendStatus(200);
  }
  next();
});

// Enhanced logging middleware (place before routes)
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

// Basic health check endpoint
app.get("/api/health", (req, res) => {
  console.log("Health check requested");
  res.json({ 
    status: "ok", 
    timestamp: new Date(),
    environment: process.env.NODE_ENV || 'development'
  });
});

// Forward API routes to nginx service
app.use("/api/nginx", nginxService);

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
  },
  {
    id: "group-2",
    name: "Development Team",
    description: "Access for development team",
    clients: [
      { id: "client-3", value: "10.0.0.0/8", description: "Dev network" }
    ],
    destinations: [
      { id: "dest-3", value: "*.github.com", description: "GitHub access" },
      { id: "dest-4", value: "npmjs.com", description: "NPM registry" }
    ],
    enabled: true
  },
  {
    id: "group-3",
    name: "Guest Access",
    description: "Limited access for guests",
    clients: [
      { id: "client-5", value: "172.16.0.0/12", description: "Guest network" }
    ],
    destinations: [
      { id: "dest-5", value: "docs.example.org", description: "Documentation" }
    ],
    enabled: false
  }
];

// GET endpoint for whitelist groups
app.get("/api/whitelist-groups", (req, res) => {
  console.log("Whitelist groups requested - returning:", whitelistGroups.length, "groups");
  res.json({ groups: whitelistGroups });
});

// Create or update a whitelist group
app.post("/api/whitelist-groups", (req, res) => {
  const group = req.body;
  console.log("Received whitelist group update request:", group.id, group.name);
  
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

  // Update nginx config whenever a whitelist group is created or updated
  try {
    // Generate NGINX config from whitelist groups
    const nginxConfigTemplate = fs.readFileSync(path.join(__dirname, '../../nginx/nginx.conf.template'), 'utf8');
    
    // Simple implementation of generateNginxConfig
    const mapBlocks = whitelistGroups.filter(g => g.enabled).map(group => {
      // Generate the client IPs map
      const clientIpsMap = group.clients.map(client => 
        `    ${client.value} 1;`
      ).join('\n');
      
      // Generate the destinations map
      const destinationsMap = group.destinations.map(dest => 
        `    ${dest.value} 1;`
      ).join('\n');
      
      return `
# Group: ${group.name}
map $remote_addr $client_${group.id} {
    default 0;
${clientIpsMap}
}

map $http_host $dest_${group.id} {
    default 0;
${destinationsMap}
}
`;
    }).join('\n');
    
    // Generate the access condition for the server block
    const accessConditions = whitelistGroups.filter(g => g.enabled).map(group => 
      `        if ($client_${group.id} = 1 && $dest_${group.id} = 1) { set $allow_access 1; }`
    ).join('\n');
    
    // Replace placeholders in the template
    let config = nginxConfigTemplate;
    config = config.replace('# PLACEHOLDER:MAP_BLOCKS', mapBlocks);
    config = config.replace('# PLACEHOLDER:ACCESS_CONDITIONS', accessConditions);
    
    // For development - log generated config
    console.log("Generated NGINX config with access conditions:", accessConditions.length > 0 ? "Yes" : "No");
    
    try {
      // Simulate updating nginx config
      // In a real implementation, this would write the config to the appropriate location
      console.log("NGINX configuration would be updated");
      // Here we would call the actual nginx service, but for now we're just simulating it
      
      // Simulate reloading nginx
      console.log("NGINX service would be reloaded to apply new configuration");
      
      // Let the frontend know the update was successful
      res.json({ success: true, group });
    } catch (configError) {
      console.error("Error updating NGINX config:", configError);
      // Still return success for the group save, but indicate the NGINX config wasn't updated
      res.json({ success: true, group, nginxUpdated: false });
    }
  } catch (err) {
    console.error("Error preparing nginx config:", err);
    // Still return success for the group save
    res.json({ success: true, group, nginxUpdated: false });
  }
});

// Delete a whitelist group
app.delete("/api/whitelist-groups/:id", (req, res) => {
  const id = req.params.id;
  console.log("Received delete request for whitelist group:", id);
  
  const initialLength = whitelistGroups.length;
  const groupToDelete = whitelistGroups.find(g => g.id === id);
  const filteredGroups = whitelistGroups.filter(g => g.id !== id);
  
  if (filteredGroups.length < initialLength) {
    // Update the in-memory array
    whitelistGroups.length = 0;
    whitelistGroups.push(...filteredGroups);
    console.log("Deleted whitelist group:", id, "New count:", whitelistGroups.length);
    
    // Update nginx config
    try {
      // Generate NGINX config from whitelist groups (similar to above)
      const nginxConfigTemplate = fs.readFileSync(path.join(__dirname, '../../nginx/nginx.conf.template'), 'utf8');
      
      // Simple implementation of generateNginxConfig
      const mapBlocks = whitelistGroups.filter(g => g.enabled).map(group => {
        // Generate the client IPs map
        const clientIpsMap = group.clients.map(client => 
          `    ${client.value} 1;`
        ).join('\n');
        
        // Generate the destinations map
        const destinationsMap = group.destinations.map(dest => 
          `    ${dest.value} 1;`
        ).join('\n');
        
        return `
# Group: ${group.name}
map $remote_addr $client_${group.id} {
    default 0;
${clientIpsMap}
}

map $http_host $dest_${group.id} {
    default 0;
${destinationsMap}
}
`;
      }).join('\n');
      
      // Generate the access condition for the server block
      const accessConditions = whitelistGroups.filter(g => g.enabled).map(group => 
        `        if ($client_${group.id} = 1 && $dest_${group.id} = 1) { set $allow_access 1; }`
      ).join('\n');
      
      // Replace placeholders in the template
      let config = nginxConfigTemplate;
      config = config.replace('# PLACEHOLDER:MAP_BLOCKS', mapBlocks);
      config = config.replace('# PLACEHOLDER:ACCESS_CONDITIONS', accessConditions);
      
      // For development - log generated config
      console.log("Generated NGINX config after deletion with access conditions:", accessConditions.length > 0 ? "Yes" : "No");
      
      try {
        // Simulate updating nginx config
        console.log("NGINX configuration would be updated after group deletion");
        
        // Simulate reloading nginx
        console.log("NGINX service would be reloaded to apply new configuration");
        
        res.json({ success: true });
      } catch (configError) {
        console.error("Error updating NGINX config after deletion:", configError);
        // Still return success for the group deletion
        res.json({ success: true, nginxUpdated: false });
      }
    } catch (err) {
      console.error("Error preparing nginx config after deletion:", err);
      // Still return success for the group deletion
      res.json({ success: true, nginxUpdated: false });
    }
  } else {
    console.log("Whitelist group not found:", id);
    res.status(404).json({ error: "Group not found" });
  }
});

// Serve static files from the dist directory for frontend
const distPath = path.join(__dirname, '..', 'dist');
if (fs.existsSync(distPath)) {
  console.log(`Serving static files from ${distPath}`);
  app.use(express.static(distPath));

  // For SPA routing - always serve index.html for non-API routes
  app.get('*', function(req, res, next) {
    if (req.url.startsWith('/api/')) {
      return next();
    }
    res.sendFile(path.join(distPath, 'index.html'));
  });
}

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
