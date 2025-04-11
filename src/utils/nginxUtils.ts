
import { WhitelistGroup } from "@/types/proxy";
import { toast } from "sonner";

// Base API URL for server operations
const API_BASE_URL = import.meta.env.VITE_API_BASE_URL || '/api';

// Path to the Nginx configuration file on the server
const NGINX_CONFIG_PATH = "/etc/nginx/nginx.conf";

// Path to the command execution script
const COMMAND_SCRIPT_PATH = "/usr/local/bin/proxyguard-exec";

export const generateNginxConfig = (groups: WhitelistGroup[], configTemplate: string): string => {
  // Start with the base template
  let config = configTemplate;
  
  // Filter enabled groups
  const enabledGroups = groups.filter(g => g.enabled);
  
  // Generate the map blocks for IPs and destinations
  const mapBlocks = enabledGroups.map(group => {
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
  const accessConditions = enabledGroups.map(group => 
    `    if ($client_${group.id} = 1 && $dest_${group.id} = 1) { set $allow_access 1; }`
  ).join('\n');
  
  // Always include a default map and condition to handle empty cases
  const finalMapBlocks = enabledGroups.length > 0 ? mapBlocks : `
# Default group (no groups enabled)
map $remote_addr $client_fallback {
    default 1; # Allow by default when no groups are defined
}

map $http_host $dest_fallback {
    default 1; # Allow by default when no groups are defined
}`;

  const finalAccessConditions = enabledGroups.length > 0 ? accessConditions : 
    `    if ($client_fallback = 1 && $dest_fallback = 1) { set $allow_access 1; }`;
  
  // Replace placeholders in the template
  config = config.replace('# PLACEHOLDER:MAP_BLOCKS', finalMapBlocks);
  config = config.replace('# PLACEHOLDER:ACCESS_CONDITIONS', finalAccessConditions);
  
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
    if (window.electron) {
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

// Updated nginx combined proxy template with simplified configuration
export const DEFAULT_NGINX_TEMPLATE = `
worker_processes auto;
pid /run/nginx.pid;
error_log /var/log/nginx/error.log info;

events {
    worker_connections 1024;
}

http {
    include /etc/nginx/mime.types;
    default_type application/octet-stream;
    
    log_format main '$remote_addr - $remote_user [$time_local] "$request" '
                    '$status $body_bytes_sent "$http_referer" '
                    '"$http_user_agent" "$http_x_forwarded_for"';
    
    access_log /var/log/nginx/access.log main;
    
    sendfile on;
    tcp_nopush on;
    tcp_nodelay on;
    keepalive_timeout 65;
    types_hash_max_size 2048;
    
    # SSL Settings
    ssl_protocols TLSv1.2 TLSv1.3;
    ssl_prefer_server_ciphers on;
    ssl_ciphers 'ECDHE-ECDSA-AES128-GCM-SHA256:ECDHE-RSA-AES128-GCM-SHA256:ECDHE-ECDSA-AES256-GCM-SHA384:ECDHE-RSA-AES256-GCM-SHA384';
    
    # Define variables for access control
    map $remote_addr $allow_access {
        default 0;
    }
    
# PLACEHOLDER:MAP_BLOCKS
    
    server {
        listen 8080 ssl;
        
        # SSL configuration for HTTPS
        ssl_certificate /etc/nginx/certs/server.crt;
        ssl_certificate_key /etc/nginx/certs/server.key;
        
        # Check if client is allowed to access the requested destination
# PLACEHOLDER:ACCESS_CONDITIONS
        
        # Block access if not allowed
        if ($allow_access != 1) {
            return 403 "Access denied";
        }
        
        # Forward proxy configuration
        resolver 8.8.8.8 ipv6=off;
        
        # HTTP/HTTPS proxy - handles both protocols
        location / {
            proxy_pass $scheme://$http_host$request_uri;
            proxy_set_header Host $http_host;
            proxy_set_header X-Real-IP $remote_addr;
            proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
            proxy_connect_timeout 60s;
            proxy_send_timeout 60s;
            proxy_read_timeout 60s;
            
            # HTTPS CONNECT method handling
            proxy_ssl_server_name on;
            proxy_ssl_session_reuse on;
        }
    }
}
`;
