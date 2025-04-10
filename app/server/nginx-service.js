
/**
 * NGINX operations service for the Proxy Guard application
 */
const express = require('express');
const fs = require('fs');
const { exec } = require('child_process');
const path = require('path');

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
router.get('/status', async (req, res) => {
  try {
    console.log('Getting nginx status');
    // Check if nginx is running
    let isRunning = false;
    try {
      await execPromise('pgrep nginx || echo "not running"');
      isRunning = true;
    } catch (e) {
      // If command fails, nginx might not be running
      isRunning = false;
    }

    // Get last modification time of config file
    const configPath = process.env.NGINX_CONFIG_PATH || '/etc/nginx/nginx.conf';
    let lastModified = new Date();
    let configExists = false;
    
    try {
      if (fs.existsSync(configPath)) {
        configExists = true;
        const stats = fs.statSync(configPath);
        lastModified = stats.mtime;
      }
    } catch (err) {
      console.error(`Error checking config file: ${err.message}`);
    }

    // Test if config is valid
    let configValid = false;
    try {
      if (configExists) {
        await execPromise('nginx -t');
        configValid = true;
      }
    } catch (e) {
      configValid = false;
    }

    // Check if config is writable
    let configWritable = false;
    try {
      if (configExists) {
        fs.accessSync(configPath, fs.constants.W_OK);
        configWritable = true;
      } else {
        const configDir = path.dirname(configPath);
        if (fs.existsSync(configDir)) {
          fs.accessSync(configDir, fs.constants.W_OK);
          configWritable = true;
        }
      }
    } catch (err) {
      configWritable = false;
    }

    res.json({
      isRunning,
      lastModified: lastModified.toISOString(),
      lastConfigTest: {
        success: configValid,
        message: configValid ? 'Configuration test successful' : 'Configuration test failed'
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
router.get('/config', (req, res) => {
  try {
    const configPath = process.env.NGINX_CONFIG_PATH || '/etc/nginx/nginx.conf';
    
    if (!fs.existsSync(configPath)) {
      const templatePath = '/etc/nginx/nginx.conf.template';
      
      if (fs.existsSync(templatePath)) {
        const config = fs.readFileSync(templatePath, 'utf8');
        return res.json({ config, isTemplate: true });
      }
      
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
router.post('/validate', async (req, res) => {
  try {
    const { config } = req.body;
    
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
router.post('/save', async (req, res) => {
  try {
    const { config } = req.body;
    const configPath = process.env.NGINX_CONFIG_PATH || '/etc/nginx/nginx.conf';
    
    console.log(`Saving NGINX config to ${configPath}`);
    
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

// Restart NGINX
router.post('/restart', async (req, res) => {
  try {
    console.log('Attempting to restart NGINX...');
    
    // Execute nginx reload command
    try {
      await execPromise('nginx -s reload');
      console.log('NGINX reload successful');
      res.json({ success: true });
    } catch (execError) {
      console.error('Error executing nginx reload command:', execError);
      
      // Try full restart if reload fails
      try {
        await execPromise('nginx -s quit && nginx');
        console.log('NGINX full restart successful');
        res.json({ success: true });
      } catch (restartError) {
        console.error('Error executing full restart:', restartError);
        res.status(500).json({ 
          success: false, 
          error: restartError.stderr || 'Failed to restart NGINX'
        });
      }
    }
  } catch (error) {
    console.error('Error restarting nginx:', error);
    res.status(500).json({ success: false, error: error.message });
  }
});

// Extract whitelist groups from NGINX config
router.get('/whitelist-groups', (req, res) => {
  try {
    console.log('Getting whitelist groups from nginx config');
    const configPath = process.env.NGINX_CONFIG_PATH || '/etc/nginx/nginx.conf';
    
    if (!fs.existsSync(configPath)) {
      return res.json([]);
    }
    
    const config = fs.readFileSync(configPath, 'utf8');
    const groups = parseWhitelistGroups(config);
    
    res.json(groups);
  } catch (error) {
    console.error('Error extracting whitelist groups:', error);
    res.status(500).json({ error: error.message });
  }
});

// Parse whitelist groups from NGINX config
function parseWhitelistGroups(config) {
  const groups = [];
  
  // Extract IP whitelist section
  const ipWhitelistMatch = config.match(/geo \$whitelist \{([\s\S]*?)\}/);
  const ipWhitelistText = ipWhitelistMatch ? ipWhitelistMatch[1] : '';
  
  // Extract URL whitelist section
  const urlWhitelistMatch = config.match(/map \$host \$is_allowed_url \{([\s\S]*?)\}/);
  const urlWhitelistText = urlWhitelistMatch ? urlWhitelistMatch[1] : '';
  
  // Process IP entries
  const ipEntries = {};
  const ipComments = {};
  let currentComment = '';
  
  ipWhitelistText.split('\n').forEach(line => {
    line = line.trim();
    if (line.startsWith('#')) {
      // Extract group name from comment if it exists
      if (line.includes('Group:')) {
        currentComment = line;
      } else if (currentComment && line.startsWith('#')) {
        // This is a description for a group
        currentComment += ' ' + line.replace('#', '').trim();
      }
    } else if (line && !line.startsWith('default')) {
      // Extract IP and optional comment
      const parts = line.split('#');
      const ipParts = parts[0].trim().split(/\s+/);
      if (ipParts.length >= 2) {
        const ip = ipParts[0];
        const groupName = currentComment.includes('Group:') ? 
          currentComment.split('Group:')[1].trim() : 'Default Group';
        
        if (!ipEntries[groupName]) {
          ipEntries[groupName] = [];
          ipComments[groupName] = currentComment;
        }
        
        ipEntries[groupName].push({
          value: ip,
          description: parts[1] ? parts[1].trim() : ''
        });
      }
    }
  });
  
  // Process URL entries
  const urlEntries = {};
  currentComment = '';
  
  urlWhitelistText.split('\n').forEach(line => {
    line = line.trim();
    if (line.startsWith('#')) {
      // Extract group name from comment if it exists
      if (line.includes('Group:')) {
        currentComment = line;
      }
    } else if (line && !line.startsWith('default')) {
      // Extract URL and optional comment
      const parts = line.split('#');
      const urlParts = parts[0].trim().split(/\s+/);
      if (urlParts.length >= 2) {
        let url = urlParts[0].replace(/"/g, '').replace(/~\^.*\\\./, '').replace(/\$/, '');
        // Clean up regex patterns
        url = url.replace(/\\\./g, '.');
        
        const groupName = currentComment.includes('Group:') ? 
          currentComment.split('Group:')[1].trim() : 'Default Group';
        
        if (!urlEntries[groupName]) {
          urlEntries[groupName] = [];
        }
        
        urlEntries[groupName].push({
          value: url,
          description: parts[1] ? parts[1].trim() : ''
        });
      }
    }
  });
  
  // Create groups from collected entries
  const groupNames = new Set([...Object.keys(ipEntries), ...Object.keys(urlEntries)]);
  
  groupNames.forEach(name => {
    const id = `group-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
    const description = ipComments[name] || '';
    
    groups.push({
      id,
      name,
      description: description.replace(/# Group: [^\n]+/, '').trim(),
      clients: (ipEntries[name] || []).map((ip, idx) => ({
        id: `ip-${id}-${idx}`,
        ...ip
      })),
      destinations: (urlEntries[name] || []).map((url, idx) => ({
        id: `url-${id}-${idx}`,
        ...url
      })),
      enabled: true
    });
  });
  
  return groups;
}

module.exports = router;
