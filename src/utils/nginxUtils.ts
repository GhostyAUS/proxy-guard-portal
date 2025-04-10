import { WhitelistGroup } from "@/types/proxy";
import axios from "axios";

// API endpoint for nginx operations
const API_BASE_URL = import.meta.env.VITE_API_BASE_URL || "/api";

/**
 * Generates an NGINX configuration from whitelist groups using geo directives
 * for IP matching and regex for host matching
 */
export const generateNginxConfig = (groups: WhitelistGroup[], configTemplate: string): string => {
  console.log(`Generating nginx config from ${groups.length} groups`);
  
  // Start with the base template
  let config = configTemplate;
  
  // Generate geo blocks for IP matching
  const geoBlocks = groups.filter(g => g.enabled).map(group => {
    // For each group, create a geo block that maps IPs to variables
    const geoBlock = `
# Group: ${group.name}
geo $remote_addr $client_${group.id} {
    default 0;
${group.clients.map(client => `    ${client.value} 1;`).join('\n')}
}`;
    
    return geoBlock;
  }).join('\n\n');
  
  // Generate access conditions to check both client IP and destination
  const accessConditions = groups.filter(g => g.enabled).flatMap(group => {
    return group.destinations.map(dest => 
      `        if ($client_${group.id} = 1 && $http_host ~ "${dest.value}") { set $allow_access 1; }`
    );
  }).join('\n');
  
  // Replace placeholders in the template
  config = config.replace('# PLACEHOLDER:GEO_BLOCKS', geoBlocks);
  config = config.replace('# PLACEHOLDER:ACCESS_CONDITIONS', accessConditions);
  
  console.log(`Generated nginx config with ${groups.filter(g => g.enabled).length} enabled groups`);
  return config;
};

/**
 * Validates the NGINX configuration syntax
 */
export const validateNginxConfig = async (configPath: string, config: string): Promise<boolean> => {
  try {
    console.log(`Validating nginx config, path: ${configPath}, length: ${config.length}`);
    const response = await axios.post(`${API_BASE_URL}/nginx/validate`, {
      configPath,
      config
    });
    
    return response.data.success === true;
  } catch (error) {
    console.error("Error validating NGINX config:", error);
    throw new Error("Failed to validate NGINX configuration");
  }
};

/**
 * Saves the NGINX configuration to the specified file
 */
export const saveNginxConfig = async (configPath: string, config: string): Promise<boolean> => {
  try {
    console.log(`Saving nginx config, path: ${configPath}, length: ${config.length}`);
    const response = await axios.post(`${API_BASE_URL}/nginx/save`, {
      configPath,
      config
    });
    
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
    const response = await axios.post(`${API_BASE_URL}/nginx/reload`);
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
    const response = await axios.post(`${API_BASE_URL}/nginx/test-writable`, {
      configPath
    });
    
    return response.data.writable === true;
  } catch (error) {
    console.error("Error testing if config is writable:", error);
    throw new Error("Failed to test if configuration file is writable");
  }
};

// Updated nginx combined proxy template with geo directives
export const DEFAULT_NGINX_TEMPLATE = `
worker_processes auto;
error_log /var/log/nginx/error.log info;

events {
    worker_connections 1024;
}

http {
    access_log /var/log/nginx/access.log;
    
    # Define variables for access control using geo module
    set $allow_access 0;
    
    # Use geo module to match client IPs
# PLACEHOLDER:GEO_BLOCKS
    
    server {
        listen 80 ssl http2;
        
        # SSL configuration for HTTPS
        ssl_certificate /etc/nginx/certs/server.crt;
        ssl_certificate_key /etc/nginx/certs/server.key;
        ssl_protocols TLSv1.2 TLSv1.3;
        ssl_ciphers HIGH:!aNULL:!MD5;
        ssl_prefer_server_ciphers on;
        ssl_session_cache shared:SSL:10m;
        ssl_session_timeout 10m;
        
        # Check allowed destinations and set access flag
# PLACEHOLDER:ACCESS_CONDITIONS
        
        # Block access if not allowed
        if ($allow_access != 1) {
            return 403 "Access denied";
        }
        
        # Forward proxy configuration
        resolver 8.8.8.8 ipv6=off;
        
        # HTTP/HTTPS proxy - handles both protocols
        location / {
            # Authentication settings (if enabled)
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
 * Create a backend API service to handle NGINX operations
 */
export const createAPIService = async (backendUrl: string): Promise<boolean> => {
  try {
    const response = await axios.post(`${backendUrl}/setup`, {
      type: 'nginx'
    });
    return response.data.success === true;
  } catch (error) {
    console.error("Error setting up API service:", error);
    throw new Error("Failed to set up API service for NGINX operations");
  }
};

/**
 * Generates htpasswd file for basic authentication
 */
export const generateHtpasswd = async (users: { username: string, password: string }[]): Promise<boolean> => {
  try {
    const response = await axios.post(`${API_BASE_URL}/nginx/htpasswd`, {
      users
    });
    return response.data.success === true;
  } catch (error) {
    console.error("Error generating htpasswd file:", error);
    throw new Error("Failed to generate htpasswd file");
  }
};
