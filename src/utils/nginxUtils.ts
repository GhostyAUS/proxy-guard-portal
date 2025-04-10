
import { WhitelistGroup } from "@/types/proxy";
import axios from "axios";
import api from "@/services/apiService";

// API endpoint for nginx operations
const API_BASE_URL = import.meta.env.VITE_API_BASE_URL || "/api";

/**
 * Generates an NGINX configuration from whitelist groups
 * Uses a simplified approach with if directives for access control
 */
export const generateNginxConfig = (groups: WhitelistGroup[], configTemplate: string): string => {
  console.log(`Generating nginx config from ${groups.length} groups`);
  
  // Start with the base template
  let config = configTemplate;
  
  // Create a single whitelist configuration block
  let whitelistConfig = "";
  
  // For each enabled group
  groups.filter(g => g.enabled).forEach(group => {
    // Add a comment for the group
    whitelistConfig += `\n# Group: ${group.name}\n`;
    
    if (group.description) {
      whitelistConfig += `# Description: ${group.description}\n`;
    }
    
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
  config = config.replace('# PLACEHOLDER:WHITELIST_CONFIG', whitelistConfig);
  
  console.log(`Generated nginx config with ${groups.filter(g => g.enabled).length} enabled groups`);
  return config;
};

/**
 * Validates the NGINX configuration syntax
 */
export const validateNginxConfig = async (config: string): Promise<boolean> => {
  try {
    console.log(`Validating nginx config, length: ${config.length}`);
    const response = await api.post('/nginx/validate', { config });
    return response.data.success === true;
  } catch (error) {
    console.error("Error validating NGINX config:", error);
    throw new Error("Failed to validate NGINX configuration");
  }
};

/**
 * Saves the NGINX configuration to the server
 */
export const saveNginxConfig = async (config: string): Promise<boolean> => {
  try {
    console.log(`Saving nginx config, length: ${config.length}`);
    const response = await api.post('/nginx/save', { config });
    return response.data.success === true;
  } catch (error) {
    console.error("Error saving NGINX config:", error);
    throw new Error("Failed to save NGINX configuration file");
  }
};

/**
 * Reloads the NGINX service to apply configuration changes
 */
export const reloadNginxConfig = async (): Promise<boolean> => {
  try {
    console.log("Reloading nginx configuration");
    const response = await api.post('/nginx/reload');
    return response.data.success === true;
  } catch (error) {
    console.error("Error reloading NGINX:", error);
    throw new Error("Failed to reload NGINX service");
  }
};

/**
 * Tests if the NGINX configuration file is writable
 */
export const testConfigWritable = async (configPath: string): Promise<boolean> => {
  try {
    console.log(`Testing if config is writable: ${configPath}`);
    const response = await api.post('/nginx/test-writable', { configPath });
    return response.data.writable === true;
  } catch (error) {
    console.error("Error testing if config is writable:", error);
    throw new Error("Failed to test if configuration file is writable");
  }
};

// Default nginx template with simplified whitelist approach
export const DEFAULT_NGINX_TEMPLATE = `
worker_processes auto;
error_log /var/log/nginx/error.log info;

events {
    worker_connections 1024;
}

http {
    include       /etc/nginx/mime.types;
    default_type  application/octet-stream;
    
    access_log /var/log/nginx/access.log;
    client_max_body_size 10m;
    
    # Define variable for access control
    set $allow_access 0;
    
    # IP and hostname whitelist configurations will be inserted here
    # PLACEHOLDER:WHITELIST_CONFIG
    
    # Proxy API requests to the Node.js backend
    server {
        listen 80;
        server_name localhost;
        
        # API proxy for backend services
        location /api/ {
            proxy_pass http://localhost:3001/api/;
            proxy_http_version 1.1;
            proxy_set_header Upgrade $http_upgrade;
            proxy_set_header Connection 'upgrade';
            proxy_set_header Host $host;
            proxy_set_header X-Real-IP $remote_addr;
            proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
            proxy_cache_bypass $http_upgrade;
        }
        
        # Serve frontend static files
        location / {
            root /app/dist;
            index index.html;
            try_files $uri $uri/ /index.html;
        }
    }
    
    server {
        # Forward proxy server
        listen 8080;
        http2 on;
        
        # SSL configuration
        ssl_certificate /etc/nginx/certs/server.crt;
        ssl_certificate_key /etc/nginx/certs/server.key;
        ssl_protocols TLSv1.2 TLSv1.3;
        ssl_ciphers HIGH:!aNULL:!MD5;
        ssl_prefer_server_ciphers on;
        ssl_session_cache shared:SSL:10m;
        ssl_session_timeout 10m;
        
        # Block access if not allowed
        if ($allow_access != 1) {
            return 403 "Access denied";
        }
        
        # Forward proxy configuration
        resolver 8.8.8.8 ipv6=off;
        
        # HTTP/HTTPS proxy - handles both protocols
        location / {
            # Authentication settings (if enabled)
            auth_basic "Proxy Authentication";
            auth_basic_user_file /etc/nginx/.htpasswd;
            
            # Handle HTTP and HTTPS traffic
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

/**
 * Generates htpasswd file for basic authentication
 */
export const generateHtpasswd = async (users: { username: string, password: string }[]): Promise<boolean> => {
  try {
    const response = await api.post('/nginx/htpasswd', { users });
    return response.data.success === true;
  } catch (error) {
    console.error("Error generating htpasswd file:", error);
    throw new Error("Failed to generate htpasswd file");
  }
};

/**
 * Fetches and parses Nginx logs
 */
export const fetchNginxLogs = async () => {
  try {
    const response = await api.get('/logs');
    return response.data;
  } catch (error) {
    console.error("Error fetching Nginx logs:", error);
    return { logs: [], stats: {} };
  }
};
