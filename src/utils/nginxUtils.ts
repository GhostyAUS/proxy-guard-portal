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
  
  // Generate the map blocks for IPs and destinations
  let mapBlocks = '';
  let accessConditions = '';
  
  if (enabledGroups.length > 0) {
    // Generate group map blocks
    mapBlocks = enabledGroups.map(group => {
      // Generate the client IPs map
      const clientIpsMap = group.clients.map(client => 
        `        ${client.value} 1;  # ${client.description || ''}`
      ).join('\n');
      
      // Generate the destinations map
      const destinationsMap = group.destinations.map(dest => {
        // Check if the destination is a regex pattern
        const isRegex = dest.value.includes('*');
        const destValue = isRegex 
          ? `"~^.*\\.${dest.value.replace(/\*/g, '').replace(/\./g, '\\.')}$"` 
          : `"${dest.value}"`;
        
        return `        ${destValue} 1;  # ${dest.description || ''}`;
      }).join('\n');
      
      return `
    # Group ${group.id}: ${group.name}
    map $remote_addr $group_${group.id} {
        default 0;
${clientIpsMap}
    }
    
    map $host $is_${group.id}_url {
        default 0;
${destinationsMap}
    }`;
    }).join('\n\n');
    
    // Generate the map for determining if access is allowed
    let allowConditions = enabledGroups.map(group => 
      `        # ${group.name} group with allowed URL\n        "1:1:${enabledGroups.length > 1 ? '~:'.repeat(enabledGroups.length - 1) : ''}" 1;`
    ).join('\n');
    
    // Generate access determination map
    const groupVars = enabledGroups.map(group => `$group_${group.id}:$is_${group.id}_url`).join(':');
    
    accessConditions = `
    # Determine if access is allowed based on group membership and URL
    map "${groupVars}" $is_access_allowed {
${allowConditions}
        default 0;
    }
    
    # Determine denial reason for logging
    map "${groupVars}" $deny_reason {
        "0:${enabledGroups.map(() => '~').join(':')}" "IP not in any whitelisted group";
${enabledGroups.map((group, idx) => {
  const pattern = Array(enabledGroups.length * 2).fill('~');
  pattern[idx * 2] = '1';
  pattern[idx * 2 + 1] = '0';
  return `        "${pattern.join(':')}" "URL not allowed for ${group.name} group";`;
}).join('\n')}
        default "";
    }
    
    # Variables for logging denied requests
    map $status $deny_log {
        ~^4 1;  # Log all 4xx responses
        default 0;
    }`;
  } else {
    // Default fallbacks when no groups are defined
    mapBlocks = `
    # Default group (no groups enabled)
    map $remote_addr $group_default {
        default 1; # Allow by default when no groups are defined
    }
    
    map $host $is_default_url {
        default 1; # Allow by default when no groups are defined
    }`;
    
    accessConditions = `
    # Default access determination (no groups enabled)
    map "$group_default:$is_default_url" $is_access_allowed {
        "1:1" 1;
        default 0;
    }
    
    # Default denial reason
    map "$group_default:$is_default_url" $deny_reason {
        "0:~" "IP not whitelisted";
        "1:0" "URL not allowed";
        default "";
    }
    
    # Variables for logging denied requests
    map $status $deny_log {
        ~^4 1;  # Log all 4xx responses
        default 0;
    }`;
  }
  
  // Replace placeholders in the template
  config = config.replace('# PLACEHOLDER:MAP_BLOCKS', mapBlocks);
  config = config.replace('# PLACEHOLDER:ACCESS_CONDITIONS', accessConditions);
  
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

// Updated nginx template with the new format
export const DEFAULT_NGINX_TEMPLATE = `
worker_processes auto;
daemon off;

events {
    worker_connections 1024;
}

http {
    log_format main '$remote_addr - $remote_user [$time_local] "$request" '
                     '$status $body_bytes_sent "$http_referer" '
                     '"$http_user_agent" "$http_x_forwarded_for"';
    log_format denied '$remote_addr - [$time_local] "$request" '
                      '$status "$http_user_agent" "$http_referer" '
                      'Host: "$host" URI: "$request_uri" '
                      'Client: "$remote_addr" '
                      'Reason: "$deny_reason"';
    
    access_log /var/log/nginx/access.log main;
    error_log /var/log/nginx/error.log info;
    access_log /var/log/nginx/denied.log denied if=$deny_log;
    
    #==============================================================================
    # GROUP WHITELIST CONFIGURATION
    
# PLACEHOLDER:MAP_BLOCKS

# PLACEHOLDER:ACCESS_CONDITIONS
    
    server {
        listen 8080;
        resolver 8.8.8.8 1.1.1.1 ipv6=off;
        
        # Access control based on group permissions
        if ($is_access_allowed = 0) {
            return 403 "Access denied: Either your IP is not whitelisted or you're not authorized to access this URL.";
        }
        
        # HTTPS CONNECT method handling
        proxy_connect;
        proxy_connect_allow all;
        proxy_connect_connect_timeout 10s;
        proxy_connect_read_timeout 60s;
        proxy_connect_send_timeout 60s;
        
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
        
        # HTTP forwarding
        location / {
            # Check group permissions again at location level
            if ($is_access_allowed = 0) {
                return 403 "Access denied: Either your IP is not whitelisted or you're not authorized to access this URL.";
            }
            
            proxy_http_version 1.1;
            proxy_set_header Host $host;
            proxy_set_header Connection "";
            proxy_pass $scheme://$host$request_uri;
            proxy_set_header X-Real-IP $remote_addr;
            proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
            proxy_set_header X-Forwarded-Proto $scheme;
            proxy_connect_timeout 10s;
            proxy_send_timeout 60s;
            proxy_read_timeout 60s;
        }
    }
}
`;
