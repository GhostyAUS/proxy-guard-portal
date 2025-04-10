
// Server file with CommonJS syntax
const express = require("express");
const app = express();
const PORT = process.env.API_PORT || 3001;
const path = require('path');
const fs = require('fs');
const nginxService = require("./nginx-service");

app.use(express.json());

// Enhanced logging middleware with request body logging
app.use((req, res, next) => {
  const timestamp = new Date().toISOString();
  console.log(`[${timestamp}] ${req.method} ${req.url}`);
  
  // Log request body for POST/PUT requests
  if (['POST', 'PUT'].includes(req.method) && req.body) {
    console.log(`[${timestamp}] Request body:`, JSON.stringify(req.body, null, 2));
  }
  
  // Enhanced response logging
  const originalSend = res.send;
  res.send = function(body) {
    console.log(`[${timestamp}] Response status: ${res.statusCode}`);
    
    // Log response body for easier debugging
    try {
      if (body && typeof body === 'string') {
        const parsedBody = JSON.parse(body);
        console.log(`[${timestamp}] Response body:`, JSON.stringify(parsedBody, null, 2));
      }
    } catch (e) {
      // If not JSON, log a snippet
      console.log(`[${timestamp}] Response body (start): ${typeof body === 'string' ? body.substring(0, 100) : 'non-string response'}`);
    }
    
    return originalSend.call(this, body);
  };
  
  // Enable CORS for development
  res.header('Access-Control-Allow-Origin', '*');
  res.header('Access-Control-Allow-Headers', 'Origin, X-Requested-With, Content-Type, Accept');
  res.header('Access-Control-Allow-Methods', 'GET, POST, PUT, DELETE, OPTIONS, PATCH');
  if (req.method === 'OPTIONS') {
    return res.sendStatus(200);
  }
  
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

// Debug endpoint to list all registered routes
app.get("/api/debug/routes", (req, res) => {
  const routes = [];
  
  app._router.stack.forEach((middleware) => {
    if (middleware.route) {
      // Routes registered directly on the app
      routes.push({
        path: middleware.route.path,
        methods: Object.keys(middleware.route.methods).join(', ')
      });
    } else if (middleware.name === 'router') {
      // Routes registered on a router
      middleware.handle.stack.forEach((handler) => {
        if (handler.route) {
          routes.push({
            path: handler.route.path,
            methods: Object.keys(handler.route.methods).join(', ')
          });
        }
      });
    }
  });
  
  res.json({
    routes,
    totalRoutes: routes.length
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
  
  // Set proper content-type header to ensure browser doesn't interpret as HTML
  res.setHeader('Content-Type', 'application/json');
  
  // Log the structure of what we're returning
  console.log("Response structure:", JSON.stringify({
    groups: whitelistGroups.map(g => ({ id: g.id, name: g.name }))
  }, null, 2));
  
  // IMPORTANT: Return proper JSON structure with groups array
  res.json({ groups: whitelistGroups });
});

// Function to update Nginx configuration based on whitelist groups
const updateNginxConfig = () => {
  try {
    // Generate NGINX config from whitelist groups
    const nginxConfigTemplate = fs.readFileSync('/etc/nginx/nginx.conf.template', 'utf8');
    console.log("Read nginx template file, generating configuration...");
    
    // Create a single whitelist configuration block
    let whitelistConfig = "";
    
    // For each enabled group
    whitelistGroups.filter(g => g.enabled).forEach(group => {
      // Add a comment for the group
      whitelistConfig += `\n# Group: ${group.name}\n`;
      
      // For each client IP in the group
      group.clients.forEach(client => {
        // For each destination in the group
        group.destinations.forEach(dest => {
          // Create an if block that checks both the client IP and host
          whitelistConfig += `if ($remote_addr = ${client.value} && $http_host ~ "${dest.value}") {\n`;
          whitelistConfig += `    set $allow_access 1;\n`;
          whitelistConfig += `}\n\n`;
        });
      });
    });
    
    // If no whitelist configs were generated, add a comment
    if (whitelistConfig.trim() === "") {
      whitelistConfig = "\n# No whitelist groups enabled\n";
    }
    
    // Replace placeholder in the template with our generated config
    let config = nginxConfigTemplate;
    config = config.replace('# PLACEHOLDER:WHITELIST_CONFIG', whitelistConfig);
    
    console.log("Generated NGINX config with:");
    console.log(`- ${whitelistGroups.filter(g => g.enabled).length} enabled groups`);
    
    // Log the first few lines of the generated config for debugging
    const configLines = config.split('\n');
    console.log("First 20 lines of generated config:");
    configLines.slice(0, 20).forEach((line, i) => console.log(`Line ${i+1}: ${line}`));
    
    return config;
  } catch (err) {
    console.error("Error preparing nginx config:", err);
    throw err;
  }
};

app.post("/api/whitelist-groups", (req, res) => {
  const group = req.body;
  console.log("Received whitelist group update request:", group.id, group.name);
  console.log("Group details:", JSON.stringify(group, null, 2));
  
  if (!group || !group.id) {
    console.error("Invalid whitelist group data received:", group);
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
    const config = updateNginxConfig();
    
    try {
      // Write the config to a file
      const configPath = '/etc/nginx/nginx.conf';
      fs.writeFileSync(configPath, config);
      console.log("NGINX configuration successfully written to:", configPath);
      
      // Reload nginx
      const { exec } = require('child_process');
      exec('nginx -s reload', (error, stdout, stderr) => {
        if (error) {
          console.error("Error reloading NGINX:", error);
          console.error("STDERR:", stderr);
          
          // Still return success for the group save, but indicate the NGINX config wasn't reloaded
          res.json({ success: true, group, nginxReloaded: false, error: String(error) });
        } else {
          console.log("NGINX service successfully reloaded");
          console.log("STDOUT:", stdout);
          
          // Let the frontend know the update was successful
          res.json({ success: true, group, nginxReloaded: true });
        }
      });
    } catch (configError) {
      console.error("Error updating/reloading NGINX:", configError);
      // Still return success for the group save, but indicate the NGINX config wasn't updated
      res.json({ success: true, group, nginxUpdated: false, error: String(configError) });
    }
  } catch (err) {
    console.error("Error preparing nginx config:", err);
    // Still return success for the group save
    res.json({ success: true, group, nginxUpdated: false, error: String(err) });
  }
});

// Delete a whitelist group
app.delete("/api/whitelist-groups/:id", (req, res) => {
  const id = req.params.id;
  console.log("Received delete request for whitelist group:", id);
  
  const initialLength = whitelistGroups.length;
  const groupToDelete = whitelistGroups.find(g => g.id === id);
  
  if (!groupToDelete) {
    console.error(`Group not found: ${id}`);
    return res.status(404).json({ error: "Group not found", success: false });
  }
  
  console.log(`Found group to delete: ${groupToDelete.name} (${groupToDelete.id})`);
  
  // Remove the group from the array
  const filteredGroups = whitelistGroups.filter(g => g.id !== id);
  const deletedCount = initialLength - filteredGroups.length;
  
  if (deletedCount > 0) {
    // Update the in-memory array
    whitelistGroups.length = 0;
    whitelistGroups.push(...filteredGroups);
    console.log("Deleted whitelist group:", id, "New count:", whitelistGroups.length);
    
    // Update nginx config
    try {
      // Generate NGINX config from whitelist groups
      const config = updateNginxConfig();
      
      try {
        // Write the config to a file
        const configPath = '/etc/nginx/nginx.conf';
        fs.writeFileSync(configPath, config);
        console.log("NGINX configuration successfully written to:", configPath);
        
        // Reload nginx
        const { exec } = require('child_process');
        exec('nginx -s reload', (error, stdout, stderr) => {
          if (error) {
            console.error("Error reloading NGINX after deletion:", error);
            console.error("STDERR:", stderr);
            
            // Still return success for the group deletion
            res.json({ success: true, nginxReloaded: false, error: String(error) });
          } else {
            console.log("NGINX service successfully reloaded after deletion");
            console.log("STDOUT:", stdout);
            
            res.json({ success: true });
          }
        });
      } catch (configError) {
        console.error("Error updating/reloading NGINX after deletion:", configError);
        // Still return success for the group deletion
        res.json({ success: true, nginxUpdated: false, error: String(configError) });
      }
    } catch (err) {
      console.error("Error preparing nginx config after deletion:", err);
      // Still return success for the group deletion
      res.json({ success: true, nginxUpdated: false, error: String(err) });
    }
  } else {
    console.log("Whitelist group not found for deletion:", id);
    res.status(404).json({ error: "Group not found", success: false });
  }
});

// New endpoint for toggling group enabled status
app.patch("/api/whitelist-groups/:id/toggle", (req, res) => {
  const id = req.params.id;
  console.log("Received toggle request for whitelist group:", id);
  
  const groupIndex = whitelistGroups.findIndex(g => g.id === id);
  
  if (groupIndex === -1) {
    console.error(`Group not found for toggle: ${id}`);
    return res.status(404).json({ error: "Group not found", success: false });
  }
  
  // Toggle the enabled status
  whitelistGroups[groupIndex].enabled = !whitelistGroups[groupIndex].enabled;
  const updatedGroup = whitelistGroups[groupIndex];
  
  console.log(`Toggled group ${updatedGroup.name} (${id}) to ${updatedGroup.enabled ? 'enabled' : 'disabled'}`);
  
  // Update nginx config
  try {
    // Generate NGINX config from whitelist groups
    const config = updateNginxConfig();
    
    try {
      // Write the config to a file
      const configPath = '/etc/nginx/nginx.conf';
      fs.writeFileSync(configPath, config);
      console.log("NGINX configuration successfully written to:", configPath);
      
      // Reload nginx
      const { exec } = require('child_process');
      exec('nginx -s reload', (error, stdout, stderr) => {
        if (error) {
          console.error("Error reloading NGINX after toggle:", error);
          console.error("STDERR:", stderr);
          
          // Still return success for the toggle
          res.json({ success: true, group: updatedGroup, nginxReloaded: false, error: String(error) });
        } else {
          console.log("NGINX service successfully reloaded after toggle");
          console.log("STDOUT:", stdout);
          
          res.json({ success: true, group: updatedGroup });
        }
      });
    } catch (configError) {
      console.error("Error updating/reloading NGINX after toggle:", configError);
      // Still return success for the toggle
      res.json({ success: true, group: updatedGroup, nginxUpdated: false, error: String(configError) });
    }
  } catch (err) {
    console.error("Error preparing nginx config after toggle:", err);
    // Still return success for the toggle
    res.json({ success: true, group: updatedGroup, nginxUpdated: false, error: String(err) });
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

// Global error handler with enhanced logging
app.use((err, req, res, next) => {
  console.error(`[ERROR] ${new Date().toISOString()}:`, err);
  console.error("Stack trace:", err.stack);
  
  // Ensure we always return JSON for API routes
  if (req.url.startsWith('/api/')) {
    res.setHeader('Content-Type', 'application/json');
  }
  
  res.status(500).json({ error: "Internal server error", message: err.message });
});

// Start server with more extensive logging
try {
  app.listen(PORT, () => {
    console.log(`API Server running on port ${PORT}`);
    console.log(`Server environment: ${process.env.NODE_ENV || 'development'}`);
    console.log(`Server time: ${new Date().toISOString()}`);
    console.log("Server endpoints:");
    console.log("  - GET /api/health");
    console.log("  - GET /api/whitelist-groups");
    console.log("  - POST /api/whitelist-groups (create/update)");
    console.log("  - DELETE /api/whitelist-groups/:id");
    console.log("  - PATCH /api/whitelist-groups/:id/toggle");
    console.log("  - Various /api/nginx/* endpoints");
    console.log("  - GET /api/debug/routes (lists all registered routes)");
    console.log("Current whitelist groups:", whitelistGroups?.length || 0);
  });
} catch (error) {
  console.error("Failed to start API server:", error);
  process.exit(1);
}
