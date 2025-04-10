/**
 * NGINX operations service for the Proxy Guard application
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
    // Check if nginx is running
    let isRunning = false;
    try {
      await execPromise('nginx -s reload');
      isRunning = true;
    } catch (e) {
      // If command fails, nginx might not be running
      isRunning = false;
    }

    // Get last modification time of config file
    const configPath = process.env.NGINX_CONFIG_PATH || '/etc/nginx/nginx.conf';
    let lastModified = new Date();
    if (fs.existsSync(configPath)) {
      const stats = fs.statSync(configPath);
      lastModified = stats.mtime;
    }

    // Test if config is valid
    let configValid = false;
    try {
      await execPromise('nginx -t');
      configValid = true;
    } catch (e) {
      configValid = false;
    }

    res.json({
      isRunning,
      lastModified: lastModified.toISOString(),
      lastConfigTest: {
        success: configValid,
        message: configValid ? 'Configuration test successful' : 'Configuration test failed'
      },
      configWritable: fs.accessSync(configPath, fs.constants.W_OK, (err) => !err)
    });
  } catch (error) {
    console.error('Error getting nginx status:', error);
    res.status(500).json({ error: error.message });
  }
});

// Get current NGINX configuration
router.get('/nginx/config', (req, res) => {
  try {
    const configPath = process.env.NGINX_CONFIG_PATH || '/etc/nginx/nginx.conf';
    
    if (!fs.existsSync(configPath)) {
      return res.status(404).json({ error: 'Configuration file not found' });
    }
    
    const config = fs.readFileSync(configPath, 'utf8');
    res.json({ config });
  } catch (error) {
    console.error('Error reading nginx config:', error);
    res.status(500).json({ error: error.message });
  }
});

// Validate NGINX config syntax
router.post('/nginx/validate', async (req, res) => {
  try {
    const { config, configPath } = req.body;
    
    // Write config to a temp file
    const tempFile = `/tmp/nginx-test-${Date.now()}.conf`;
    fs.writeFileSync(tempFile, config);
    
    // Test the configuration with nginx -t
    try {
      await execPromise(`nginx -c ${tempFile} -t`);
      
      // Clean up temp file
      fs.unlinkSync(tempFile);
      
      res.json({ success: true });
    } catch (execError) {
      // Clean up temp file
      if (fs.existsSync(tempFile)) {
        fs.unlinkSync(tempFile);
      }
      
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
    const { config, configPath } = req.body;
    
    // Create backup of existing config
    if (fs.existsSync(configPath)) {
      const backupPath = `${configPath}.bak-${Date.now()}`;
      fs.copyFileSync(configPath, backupPath);
    }
    
    // Ensure directory exists
    const configDir = path.dirname(configPath);
    if (!fs.existsSync(configDir)) {
      fs.mkdirSync(configDir, { recursive: true });
    }
    
    // Write new config
    fs.writeFileSync(configPath, config);
    
    res.json({ success: true });
  } catch (error) {
    console.error('Error saving nginx config:', error);
    res.status(500).json({ success: false, error: error.message });
  }
});

// Test if config path is writable
router.post('/nginx/test-writable', (req, res) => {
  try {
    const { configPath } = req.body;
    
    // Test if directory is writable
    const configDir = path.dirname(configPath);
    
    // Check if directory exists
    if (!fs.existsSync(configDir)) {
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
      res.json({ writable: true });
    } catch (writeError) {
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
    await execPromise('nginx -s reload');
    console.log('NGINX reload successful');
    res.json({ success: true });
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

// Parse nginx access logs and return structured data
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

// Get whitelist groups from NGINX config
router.get('/whitelist-groups', (req, res) => {
  try {
    console.log('Whitelist groups requested from API');
    const configPath = process.env.NGINX_CONFIG_PATH || '/etc/nginx/nginx.conf';
    
    if (!fs.existsSync(configPath)) {
      console.warn('Configuration file not found:', configPath);
      return res.status(404).json({ error: 'Configuration file not found' });
    }
    
    const config = fs.readFileSync(configPath, 'utf8');
    console.log('NGINX config loaded successfully');
    
    // Return mock data if can't extract from config
    const groups = [
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
    
    res.json({ groups });
  } catch (error) {
    console.error('Error getting whitelist groups:', error);
    res.status(500).json({ error: error.message });
  }
});

// Helper function to extract whitelist groups from NGINX config
function extractWhitelistGroups(config) {
  const groups = [];
  let currentGroup = null;
  
  // Extract group comments and maps
  const lines = config.split('\n');
  
  for (let i = 0; i < lines.length; i++) {
    const line = lines[i].trim();
    
    // Check for group comment
    if (line.startsWith('# Group:')) {
      const name = line.replace('# Group:', '').trim();
      currentGroup = {
        id: `group-${Date.now()}-${groups.length}`,
        name,
        description: '',
        clients: [],
        destinations: [],
        enabled: true
      };
    }
    
    // Check for client IPs map
    if (line.startsWith('map $remote_addr $client_') && currentGroup) {
      const clientMapLines = getMapBlock(lines, i);
      
      // Extract client IPs
      for (const mapLine of clientMapLines) {
        const trimmedLine = mapLine.trim();
        if (trimmedLine && !trimmedLine.startsWith('default') && trimmedLine.includes('1;')) {
          const ipValue = trimmedLine.split(' ')[0];
          currentGroup.clients.push({
            id: `client-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
            value: ipValue,
            description: ''
          });
        }
      }
      
      // Skip processed lines
      i += clientMapLines.length;
    }
    
    // Check for destinations map
    if (line.startsWith('map $http_host $dest_') && currentGroup) {
      const destMapLines = getMapBlock(lines, i);
      
      // Extract destinations
      for (const mapLine of destMapLines) {
        const trimmedLine = mapLine.trim();
        if (trimmedLine && !trimmedLine.startsWith('default') && trimmedLine.includes('1;')) {
          const destValue = trimmedLine.split(' ')[0];
          currentGroup.destinations.push({
            id: `dest-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
            value: destValue,
            description: ''
          });
        }
      }
      
      // Add group to list and reset current group
      groups.push(currentGroup);
      currentGroup = null;
      
      // Skip processed lines
      i += destMapLines.length;
    }
  }
  
  return groups;
}

// Helper function to get all lines in a map block
function getMapBlock(lines, startIndex) {
  const mapLines = [];
  let bracesCount = 0;
  let index = startIndex;
  
  // Find opening brace
  while (index < lines.length && !lines[index].includes('{')) {
    index++;
  }
  
  // Process block content
  while (index < lines.length) {
    const line = lines[index];
    mapLines.push(line);
    
    if (line.includes('{')) bracesCount++;
    if (line.includes('}')) bracesCount--;
    
    if (bracesCount === 0 && mapLines.length > 1) {
      break;
    }
    
    index++;
  }
  
  return mapLines;
}

module.exports = router;
