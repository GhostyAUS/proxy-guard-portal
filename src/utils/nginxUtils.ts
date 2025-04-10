
import { WhitelistGroup } from "@/types/proxy";
import axios from "axios";

// API endpoint for nginx operations
const API_BASE_URL = import.meta.env.VITE_API_BASE_URL || "/api";

/**
 * Generates an NGINX configuration from whitelist groups
 * Formats IP whitelist and URL whitelist sections
 */
export const generateNginxConfig = (groups: WhitelistGroup[], configTemplate: string): string => {
  console.log(`Generating nginx config from ${groups.length} groups`);
  
  // Start with the template
  let config = configTemplate;
  
  // Generate IP whitelist section
  let ipWhitelistSection = `    geo $whitelist {\n        default 0;\n`;
  let urlWhitelistSection = `    map $host $is_allowed_url {\n        default 0;  # Block by default - deny unless explicitly allowed\n\n        # Allow specific domains below:\n`;
  
  // Process each enabled group
  groups.filter(g => g.enabled).forEach(group => {
    // Add comments for the group
    ipWhitelistSection += `\n        # Group: ${group.name}\n`;
    urlWhitelistSection += `\n        # Group: ${group.name}\n`;
    
    if (group.description) {
      ipWhitelistSection += `        # ${group.description}\n`;
      urlWhitelistSection += `        # ${group.description}\n`;
    }
    
    // Add all client IPs from this group
    group.clients.forEach(client => {
      ipWhitelistSection += `        ${client.value} 1;`;
      if (client.description) {
        ipWhitelistSection += `  # ${client.description}`;
      }
      ipWhitelistSection += '\n';
    });
    
    // Add all destinations from this group
    group.destinations.forEach(dest => {
      // Format destination correctly based on whether it's a regex or exact match
      const formattedDest = dest.value.includes('*') ? 
        `"~^.*\\.${dest.value.replace(/\*/g, '').replace(/\./g, '\\.')}$"` : 
        `"${dest.value}"`;
      
      urlWhitelistSection += `        ${formattedDest} 1;`;
      if (dest.description) {
        urlWhitelistSection += `  # ${dest.description}`;
      }
      urlWhitelistSection += '\n';
    });
  });
  
  // Close the sections
  ipWhitelistSection += "    }\n";
  urlWhitelistSection += "    }\n";
  
  // Replace the placeholders in the template
  config = config.replace(/geo \$whitelist \{[\s\S]*?\}/, ipWhitelistSection);
  config = config.replace(/map \$host \$is_allowed_url \{[\s\S]*?\}/, urlWhitelistSection);
  
  console.log("Generated nginx config successfully");
  return config;
};

/**
 * Fetches the current NGINX configuration
 */
export const fetchNginxConfig = async (): Promise<string> => {
  try {
    const response = await axios.get(`${API_BASE_URL}/nginx/config`);
    return response.data.config;
  } catch (error) {
    console.error("Error fetching NGINX config:", error);
    throw new Error("Failed to fetch NGINX configuration");
  }
};

/**
 * Saves the NGINX configuration
 */
export const saveNginxConfig = async (config: string): Promise<boolean> => {
  try {
    const response = await axios.post(`${API_BASE_URL}/nginx/save`, { config });
    return response.data.success === true;
  } catch (error) {
    console.error("Error saving NGINX config:", error);
    throw new Error("Failed to save NGINX configuration");
  }
};

/**
 * Restarts the NGINX container
 */
export const restartNginxContainer = async (): Promise<boolean> => {
  try {
    const response = await axios.post(`${API_BASE_URL}/nginx/restart`);
    return response.data.success === true;
  } catch (error) {
    console.error("Error restarting NGINX container:", error);
    throw new Error("Failed to restart NGINX container");
  }
};

/**
 * Gets the current status of NGINX
 */
export const getNginxStatus = async (): Promise<NginxStatus> => {
  try {
    const response = await axios.get(`${API_BASE_URL}/nginx/status`);
    return response.data;
  } catch (error) {
    console.error("Error getting NGINX status:", error);
    throw new Error("Failed to get NGINX status");
  }
};

/**
 * Validates the NGINX configuration syntax
 */
export const validateNginxConfig = async (config: string): Promise<boolean> => {
  try {
    const response = await axios.post(`${API_BASE_URL}/nginx/validate`, { config });
    return response.data.success === true;
  } catch (error) {
    console.error("Error validating NGINX config:", error);
    throw new Error("Failed to validate NGINX configuration");
  }
};

// Default nginx template with placeholders for whitelist sections
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
    #IP WHITELIST
    # Use geo module to determine if incoming IP is on whitelist
    geo $whitelist {
        default 0;
        # Allow Individual IPs below:
        127.0.0.1 1;  # Example localhost
    }
    
    # ------------------------------------
    # URL WHITELIST
    # url filtering for external addresses - default-deny approach
       
    map $host $is_allowed_url {
        default 0;  # Block by default - deny unless explicitly allowed
    
        # Allow specific domains below:
        "example.com" 1;  # Example domain
    }
# END OF CODE TO EDIT, DO NOT EDIT BELOW.
# ==============================================================================

    # Variables for logging denied requests
    map $status $deny_log {
        ~^4 1;  # Log all 4xx responses (including 403 denied requests)
        default 0;
    }
    
    # Map to set denial reason
    map "$whitelist:$is_allowed_url" $deny_reason {
        "0:0" "IP not whitelisted and URL not allowed";
        "0:1" "IP not whitelisted";
        "1:0" "URL not in allowed list";
        default "";
    }

    server {
        listen 8080;
        # External DNS server/s
        resolver 8.8.8.8 1.1.1.1 ipv6=off;

        # Use the geo variable for access control
        if ($whitelist = 0) {
            set $deny_reason "IP not whitelisted: $remote_addr";
            return 403 "Access denied: Your IP is not whitelisted.";
        }

        # Block disallowed URLs
        if ($is_allowed_url = 0) {
            set $deny_reason "URL not in allowed list: $host";
            return 403 "Access denied: This URL is not in the allowed list.";
        }

        # HTTPS CONNECT method handling
        proxy_connect;
        proxy_connect_allow all;  # Allow all ports for HTTPS connections
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
            # Check whitelist again at location level
            if ($whitelist = 0) {
                set $deny_reason "IP not whitelisted at location level: $remote_addr";
                return 403 "Access denied: Your IP is not whitelisted.";
            }

            # Check URL filtering again at location level
            if ($is_allowed_url = 0) {
                set $deny_reason "URL not in allowed list at location level: $host";
                return 403 "Access denied: This URL is not in the allowed list.";
            }

            proxy_http_version 1.1;
            proxy_set_header Host $host;
            proxy_set_header Connection "";  # Enable keepalives
            proxy_pass $scheme://$host$request_uri;  # Include $request_uri

            # Additional useful headers
            proxy_set_header X-Real-IP $remote_addr;
            proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
            proxy_set_header X-Forwarded-Proto $scheme;

            # Timeouts for better reliability
            proxy_connect_timeout 10s;
            proxy_send_timeout 60s;
            proxy_read_timeout 60s;
        }
    }
}`;
