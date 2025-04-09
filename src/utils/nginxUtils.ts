import { WhitelistGroup } from "@/types/proxy";

export const generateNginxConfig = (groups: WhitelistGroup[], configTemplate: string): string => {
  // Start with the base template
  let config = configTemplate;
  
  // Generate the map blocks for IPs and destinations
  const mapBlocks = groups.filter(g => g.enabled).map(group => {
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
  const accessConditions = groups.filter(g => g.enabled).map(group => 
    `if ($client_${group.id} = 1 && $dest_${group.id} = 1) { set $allow_access 1; }`
  ).join('\n    ');
  
  // Replace placeholders in the template
  config = config.replace('# PLACEHOLDER:MAP_BLOCKS', mapBlocks);
  config = config.replace('# PLACEHOLDER:ACCESS_CONDITIONS', accessConditions);
  
  return config;
};

export const validateNginxConfig = async (configPath: string, config: string): Promise<boolean> => {
  // This is a mock function - in a real implementation this would make an API call to test the nginx config
  return true;
};

export const saveNginxConfig = async (configPath: string, config: string): Promise<boolean> => {
  // This is a mock function - in a real implementation this would make an API call to save the nginx config
  console.log("Saving nginx config to", configPath);
  console.log(config);
  return true;
};

export const reloadNginxConfig = async (): Promise<boolean> => {
  // This is a mock function - in a real implementation this would make an API call to reload nginx
  return true;
};

export const testConfigWritable = async (configPath: string): Promise<boolean> => {
  // This is a mock function - in a real implementation this would check if the config file is writable
  return true;
};

// Updated nginx combined proxy template
export const DEFAULT_NGINX_TEMPLATE = `
worker_processes auto;
error_log /var/log/nginx/error.log info;

events {
    worker_connections 1024;
}

http {
    access_log /var/log/nginx/access.log;
    
    # Define variables for access control
    map $remote_addr $allow_access {
        default 0;
    }
    
# PLACEHOLDER:MAP_BLOCKS
    
    server {
        listen 8080 ssl http2;
        
        # SSL configuration for HTTPS
        ssl_certificate /etc/nginx/certs/server.crt;
        ssl_certificate_key /etc/nginx/certs/server.key;
        ssl_protocols TLSv1.2 TLSv1.3;
        ssl_ciphers HIGH:!aNULL:!MD5;
        ssl_prefer_server_ciphers on;
        ssl_session_cache shared:SSL:10m;
        ssl_session_timeout 10m;
        
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
