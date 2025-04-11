import { WhitelistGroup } from "@/types/proxy";
import { toast } from "sonner";

// Base API URL for server operations
const API_BASE_URL = import.meta.env.VITE_API_BASE_URL || '/api';

// Path to the Nginx configuration file on the server
export const NGINX_CONFIG_PATH = "/etc/nginx/nginx.conf";

// Path to the command execution script
const COMMAND_SCRIPT_PATH = "/usr/local/bin/proxyguard-exec";

export const generateNginxConfig = (groups: WhitelistGroup[], configTemplate: string): string => {
  // Start with the base template
  let config = configTemplate;
  
  // Filter enabled groups
  const enabledGroups = groups.filter(g => g.enabled);
  
  // Generate geo blocks for IP addresses
  let geoBlocks = '';
  let serverLocations = '';
  
  if (enabledGroups.length > 0) {
    // Generate the geo blocks for client IPs
    geoBlocks = `
# CLIENT GROUP DEFINITIONS
geo $remote_addr $client_group {
    default "";
${enabledGroups.map((group) => {
  const safeGroupId = group.id.replace(/[^a-zA-Z0-9]/g, '_');
  return group.clients.map(client => 
    `    ${client.value} ${safeGroupId};  # ${client.description || ''}`
  ).join('\n');
}).join('\n')}
}`;

    // Generate detection variables and conditions for hostname matching
    let accessConditions = '';
    
    enabledGroups.forEach(group => {
      const safeGroupId = group.id.replace(/[^a-zA-Z0-9]/g, '_');
      accessConditions += `
    # Access rules for group ${group.name} (${safeGroupId})
    set $allow_${safeGroupId} 0;
    
    # Check if client belongs to group ${safeGroupId}
    if ($client_group = "${safeGroupId}") {
        ${group.destinations.map(dest => {
          if (dest.value.includes('*')) {
            // Handle wildcard domains with regex - fixed syntax
            const pattern = dest.value.replace(/\*/g, '').replace(/\./g, '\\.');
            return `# ${dest.description || 'Wildcard domain'}
        if ($host ~ .*${pattern}$) {
            set $allow_${safeGroupId} 1;
        }`;
          } else {
            // Handle exact match domains
            return `# ${dest.description || 'Exact domain'}
        if ($host = "${dest.value}") {
            set $allow_${safeGroupId} 1;
        }`;
          }
        }).join('\n        ')}
    }`;
    });

    // Combined access evaluation
    let accessEvaluation = `
    # Evaluate access permissions
    set $allowed 0;
${enabledGroups.map(group => {
  const safeGroupId = group.id.replace(/[^a-zA-Z0-9]/g, '_');
  return `    if ($allow_${safeGroupId} = 1) {
        set $allowed 1;
    }`;
}).join('\n')}
    
    # Deny access if not allowed
    if ($allowed = 0) {
        return 403 "Access denied: Either your IP is not whitelisted or you're not authorized to access this URL.";
    }`;

    // Logging format blocks
    const loggingFormat = `
    # Logging formats
    log_format main '$remote_addr - $remote_user [$time_local] "$request" '
                    '$status $body_bytes_sent "$http_referer" '
                    '"$http_user_agent" "$http_x_forwarded_for"';
    
    log_format denied '$remote_addr - [$time_local] "$request" '
                      '$status "$http_user_agent" "$http_referer" '
                      'Host: "$host" URI: "$request_uri" '
                      'Client: "$remote_addr" '
                      'Group: "$client_group"';
    
    # Log file paths
    access_log /var/log/nginx/access.log main;
    error_log /var/log/nginx/error.log info;
    access_log /var/log/nginx/denied.log denied;`;

    // Proxy settings
    const proxySettings = `
    # HTTP forwarding settings
    proxy_http_version 1.1;
    proxy_set_header Host $host;
    proxy_set_header Connection "";
    proxy_pass $scheme://$host$request_uri;
    proxy_set_header X-Real-IP $remote_addr;
    proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
    proxy_set_header X-Forwarded-Proto $scheme;
    proxy_connect_timeout 10s;
    proxy_send_timeout 60s;
    proxy_read_timeout 60s;`;

    serverLocations = accessConditions + accessEvaluation + proxySettings;
    
    // Replace placeholders in the template
    config = config.replace('# PLACEHOLDER:MAP_BLOCKS', geoBlocks);
    config = config.replace('# PLACEHOLDER:ACCESS_CONDITIONS', loggingFormat);
    config = config.replace('# PLACEHOLDER:SERVER_LOCATIONS', serverLocations);
  } else {
    // Default config when no groups are defined
    geoBlocks = `
# No whitelist groups defined - default configuration
geo $remote_addr $client_group {
    default "default";  # Allow all by default when no groups are defined
}`;

    const loggingFormat = `
    # Logging formats
    log_format main '$remote_addr - $remote_user [$time_local] "$request" '
                    '$status $body_bytes_sent "$http_referer" '
                    '"$http_user_agent" "$http_x_forwarded_for"';
    
    log_format denied '$remote_addr - [$time_local] "$request" '
                      '$status "$http_user_agent" "$http_referer" '
                      'Host: "$host" URI: "$request_uri" '
                      'Client: "$remote_addr" '
                      'Group: "$client_group"';
    
    # Log file paths  
    access_log /var/log/nginx/access.log main;
    error_log /var/log/nginx/error.log info;
    access_log /var/log/nginx/denied.log denied;`;
    
    serverLocations = `
    # Default access rule (no groups enabled)
    set $allowed 1;  # Allow all by default when no restrictions are defined
    
    # HTTP forwarding settings
    proxy_http_version 1.1;
    proxy_set_header Host $host;
    proxy_set_header Connection "";
    proxy_pass $scheme://$host$request_uri;
    proxy_set_header X-Real-IP $remote_addr;
    proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
    proxy_set_header X-Forwarded-Proto $scheme;
    proxy_connect_timeout 10s;
    proxy_send_timeout 60s;
    proxy_read_timeout 60s;`;
    
    // Replace placeholders in the template
    config = config.replace('# PLACEHOLDER:MAP_BLOCKS', geoBlocks);
    config = config.replace('# PLACEHOLDER:ACCESS_CONDITIONS', loggingFormat);
    config = config.replace('# PLACEHOLDER:SERVER_LOCATIONS', serverLocations);
  }
  
  return config;
};

export const validateNginxConfig = async (configPath: string, config: string): Promise<boolean> => {
  try {
    if (import.meta.env.DEV) {
      console.log("Running in dev mode, simulating Nginx config validation");
      toast.success("Nginx configuration validated successfully (Development mode)");
      return true;
    }
    
    // In production, validate via the API
    const response = await fetch(`${API_BASE_URL}/nginx/validate`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ config }),
    });
    
    const result = await response.json();
    
    if (response.ok && result.valid) {
      toast.success("Nginx configuration validated successfully");
      return true;
    } else {
      toast.error(`Failed to validate Nginx configuration: ${result.message || 'Unknown error'}`);
      return false;
    }
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : String(error);
    toast.error(`Failed to validate Nginx configuration: ${errorMessage}`);
    console.error("Validation error:", error);
    return false;
  }
};

export const saveNginxConfig = async (configPath: string, config: string): Promise<boolean> => {
  try {
    // First validate the configuration
    const isValid = await validateNginxConfig(configPath, config);
    if (!isValid) {
      return false;
    }
    
    if (import.meta.env.DEV) {
      console.log("Running in dev mode, simulating Nginx config save");
      toast.success("Nginx configuration saved successfully (Development mode)");
      return true;
    }
    
    // In production, save via the API
    const response = await fetch(`${API_BASE_URL}/nginx/save`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ config, path: configPath }),
    });
    
    if (response.ok) {
      toast.success("Nginx configuration saved successfully");
      return true;
    } else {
      const result = await response.json();
      toast.error(`Failed to save Nginx configuration: ${result.message || 'Unknown error'}`);
      return false;
    }
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : String(error);
    toast.error(`Failed to save Nginx configuration: ${errorMessage}`);
    console.error("Save error:", error);
    return false;
  }
};

export const reloadNginxConfig = async (): Promise<boolean> => {
  try {
    if (import.meta.env.DEV) {
      console.log("Running in dev mode, simulating Nginx reload");
      toast.success("Nginx configuration reloaded successfully (Development mode)");
      return true;
    }
    
    // Execute the reload command directly via the script
    const result = await executePrivilegedCommand("reload_nginx");
    
    if (result.success) {
      toast.success("Nginx configuration reloaded successfully");
      return true;
    } else {
      toast.error(`Failed to reload Nginx configuration: ${result.output}`);
      return false;
    }
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : String(error);
    toast.error(`Failed to reload Nginx configuration: ${errorMessage}`);
    console.error("Reload error:", error);
    return false;
  }
};

export const testConfigWritable = async (configPath: string): Promise<boolean> => {
  try {
    if (import.meta.env.DEV) {
      console.log("Running in dev mode, simulating config writability check");
      return true;
    }
    
    // Check if the config file is writable via the script
    const result = await executePrivilegedCommand(`check_writable ${configPath}`);
    return result.success;
  } catch (error) {
    console.error("File access error:", error);
    return false;
  }
};

// Execute a command with elevated privileges using a local script
export const executePrivilegedCommand = async (command: string): Promise<{ success: boolean; output: string }> => {
  try {
    if (import.meta.env.DEV) {
      console.log("Running in dev mode, simulating privileged command:", command);
      return { 
        success: true, 
        output: `Development mode: Would execute "${command}" with elevated privileges` 
      };
    }
    
    // In production, execute the command via the local script
    const scriptCommand = `${COMMAND_SCRIPT_PATH} ${command}`;
    
    // Use the Electron API if available, otherwise fall back to fetch API
    if (typeof window !== 'undefined' && window.electron) {
      const result = await window.electron.execute(scriptCommand);
      
      if (result.exitCode === 0) {
        toast.success("Command executed successfully");
        return { 
          success: true, 
          output: result.stdout || 'Command executed successfully' 
        };
      } else {
        toast.error(`Failed to execute command: ${result.stderr || 'Unknown error'}`);
        return { 
          success: false, 
          output: result.stderr || 'Command execution failed' 
        };
      }
    } else {
      // Fallback to API for web environments
      const response = await fetch(`${API_BASE_URL}/system/execute`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ command }),
      });
      
      const result = await response.json();
      
      if (response.ok) {
        toast.success("Command executed successfully");
        return { 
          success: true, 
          output: result.output || 'Command executed successfully' 
        };
      } else {
        toast.error(`Failed to execute command: ${result.message || 'Unknown error'}`);
        return { 
          success: false, 
          output: result.message || 'Failed to execute command' 
        };
      }
    }
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : String(error);
    toast.error(`Failed to execute command: ${errorMessage}`);
    console.error("Command execution error:", error);
    return { 
      success: false, 
      output: `Error: ${errorMessage}` 
    };
  }
};

// Updated nginx template to match the structure of the provided configuration
export const DEFAULT_NGINX_TEMPLATE = `
worker_processes auto;
error_log /var/log/nginx/error.log info;

events {
    worker_connections 1024;
}

http {
# PLACEHOLDER:MAP_BLOCKS

# PLACEHOLDER:ACCESS_CONDITIONS
    
    server {
        listen 8080;
        resolver 8.8.8.8 1.1.1.1 ipv6=off;
        
        # Security headers
        proxy_hide_header Upgrade;
        proxy_hide_header X-Powered-By;
        add_header Content-Security-Policy "upgrade-insecure-requests";
        add_header X-Frame-Options "SAMEORIGIN";
        add_header X-XSS-Protection "1; mode=block" always;
        add_header X-Content-Type-Options "nosniff" always;
        add_header Cache-Control "no-transform" always;
        add_header Referrer-Policy no-referrer always;
        add_header X-Robots-Tag none;
        
        location / {
# PLACEHOLDER:SERVER_LOCATIONS
        }
    }
}
`;
