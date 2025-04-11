
import { WhitelistGroup, ProxySettings, NginxStatus, ClientIP, Destination } from "@/types/proxy";
import { v4 as uuidv4 } from 'uuid';

// Configuration paths (used server-side)
const WHITELIST_CONFIG_PATH = import.meta.env.VITE_WHITELIST_CONFIG_PATH || '/etc/proxyguard/whitelist.json';
const PROXY_SETTINGS_PATH = import.meta.env.VITE_PROXY_SETTINGS_PATH || '/etc/proxyguard/settings.json';
const NGINX_CONFIG_PATH = import.meta.env.VITE_NGINX_CONFIG_PATH || '/etc/nginx/nginx.conf';

// Base API URL for server operations
const API_BASE_URL = import.meta.env.VITE_API_BASE_URL || '/api';

// Check if running in browser environment - always true in this context
const isBrowser = true;

// Function to read whitelist groups from configuration file
export const readWhitelistGroups = async (): Promise<WhitelistGroup[]> => {
  try {
    if (isBrowser) {
      // In browser environment, use demo data for development or fetch from API in production
      if (import.meta.env.DEV) {
        console.log("Running in dev mode, using demo whitelist groups");
        return getDemoWhitelistGroups();
      } else {
        // In production, call the API
        const response = await fetch(`${API_BASE_URL}/whitelist`);
        if (!response.ok) {
          throw new Error(`API error: ${response.status}`);
        }
        return await response.json();
      }
    }

    // This code will never run in the browser
    return getDemoWhitelistGroups();
  } catch (error) {
    console.error("Failed to read whitelist groups:", error);
    
    // If API call fails or in dev mode, return default data
    return getDemoWhitelistGroups();
  }
};

// Function to write whitelist groups to configuration file
export const writeWhitelistGroups = async (groups: WhitelistGroup[]): Promise<boolean> => {
  try {
    if (isBrowser) {
      if (import.meta.env.DEV) {
        console.log("Running in dev mode, would write to:", WHITELIST_CONFIG_PATH, groups);
        return true;
      } else {
        // In production, call the API
        const response = await fetch(`${API_BASE_URL}/whitelist`, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify(groups),
        });
        
        if (!response.ok) {
          throw new Error(`API error: ${response.status}`);
        }
        
        return true;
      }
    }

    // This code will never run in the browser
    return true;
  } catch (error) {
    console.error('Failed to write whitelist groups:', error);
    return false;
  }
};

// Function to read proxy settings from configuration file
export const readProxySettings = async (): Promise<ProxySettings> => {
  try {
    if (isBrowser) {
      if (import.meta.env.DEV) {
        console.log("Running in dev mode, using default proxy settings");
        return getDefaultProxySettings();
      } else {
        // In production, call the API
        const response = await fetch(`${API_BASE_URL}/settings`);
        if (!response.ok) {
          throw new Error(`API error: ${response.status}`);
        }
        return await response.json();
      }
    }

    // This code will never run in the browser
    return getDefaultProxySettings();
  } catch (error) {
    console.error("Failed to read proxy settings:", error);
    
    // Return default settings on error
    return getDefaultProxySettings();
  }
};

// Function to write proxy settings to configuration file
export const writeProxySettings = async (settings: ProxySettings): Promise<boolean> => {
  try {
    if (isBrowser) {
      if (import.meta.env.DEV) {
        console.log("Running in dev mode, would write settings:", settings);
        return true;
      } else {
        // In production, call the API
        const response = await fetch(`${API_BASE_URL}/settings`, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify(settings),
        });
        
        if (!response.ok) {
          throw new Error(`API error: ${response.status}`);
        }
        
        return true;
      }
    }

    // This code will never run in the browser
    return true;
  } catch (error) {
    console.error('Failed to write proxy settings:', error);
    return false;
  }
};

// Function to check Nginx status
export const checkNginxStatus = async (): Promise<NginxStatus> => {
  try {
    if (isBrowser) {
      if (import.meta.env.DEV) {
        console.log("Running in dev mode, using mock Nginx status");
        // Mock Nginx status in development environment
        return {
          isRunning: true,
          lastConfigTest: {
            success: true,
            message: 'Configuration test successful'
          },
          lastModified: new Date().toISOString(),
          configWritable: true
        };
      } else {
        // In production, call the API
        const response = await fetch(`${API_BASE_URL}/nginx/status`);
        if (!response.ok) {
          throw new Error(`API error: ${response.status}`);
        }
        return await response.json();
      }
    }

    // This code will never run in the browser
    return {
      isRunning: false,
      lastConfigTest: {
        success: false,
        message: 'Failed to test configuration'
      },
      lastModified: new Date().toISOString(),
      configWritable: false
    };
  } catch (error) {
    console.error("Failed to check Nginx status:", error);
    
    return {
      isRunning: false,
      lastConfigTest: {
        success: false,
        message: 'Failed to test configuration'
      },
      lastModified: new Date().toISOString(),
      configWritable: false
    };
  }
};

// Function to reload Nginx configuration
export const reloadNginxConfig = async (): Promise<boolean> => {
  try {
    if (isBrowser) {
      if (import.meta.env.DEV) {
        console.log("Running in dev mode, would reload Nginx configuration");
        return true;
      } else {
        // In production, call the API
        const response = await fetch(`${API_BASE_URL}/nginx/reload`, {
          method: 'POST',
        });
        
        if (!response.ok) {
          throw new Error(`API error: ${response.status}`);
        }
        
        return true;
      }
    }

    // This code will never run in the browser
    return true;
  } catch (error) {
    console.error("Failed to reload Nginx:", error);
    return false;
  }
};

// Helper function for default proxy settings
function getDefaultProxySettings(): ProxySettings {
  return {
    nginxConfigPath: NGINX_CONFIG_PATH,
    isReadOnly: false,
    proxyPort: "8080",
    authType: "none"
  };
}

// Helper function for demo whitelist groups
function getDemoWhitelistGroups(): WhitelistGroup[] {
  return [
    {
      id: "1",
      name: "Default Allow Group",
      description: "Allow traffic to common services",
      enabled: true,
      clients: [
        { id: "c1", value: "192.168.1.0/24", description: "Local network" },
        { id: "c2", value: "10.0.0.1", description: "Gateway" }
      ],
      destinations: [
        { id: "d1", value: "example.com", description: "Example website" },
        { id: "d2", value: "api.example.org", description: "API endpoint" }
      ]
    },
    {
      id: "2",
      name: "Admin Access",
      description: "Special access for administrators",
      enabled: false,
      clients: [
        { id: "c3", value: "10.0.0.5", description: "Admin PC 1" },
        { id: "c4", value: "10.0.0.6", description: "Admin PC 2" }
      ],
      destinations: [
        { id: "d3", value: "admin.example.com", description: "Admin portal" }
      ]
    }
  ];
}
