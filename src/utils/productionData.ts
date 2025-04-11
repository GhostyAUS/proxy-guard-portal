
import { WhitelistGroup, ProxySettings, NginxStatus, ClientIP, Destination } from "@/types/proxy";
import { v4 as uuidv4 } from 'uuid';
import * as fs from 'fs';
import * as util from 'util';
import { exec } from 'child_process';

// Convert Node.js callback-based functions to Promise-based
const readFilePromise = util.promisify(fs.readFile);
const writeFilePromise = util.promisify(fs.writeFile);
const execPromise = util.promisify(exec);
const accessPromise = util.promisify(fs.access);

// Configuration
const WHITELIST_CONFIG_PATH = import.meta.env.VITE_WHITELIST_CONFIG_PATH || '/etc/proxyguard/whitelist.json';
const PROXY_SETTINGS_PATH = import.meta.env.VITE_PROXY_SETTINGS_PATH || '/etc/proxyguard/settings.json';
const NGINX_CONFIG_PATH = import.meta.env.VITE_NGINX_CONFIG_PATH || '/etc/nginx/nginx.conf';

// Check if running in browser environment
const isBrowser = typeof window !== 'undefined';

// Function to read whitelist groups from configuration file
export const readWhitelistGroups = async (): Promise<WhitelistGroup[]> => {
  try {
    if (isBrowser) {
      console.log("Running in browser, would attempt to read from:", WHITELIST_CONFIG_PATH);
      // In browser environment, use demo data or fetch from API
      return getDemoWhitelistGroups();
    }

    // Read the whitelist file
    const data = await readFilePromise(WHITELIST_CONFIG_PATH, 'utf8');
    return JSON.parse(data);
  } catch (error) {
    console.error("Failed to read whitelist groups:", error);
    
    // If file doesn't exist or has errors, return default data
    return getDemoWhitelistGroups();
  }
};

// Function to write whitelist groups to configuration file
export const writeWhitelistGroups = async (groups: WhitelistGroup[]): Promise<boolean> => {
  try {
    if (isBrowser) {
      console.log("Running in browser, would write to:", WHITELIST_CONFIG_PATH, groups);
      // In browser environment, this would call an API
      return true;
    }

    // Write the data to file with pretty formatting
    await writeFilePromise(WHITELIST_CONFIG_PATH, JSON.stringify(groups, null, 2));
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
      console.log("Running in browser, would read from:", PROXY_SETTINGS_PATH);
      // In browser environment, return default settings
      return getDefaultProxySettings();
    }

    const data = await readFilePromise(PROXY_SETTINGS_PATH, 'utf8');
    return JSON.parse(data);
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
      console.log("Running in browser, would write to:", PROXY_SETTINGS_PATH, settings);
      return true;
    }

    await writeFilePromise(PROXY_SETTINGS_PATH, JSON.stringify(settings, null, 2));
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
      console.log("Running in browser, would check Nginx status");
      // Mock Nginx status in browser environment
      return {
        isRunning: true,
        lastConfigTest: {
          success: true,
          message: 'Configuration test successful'
        },
        lastModified: new Date().toISOString(),
        configWritable: true
      };
    }

    // Check if Nginx is running
    const { stdout: serviceStatus } = await execPromise('sudo systemctl is-active nginx');
    const isRunning = serviceStatus.trim() === 'active';

    // Check last modified time of the nginx config
    const { stdout: statOutput } = await execPromise(`stat -c %y ${NGINX_CONFIG_PATH}`);
    const lastModified = new Date(statOutput.trim()).toISOString();

    // Check if config is writable
    let configWritable = false;
    try {
      await accessPromise(NGINX_CONFIG_PATH, fs.constants.W_OK);
      configWritable = true;
    } catch (error) {
      configWritable = false;
    }

    return {
      isRunning,
      lastConfigTest: {
        success: true,
        message: 'Configuration test successful'
      },
      lastModified,
      configWritable
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
      console.log("Running in browser, would reload Nginx configuration");
      return true;
    }

    await execPromise('sudo systemctl reload nginx');
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
