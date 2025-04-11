
#!/usr/bin/env node

/**
 * ProxyGuard API Proxy Server
 * 
 * This lightweight server handles API requests from the frontend
 * and executes appropriate system commands using the proxyguard-exec script.
 */

const express = require('express');
const fs = require('fs').promises;
const { spawn } = require('child_process');
const bodyParser = require('body-parser');
const path = require('path');
const helmet = require('helmet');
const rateLimit = require('express-rate-limit');
const morgan = require('morgan');

// Configuration
const PORT = process.env.PORT || 3000;
const COMMAND_SCRIPT_PATH = '/usr/local/bin/proxyguard-exec';
const WHITELIST_CONFIG_PATH = '/etc/proxyguard/whitelist.json';
const PROXY_SETTINGS_PATH = '/etc/proxyguard/settings.json';
const NGINX_CONFIG_PATH = '/etc/nginx/nginx.conf';
const LOG_FILE_PATH = '/var/log/proxyguard/access.log';
const STATIC_FILES_PATH = path.join(__dirname, '../dist');

// Create Express app
const app = express();

// Security middleware
app.use(helmet({
  contentSecurityPolicy: {
    directives: {
      defaultSrc: ["'self'"],
      scriptSrc: ["'self'", "'unsafe-inline'", "'unsafe-eval'"],
      connectSrc: ["'self'"],
      imgSrc: ["'self'", "data:"],
      styleSrc: ["'self'", "'unsafe-inline'"]
    }
  }
}));
app.use(morgan('combined'));

// Rate limiting
const apiLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 100, // limit each IP to 100 requests per windowMs
  standardHeaders: true,
  legacyHeaders: false,
});
app.use('/api/', apiLimiter);

// Parse request bodies
app.use(bodyParser.json());

// Serve static files from the React app
app.use(express.static(STATIC_FILES_PATH));

// Helper function to execute system commands
async function executeCommand(command, args = [], stdin = null) {
  return new Promise((resolve, reject) => {
    const cmd = spawn(command, args);
    
    let stdout = '';
    let stderr = '';
    
    cmd.stdout.on('data', (data) => {
      stdout += data.toString();
    });
    
    cmd.stderr.on('data', (data) => {
      stderr += data.toString();
    });
    
    if (stdin) {
      cmd.stdin.write(stdin);
      cmd.stdin.end();
    }
    
    cmd.on('close', (code) => {
      if (code === 0) {
        resolve({ success: true, output: stdout });
      } else {
        resolve({ success: false, output: stderr || stdout });
      }
    });
    
    cmd.on('error', (err) => {
      reject({ success: false, error: err.message });
    });
  });
}

// API routes

// Get whitelist groups
app.get('/api/whitelist', async (req, res) => {
  try {
    const data = await fs.readFile(WHITELIST_CONFIG_PATH, 'utf8');
    const groups = JSON.parse(data);
    res.json(groups);
  } catch (err) {
    console.error('Error reading whitelist:', err);
    
    // If file doesn't exist, return empty array
    if (err.code === 'ENOENT') {
      res.json([]);
    } else {
      res.status(500).json({ error: 'Failed to read whitelist groups' });
    }
  }
});

// Update whitelist groups
app.post('/api/whitelist', async (req, res) => {
  try {
    const groups = req.body;
    await fs.writeFile(WHITELIST_CONFIG_PATH, JSON.stringify(groups, null, 2));
    res.json({ success: true });
  } catch (err) {
    console.error('Error writing whitelist:', err);
    res.status(500).json({ error: 'Failed to write whitelist groups' });
  }
});

// Get proxy settings
app.get('/api/settings', async (req, res) => {
  try {
    const data = await fs.readFile(PROXY_SETTINGS_PATH, 'utf8');
    const settings = JSON.parse(data);
    res.json(settings);
  } catch (err) {
    console.error('Error reading settings:', err);
    
    // If file doesn't exist, return default settings
    if (err.code === 'ENOENT') {
      const defaultSettings = {
        nginxConfigPath: NGINX_CONFIG_PATH,
        isReadOnly: false,
        proxyPort: "8080",
        authType: "none",
        logSettings: {
          accessLogPath: "/var/log/nginx/access.log",
          errorLogPath: "/var/log/nginx/error.log",
          deniedLogPath: "/var/log/nginx/denied.log"
        }
      };
      res.json(defaultSettings);
    } else {
      res.status(500).json({ error: 'Failed to read proxy settings' });
    }
  }
});

// Update proxy settings
app.post('/api/settings', async (req, res) => {
  try {
    const settings = req.body;
    await fs.writeFile(PROXY_SETTINGS_PATH, JSON.stringify(settings, null, 2));
    res.json({ success: true });
  } catch (err) {
    console.error('Error writing settings:', err);
    res.status(500).json({ error: 'Failed to write proxy settings' });
  }
});

// Get Nginx status
app.get('/api/nginx/status', async (req, res) => {
  try {
    // Check if Nginx is running
    const statusResult = await executeCommand(COMMAND_SCRIPT_PATH, ['check_status']);
    const isRunning = statusResult.success;
    
    // Check if last config test was successful
    const testResult = await executeCommand(COMMAND_SCRIPT_PATH, ['test_config']);
    
    // Check if config file is writable
    const writableResult = await executeCommand(COMMAND_SCRIPT_PATH, ['check_writable', NGINX_CONFIG_PATH]);
    
    // Get last modified time
    let lastModified = new Date().toISOString();
    try {
      const stats = await fs.stat(NGINX_CONFIG_PATH);
      lastModified = stats.mtime.toISOString();
    } catch (err) {
      console.error('Error getting file stats:', err);
    }
    
    res.json({
      isRunning,
      lastConfigTest: {
        success: testResult.success,
        message: testResult.output.trim()
      },
      lastModified,
      configWritable: writableResult.success
    });
  } catch (err) {
    console.error('Error checking Nginx status:', err);
    res.status(500).json({ error: 'Failed to check Nginx status' });
  }
});

// Validate Nginx configuration
app.post('/api/nginx/validate', async (req, res) => {
  try {
    const { config } = req.body;
    
    // Write config to a temporary file
    const tempFilePath = '/tmp/nginx_test_config';
    await fs.writeFile(tempFilePath, config);
    
    // Test the configuration
    const result = await executeCommand('nginx', ['-t', '-c', tempFilePath]);
    
    // Clean up temp file
    await fs.unlink(tempFilePath);
    
    res.json({
      valid: result.success,
      message: result.output.trim()
    });
  } catch (err) {
    console.error('Error validating Nginx config:', err);
    res.status(500).json({ error: 'Failed to validate Nginx configuration' });
  }
});

// Save Nginx configuration
app.post('/api/nginx/save', async (req, res) => {
  try {
    const { config, path } = req.body;
    
    // Write config to the specified path using the privileged script
    // First write to a temp file, then move it
    const tempFilePath = '/tmp/nginx_new_config';
    await fs.writeFile(tempFilePath, config);
    
    // Use the privileged command script to move the file
    const result = await executeCommand(COMMAND_SCRIPT_PATH, ['move_file', tempFilePath, path]);
    
    if (result.success) {
      res.json({ success: true });
    } else {
      res.status(500).json({ error: 'Failed to save Nginx configuration', message: result.output });
    }
  } catch (err) {
    console.error('Error saving Nginx config:', err);
    res.status(500).json({ error: 'Failed to save Nginx configuration' });
  }
});

// Reload Nginx configuration
app.post('/api/nginx/reload', async (req, res) => {
  try {
    const result = await executeCommand(COMMAND_SCRIPT_PATH, ['reload_nginx']);
    
    if (result.success) {
      res.json({ success: true });
    } else {
      res.status(500).json({
        error: 'Failed to reload Nginx configuration',
        message: result.output.trim()
      });
    }
  } catch (err) {
    console.error('Error reloading Nginx:', err);
    res.status(500).json({ error: 'Failed to reload Nginx configuration' });
  }
});

// Execute system command (for privileged operations)
app.post('/api/system/execute', async (req, res) => {
  try {
    const { command } = req.body;
    
    // Security check - only allow specific commands
    if (!command.startsWith(COMMAND_SCRIPT_PATH)) {
      return res.status(403).json({ error: 'Unauthorized command execution attempt' });
    }
    
    // Split the command into executable and arguments
    const parts = command.split(' ');
    const executable = parts[0];
    const args = parts.slice(1);
    
    // Execute the command
    const result = await executeCommand(executable, args);
    
    if (result.success) {
      res.json({ success: true, output: result.output });
    } else {
      res.status(500).json({ success: false, message: result.output });
    }
  } catch (err) {
    console.error('Error executing command:', err);
    res.status(500).json({ error: 'Failed to execute command' });
  }
});

// All other GET requests not handled will return the React app
app.get('*', (req, res) => {
  res.sendFile(path.resolve(STATIC_FILES_PATH, 'index.html'));
});

// Start server
app.listen(PORT, () => {
  console.log(`ProxyGuard API proxy server running on port ${PORT}`);
});
