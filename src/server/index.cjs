
/**
 * Streamlined API Server for Proxy Guard
 * Focused on essential Nginx management functions
 */
const express = require('express');
const fs = require('fs');
const path = require('path');
const { exec } = require('child_process');

const app = express();
const PORT = process.env.API_PORT || 3001;

// Configure middleware
app.use(express.json());

// Enable CORS
app.use((req, res, next) => {
  res.header('Access-Control-Allow-Origin', '*');
  res.header('Access-Control-Allow-Methods', 'GET, POST, PUT, DELETE, PATCH');
  res.header('Access-Control-Allow-Headers', 'Origin, X-Requested-With, Content-Type, Accept, Authorization');
  next();
});

// Set Content-Type header for API responses
app.use('/api', (req, res, next) => {
  res.setHeader('Content-Type', 'application/json');
  next();
});

// Helper function to execute shell commands
const execPromise = (command) => {
  return new Promise((resolve, reject) => {
    exec(command, (error, stdout, stderr) => {
      if (error) {
        reject({ error, stderr });
      } else {
        resolve({ stdout, stderr });
      }
    });
  });
};

// Basic health check endpoint
app.get('/api/health', (req, res) => {
  res.json({
    status: 'ok',
    timestamp: new Date().toISOString(),
    environment: {
      NGINX_CONFIG_PATH: process.env.NGINX_CONFIG_PATH || '/etc/nginx/nginx.conf',
      NODE_ENV: process.env.NODE_ENV,
      SINGLE_CONTAINER: process.env.SINGLE_CONTAINER
    }
  });
});

// NGINX STATUS ENDPOINTS

// Get NGINX status
app.get('/api/nginx/status', async (req, res) => {
  try {
    console.log('Getting nginx status');
    
    // Check if nginx is running
    let isRunning = false;
    try {
      const { stdout } = await execPromise('pgrep nginx || echo "not running"');
      isRunning = !stdout.includes("not running");
      console.log(`Nginx running status: ${isRunning}`);
    } catch (e) {
      console.error('Error checking nginx status:', e);
      isRunning = false;
    }

    // Get last modification time of config file
    const configPath = process.env.NGINX_CONFIG_PATH || '/etc/nginx/nginx.conf';
    console.log(`Checking nginx config at path: ${configPath}`);
    
    let lastModified = new Date();
    let configExists = false;
    
    try {
      if (fs.existsSync(configPath)) {
        configExists = true;
        const stats = fs.statSync(configPath);
        lastModified = stats.mtime;
        console.log(`Config exists, last modified: ${lastModified}`);
      } else {
        console.log(`Config file does not exist at: ${configPath}`);
      }
    } catch (err) {
      console.error(`Error checking config file: ${err.message}`);
    }

    // Test if config is valid
    let configValid = false;
    let configMessage = 'Configuration not tested';
    try {
      if (configExists) {
        const { stdout, stderr } = await execPromise('nginx -t 2>&1');
        const output = stdout + stderr;
        configValid = output.includes('syntax is ok') && output.includes('test is successful');
        configMessage = configValid ? 'Configuration test successful' : 'Configuration test failed';
        console.log('Nginx config test result:', configValid ? 'Valid' : 'Invalid');
      }
    } catch (e) {
      console.log('Nginx config test error:', e.stderr || e.message);
      configValid = false;
      configMessage = e.stderr || 'Configuration test failed';
    }

    // Check if config is writable
    let configWritable = false;
    try {
      if (configExists) {
        fs.accessSync(configPath, fs.constants.W_OK);
        configWritable = true;
        console.log('Nginx config is writable');
      } else {
        const configDir = path.dirname(configPath);
        if (fs.existsSync(configDir)) {
          fs.accessSync(configDir, fs.constants.W_OK);
          configWritable = true;
          console.log('Nginx config directory is writable');
        }
      }
    } catch (err) {
      console.error(`Config is not writable: ${err.message}`);
      configWritable = false;
    }

    res.json({
      isRunning,
      lastModified: lastModified.toISOString(),
      lastConfigTest: {
        success: configValid,
        message: configMessage
      },
      configWritable,
      configExists
    });
  } catch (error) {
    console.error('Error getting nginx status:', error);
    res.status(500).json({ error: error.message });
  }
});

// Get current NGINX configuration
app.get('/api/nginx/config', (req, res) => {
  try {
    const configPath = process.env.NGINX_CONFIG_PATH || '/etc/nginx/nginx.conf';
    console.log(`Reading nginx config from: ${configPath}`);
    
    if (!fs.existsSync(configPath)) {
      console.log(`Config file doesn't exist, checking template`);
      const templatePath = process.env.NGINX_TEMPLATE_PATH || '/etc/nginx/nginx.conf.template';
      
      if (fs.existsSync(templatePath)) {
        console.log(`Using template file instead`);
        const config = fs.readFileSync(templatePath, 'utf8');
        return res.json({ config, isTemplate: true });
      }
      
      return res.status(404).json({ error: 'Configuration file not found' });
    }
    
    const config = fs.readFileSync(configPath, 'utf8');
    console.log(`Successfully read config file, length: ${config.length}`);
    res.json({ config });
  } catch (error) {
    console.error('Error reading nginx config:', error);
    res.status(500).json({ error: error.message });
  }
});

// Save NGINX config
app.post('/api/nginx/save', async (req, res) => {
  try {
    const { config } = req.body;
    const configPath = req.body.configPath || process.env.NGINX_CONFIG_PATH || '/etc/nginx/nginx.conf';
    
    console.log(`Saving NGINX config to ${configPath}, length: ${config?.length || 0}`);
    
    // Create backup of existing config
    if (fs.existsSync(configPath)) {
      const backupPath = `${configPath}.bak-${Date.now()}`;
      fs.copyFileSync(configPath, backupPath);
      console.log(`Created backup at ${backupPath}`);
    }
    
    // Ensure directory exists
    const configDir = path.dirname(configPath);
    if (!fs.existsSync(configDir)) {
      fs.mkdirSync(configDir, { recursive: true });
      console.log(`Created directory ${configDir}`);
    }
    
    // Write new config
    fs.writeFileSync(configPath, config);
    console.log('NGINX config saved successfully');
    
    res.json({ success: true });
  } catch (error) {
    console.error('Error saving nginx config:', error);
    res.status(500).json({ success: false, error: error.message });
  }
});

// Validate NGINX config syntax
app.post('/api/nginx/validate', async (req, res) => {
  try {
    const { config } = req.body;
    
    console.log(`Validating nginx config, length: ${config?.length || 0}`);
    
    // Write config to a temp file
    const tempFile = `/tmp/nginx-test-${Date.now()}.conf`;
    fs.writeFileSync(tempFile, config);
    console.log(`Wrote config to temp file: ${tempFile}`);
    
    // Test the configuration with nginx -t
    try {
      const { stdout, stderr } = await execPromise(`nginx -c ${tempFile} -t 2>&1`);
      const output = stdout + stderr;
      console.log(`Nginx validation output: ${output}`);
      
      // Clean up temp file
      fs.unlinkSync(tempFile);
      
      // Check if test was successful
      const isValid = output.includes('syntax is ok') && output.includes('test is successful');
      
      if (isValid) {
        res.json({ success: true });
      } else {
        res.status(400).json({ 
          success: false, 
          error: output || 'Configuration test failed with unknown error'
        });
      }
    } catch (execError) {
      // Clean up temp file
      if (fs.existsSync(tempFile)) {
        fs.unlinkSync(tempFile);
      }
      
      console.error(`Nginx validation failed: ${execError.stderr || execError.error}`);
      res.status(400).json({ 
        success: false, 
        error: execError.stderr || 'Configuration test failed'
      });
    }
  } catch (error) {
    console.error('Error validating nginx config:', error);
    res.status(500).json({ success: false, error: error.message });
  }
});

// Reload NGINX
app.post('/api/nginx/reload', async (req, res) => {
  try {
    console.log('Attempting to reload NGINX configuration...');
    
    // Execute nginx reload command
    try {
      const { stdout, stderr } = await execPromise('nginx -s reload 2>&1');
      console.log('NGINX reload output:', stdout, stderr);
      res.json({ success: true });
    } catch (execError) {
      console.error('Error executing nginx reload command:', execError);
      res.status(500).json({ 
        success: false, 
        error: execError.stderr || 'Failed to reload NGINX'
      });
    }
  } catch (error) {
    console.error('Error reloading nginx:', error);
    res.status(500).json({ success: false, error: error.message });
  }
});

// Helper function to extract whitelist groups from NGINX config
function extractWhitelistGroups(config) {
  console.log('Extracting whitelist groups from config');
  const groups = [];
  let currentGroup = null;
  
  // Extract group comments and if blocks
  const lines = config.split('\n');
  console.log(`Config has ${lines.length} lines`);
  
  for (let i = 0; i < lines.length; i++) {
    const line = lines[i].trim();
    
    // Check for group comment
    if (line.startsWith('# Group:')) {
      const name = line.replace('# Group:', '').trim();
      console.log(`Found group: ${name}`);
      currentGroup = {
        id: `group-${Date.now()}-${groups.length}`,
        name,
        description: '',
        clients: [],
        destinations: [],
        enabled: true
      };
      groups.push(currentGroup);
    }
    
    // Check for if condition with client IP and destination
    if (line.startsWith('if ($remote_addr =') && currentGroup) {
      // Extract client IP and destination from the if condition
      const ifMatch = line.match(/if \(\$remote_addr = (.*?) && \$http_host ~ "(.*?)"\)/);
      if (ifMatch && ifMatch.length >= 3) {
        const clientIP = ifMatch[1];
        const destination = ifMatch[2];
        
        // Add client IP if not already in the list
        if (!currentGroup.clients.some(client => client.value === clientIP)) {
          currentGroup.clients.push({
            id: `client-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
            value: clientIP,
            description: ''
          });
          console.log(`Added client IP: ${clientIP}`);
        }
        
        // Add destination if not already in the list
        if (!currentGroup.destinations.some(dest => dest.value === destination)) {
          currentGroup.destinations.push({
            id: `dest-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
            value: destination,
            description: ''
          });
          console.log(`Added destination: ${destination}`);
        }
      }
    }
  }
  
  return groups;
}

// Helper function to generate whitelist configuration from groups
function generateWhitelistConfig(groups) {
  let config = '# IP and hostname whitelist configuration\n';
  
  if (!groups || groups.length === 0) {
    return config + '# No whitelist groups configured\n';
  }
  
  // Filter enabled groups
  const enabledGroups = groups.filter(group => group.enabled);
  
  // Generate config for each group
  enabledGroups.forEach(group => {
    config += `\n# Group: ${group.name}\n`;
    
    if (group.description) {
      config += `# Description: ${group.description}\n`;
    }
    
    // Generate if blocks for each client and destination combination
    group.clients.forEach(client => {
      group.destinations.forEach(dest => {
        config += `if ($remote_addr = ${client.value} && $http_host ~ "${dest.value}") {\n`;
        config += `    set $allow_access 1;\n`;
        config += `}\n`;
      });
    });
  });
  
  return config;
}

// Get whitelist groups
app.get('/api/whitelist/groups', (req, res) => {
  try {
    console.log('Getting whitelist groups from nginx config');
    const configPath = process.env.NGINX_CONFIG_PATH || '/etc/nginx/nginx.conf';
    
    if (!fs.existsSync(configPath)) {
      console.log(`Config file not found at: ${configPath}, checking template`);
      const templatePath = process.env.NGINX_TEMPLATE_PATH || '/etc/nginx/nginx.conf.template';
      
      if (fs.existsSync(templatePath)) {
        console.log(`Using template file instead at: ${templatePath}`);
        const config = fs.readFileSync(templatePath, 'utf8');
        const groups = extractWhitelistGroups(config);
        console.log(`Extracted ${groups.length} groups from template`);
        return res.json({ groups });
      }
      
      console.log('No config file or template found, returning empty groups');
      return res.json({ groups: [] });
    }
    
    const config = fs.readFileSync(configPath, 'utf8');
    const groups = extractWhitelistGroups(config);
    console.log(`Extracted ${groups.length} groups from config file`);
    
    res.json({ groups });
  } catch (error) {
    console.error('Error getting whitelist groups:', error);
    res.status(500).json({ error: error.message });
  }
});

// Update whitelist groups
app.post('/api/whitelist/groups', (req, res) => {
  try {
    const { groups } = req.body;
    console.log(`Updating whitelist with ${groups?.length || 0} groups`);
    
    // Get the nginx configuration
    const configPath = process.env.NGINX_CONFIG_PATH || '/etc/nginx/nginx.conf';
    const templatePath = process.env.NGINX_TEMPLATE_PATH || '/etc/nginx/nginx.conf.template';
    
    let config;
    // Try to read from config file first, fallback to template
    if (fs.existsSync(configPath)) {
      config = fs.readFileSync(configPath, 'utf8');
    } else if (fs.existsSync(templatePath)) {
      config = fs.readFileSync(templatePath, 'utf8');
    } else {
      return res.status(404).json({ error: 'No configuration file found' });
    }
    
    // Generate whitelist configuration
    const whitelistConfig = generateWhitelistConfig(groups);
    
    // Replace placeholder in template
    const newConfig = config.replace(/# PLACEHOLDER:WHITELIST_CONFIG/, whitelistConfig);
    
    // Save the new configuration
    fs.writeFileSync(configPath, newConfig);
    
    console.log('Whitelist groups updated successfully');
    res.json({ success: true });
  } catch (error) {
    console.error('Error updating whitelist groups:', error);
    res.status(500).json({ error: error.message });
  }
});

// Apply whitelist changes
app.post('/api/whitelist/apply', async (req, res) => {
  try {
    console.log('Applying whitelist changes...');
    
    // Reload nginx to apply the changes
    const { stdout, stderr } = await execPromise('nginx -s reload 2>&1');
    console.log('Nginx reload output:', stdout, stderr);
    
    res.json({ success: true });
  } catch (error) {
    console.error('Error applying whitelist changes:', error);
    res.status(500).json({ error: error.message });
  }
});

// Simple catch-all for non-existent routes - avoids path-to-regexp issues
app.use('/api/*', (req, res) => {
  res.status(404).json({
    error: `Endpoint not found: ${req.originalUrl}`,
    available: 'Use GET /api/health to check API status'
  });
});

// Global error handler
app.use((err, req, res, next) => {
  console.error('API Error:', err);
  if (!res.headersSent) {
    res.status(500).json({
      error: 'Internal Server Error',
      message: err.message
    });
  }
});

// Start the server
try {
  const server = app.listen(PORT, () => {
    console.log(`API Server running on port ${PORT}`);
    console.log(`Server time: ${new Date().toISOString()}`);
    console.log('Available endpoints:');
    console.log('  - GET /api/health');
    console.log('  - GET /api/nginx/status');
    console.log('  - GET /api/nginx/config');
    console.log('  - POST /api/nginx/save');
    console.log('  - POST /api/nginx/validate');
    console.log('  - POST /api/nginx/reload');
    console.log('  - GET /api/whitelist/groups');
    console.log('  - POST /api/whitelist/groups');
    console.log('  - POST /api/whitelist/apply');
  });
  
  // Handle server shutdown gracefully
  process.on('SIGTERM', () => {
    console.log('SIGTERM signal received: closing HTTP server');
    server.close(() => {
      console.log('HTTP server closed');
    });
  });
  
  process.on('SIGINT', () => {
    console.log('SIGINT signal received: closing HTTP server');
    server.close(() => {
      console.log('HTTP server closed');
    });
  });
} catch (error) {
  console.error('Failed to start API server:', error);
  process.exit(1);
}
