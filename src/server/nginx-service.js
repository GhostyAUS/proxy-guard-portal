
/**
 * This file should be placed in your Node.js backend server
 * It provides the actual implementation for NGINX file operations
 */
const express = require('express');
const fs = require('fs');
const { exec } = require('child_process');
const path = require('path');
const bcrypt = require('bcrypt');

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
    // Execute nginx reload command
    await execPromise('nginx -s reload');
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

module.exports = router;
