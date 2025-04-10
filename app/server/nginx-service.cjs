
/**
 * NGINX operations service for the Proxy Guard application
 * Optimized for single container with direct filesystem access
 */
const express = require('express');
const fs = require('fs');
const { exec } = require('child_process');
const path = require('path');
const bcrypt = require('bcrypt');
const readline = require('readline');

const router = express.Router();

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

// Get NGINX status
router.get('/nginx/status', async (req, res) => {
  try {
    // Set proper Content-Type header
    res.setHeader('Content-Type', 'application/json');
    
    // Check if nginx is running
    let isRunning = false;
    try {
      const { stdout } = await execPromise('pgrep nginx || echo "not running"');
      isRunning = !stdout.includes("not running");
      console.log(`Nginx running status: ${isRunning}`);
    } catch (e) {
      // If command fails, nginx might not be running
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
router.get('/nginx/config', (req, res) => {
  try {
    // Set proper Content-Type header
    res.setHeader('Content-Type', 'application/json');
    
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

// Validate NGINX config syntax
router.post('/nginx/validate', async (req, res) => {
  try {
    // Set proper Content-Type header
    res.setHeader('Content-Type', 'application/json');
    
    const { config } = req.body;
    const configPath = req.body.configPath || '/etc/nginx/nginx.conf';
    
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

// Save NGINX config
router.post('/nginx/save', async (req, res) => {
  try {
    const { config } = req.body;
    const configPath = req.body.configPath || '/etc/nginx/nginx.conf';
    
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
    try {
      fs.writeFileSync(configPath, config);
      console.log('NGINX config saved successfully');
      
      res.json({ success: true });
    } catch (writeError) {
      console.error('Error writing config file:', writeError);
      res.status(500).json({ 
        success: false, 
        error: `Failed to write config: ${writeError.message}` 
      });
    }
  } catch (error) {
    console.error('Error saving nginx config:', error);
    res.status(500).json({ success: false, error: error.message });
  }
});

// Test if config path is writable
router.post('/nginx/test-writable', (req, res) => {
  try {
    const configPath = req.body.configPath || '/etc/nginx/nginx.conf';
    console.log(`Testing if ${configPath} is writable`);
    
    // Test if directory is writable
    const configDir = path.dirname(configPath);
    
    // Check if directory exists
    if (!fs.existsSync(configDir)) {
      console.log(`Directory ${configDir} does not exist`);
      return res.json({ 
        writable: false, 
        error: `Directory ${configDir} does not exist` 
      });
    }
    
    // Try to write to a temp file in that directory
    const testFile = path.join(configDir, `.test-${Date.now()}`);
    
    try {
      fs.writeFileSync(testFile, 'test');
      fs.unlinkSync(testFile);
      console.log(`Directory ${configDir} is writable`);
      res.json({ writable: true });
    } catch (writeError) {
      console.error(`Cannot write to ${configDir}: ${writeError.message}`);
      res.json({ 
        writable: false, 
        error: `Cannot write to ${configDir}: ${writeError.message}` 
      });
    }
  } catch (error) {
    console.error('Error testing if config is writable:', error);
    res.status(500).json({ writable: false, error: error.message });
  }
});

// Reload NGINX
router.post('/nginx/reload', async (req, res) => {
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

// Generate htpasswd file
router.post('/nginx/htpasswd', async (req, res) => {
  try {
    const { users } = req.body;
    const htpasswdPath = '/etc/nginx/.htpasswd';
    
    let htpasswdContent = '';
    
    // Generate htpasswd entries
    for (const user of users) {
      const salt = await bcrypt.genSalt(10);
      const hash = await bcrypt.hash(user.password, salt);
      htpasswdContent += `${user.username}:${hash}\n`;
    }
    
    // Write htpasswd file
    fs.writeFileSync(htpasswdPath, htpasswdContent);
    
    res.json({ success: true });
  } catch (error) {
    console.error('Error generating htpasswd file:', error);
    res.status(500).json({ success: false, error: error.message });
  }
});

// Get access logs
router.get('/logs', (req, res) => {
  try {
    const logPath = '/var/log/nginx/access.log';
    const errorLogPath = '/var/log/nginx/error.log';
    const logs = [];
    const stats = {
      totalRequests: 0,
      allowedRequests: 0,
      deniedRequests: 0,
      topClients: [],
      topDestinations: [],
      lastUpdated: new Date().toISOString()
    };
    
    const clientCounts = {};
    const destinationCounts = {};

    // Check if log file exists
    if (!fs.existsSync(logPath)) {
      return res.json({ logs: [], stats });
    }

    // Stream the file line by line for better performance with large logs
    const fileStream = fs.createReadStream(logPath);
    const rl = readline.createInterface({
      input: fileStream,
      crlfDelay: Infinity
    });

    const processLogLine = (line) => {
      // Example log format: 192.168.1.1 - - [10/Apr/2023:12:34:56 +0000] "GET https://example.com/ HTTP/1.1" 200 1234 "-" "Mozilla/5.0"
      const ipMatch = line.match(/^(\S+)/);
      const timeMatch = line.match(/\[([^\]]+)\]/);
      const requestMatch = line.match(/"([^"]+)"/);
      const statusMatch = line.match(/" (\d{3}) (\d+)/);
      
      if (ipMatch && timeMatch && requestMatch && statusMatch) {
        const clientIp = ipMatch[1];
        const timestamp = new Date(timeMatch[1].replace(':', ' ')).toISOString();
        const request = requestMatch[1].split(' ');
        const method = request[0];
        const destination = request[1].replace(/^https?:\/\//, '').split('/')[0];
        const status = parseInt(statusMatch[1], 10);
        const bytesTransferred = parseInt(statusMatch[2], 10);
        
        // Determine if request was allowed or denied
        const allowed = status < 400;
        
        // Update statistics
        stats.totalRequests++;
        if (allowed) {
          stats.allowedRequests++;
        } else {
          stats.deniedRequests++;
        }
        
        // Track client and destination counts for top lists
        if (!clientCounts[clientIp]) clientCounts[clientIp] = 0;
        clientCounts[clientIp]++;
        
        if (!destinationCounts[destination]) destinationCounts[destination] = 0;
        destinationCounts[destination]++;
        
        // Add to logs array
        logs.push({
          id: `${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
          timestamp,
          clientIp,
          destination,
          status: allowed ? 'allowed' : 'denied',
          reason: allowed ? undefined : `HTTP Status ${status}`,
          bytesTransferred,
          method,
          responseTime: Math.floor(Math.random() * 1000) // Response time not typically available in logs
        });
      }
    };

    // Process the log file
    rl.on('line', processLogLine);
    
    rl.on('close', () => {
      // Create top clients and destinations arrays
      stats.topClients = Object.entries(clientCounts)
        .map(([clientIp, count]) => ({ clientIp, count }))
        .sort((a, b) => b.count - a.count)
        .slice(0, 5);
      
      stats.topDestinations = Object.entries(destinationCounts)
        .map(([destination, count]) => ({ destination, count }))
        .sort((a, b) => b.count - a.count)
        .slice(0, 5);
      
      // Sort logs by timestamp (newest first)
      logs.sort((a, b) => new Date(b.timestamp) - new Date(a.timestamp));
      
      res.json({
        logs: logs.slice(0, 100), // Return only the latest 100 logs
        stats
      });
    });
  } catch (error) {
    console.error('Error reading access logs:', error);
    res.status(500).json({ error: error.message });
  }
});

// Get whitelist groups (updated for direct file access)
router.get('/whitelist/groups', (req, res) => {
  try {
    // Set proper Content-Type header
    res.setHeader('Content-Type', 'application/json');
    
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
router.post('/whitelist/groups', (req, res) => {
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
router.post('/whitelist/apply', async (req, res) => {
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

// Debug endpoint to get available routes
router.get('/debug/routes', (req, res) => {
  try {
    // Get all registered routes
    const routes = [];
    
    // Walk through all layers recursively
    function extractRoutes(stack, basePath = '') {
      for (const layer of stack) {
        if (layer.route) {
          // Routes registered directly on the router
          const methods = Object.keys(layer.route.methods)
            .filter(method => layer.route.methods[method])
            .map(method => method.toUpperCase());
            
          routes.push(`${methods.join(',')} ${basePath}${layer.route.path}`);
        } else if (layer.name === 'router' && layer.handle.stack) {
          // Nested routers
          const path = layer.regexp.source.replace('^\\/','').replace('(?=\\/|$)', '').replace(/\\\//g, '/');
          extractRoutes(layer.handle.stack, basePath + '/' + path);
        }
      }
    }
    
    // Get routes from the router itself
    if (router.stack) {
      extractRoutes(router.stack);
    }
    
    // Get routes from the parent app if available
    if (req.app && req.app._router && req.app._router.stack) {
      extractRoutes(req.app._router.stack);
    }
    
    res.json({ 
      routes,
      baseUrl: process.env.API_BASE_URL || '/api',
      configPath: process.env.NGINX_CONFIG_PATH || '/etc/nginx/nginx.conf'
    });
  } catch (error) {
    console.error('Error getting api routes:', error);
    res.status(500).json({ error: error.message });
  }
});

// Get proxy settings
router.get('/settings/proxy', (req, res) => {
  try {
    // Read from nginx config
    const configPath = process.env.NGINX_CONFIG_PATH || '/etc/nginx/nginx.conf';
    
    let httpPort = "8080";
    let httpsPort = "8443";
    let maxUploadSize = "10m";
    let sslCertPath = "/etc/nginx/certs/server.crt";
    
    if (fs.existsSync(configPath)) {
      const config = fs.readFileSync(configPath, 'utf8');
      
      // Extract HTTP port
      const httpPortMatch = config.match(/listen\s+(\d+)\s*;/);
      if (httpPortMatch && httpPortMatch[1]) {
        httpPort = httpPortMatch[1];
      }
      
      // Extract HTTPS port
      const httpsPortMatch = config.match(/listen\s+(\d+)\s+ssl/);
      if (httpsPortMatch && httpsPortMatch[1]) {
        httpsPort = httpsPortMatch[1];
      }
      
      // Extract SSL cert path
      const sslCertMatch = config.match(/ssl_certificate\s+(.*?);/);
      if (sslCertMatch && sslCertMatch[1]) {
        sslCertPath = sslCertMatch[1];
      }
      
      // Extract max upload size
      const maxUploadMatch = config.match(/client_max_body_size\s+(.*?);/);
      if (maxUploadMatch && maxUploadMatch[1]) {
        maxUploadSize = maxUploadMatch[1];
      }
    }
    
    res.json({
      httpPort,
      httpsPort,
      maxUploadSize,
      sslCertPath
    });
  } catch (error) {
    console.error('Error getting proxy settings:', error);
    res.status(500).json({ error: error.message });
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

module.exports = router;
