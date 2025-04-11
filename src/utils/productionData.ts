
import { WhitelistGroup, ProxySettings, NginxStatus } from "@/types/proxy";
import fs from 'fs';
import path from 'path';
import { exec } from 'child_process';
import { promisify } from 'util';

// Configuration
const WHITELIST_CONFIG_PATH = process.env.WHITELIST_CONFIG_PATH || '/etc/proxyguard/whitelist.json';
const PROXY_SETTINGS_PATH = process.env.PROXY_SETTINGS_PATH || '/etc/proxyguard/settings.json';
const NGINX_CONFIG_PATH = process.env.NGINX_CONFIG_PATH || '/etc/nginx/nginx.conf';

const execAsync = promisify(exec);

// Function to read whitelist groups from configuration file
export const readWhitelistGroups = async (): Promise<WhitelistGroup[]> => {
  try {
    // Check if whitelist config exists
    if (!fs.existsSync(WHITELIST_CONFIG_PATH)) {
      console.error(`Whitelist config not found: ${WHITELIST_CONFIG_PATH}`);
      return [];
    }

    const whitelistData = fs.readFileSync(WHITELIST_CONFIG_PATH, 'utf8');
    return JSON.parse(whitelistData) as WhitelistGroup[];
  } catch (error) {
    console.error("Failed to read whitelist groups:", error);
    return [];
  }
};

// Function to write whitelist groups to configuration file
export const writeWhitelistGroups = async (groups: WhitelistGroup[]): Promise<boolean> => {
  try {
    const configDir = path.dirname(WHITELIST_CONFIG_PATH);
    
    // Create config directory if it doesn't exist
    if (!fs.existsSync(configDir)) {
      fs.mkdirSync(configDir, { recursive: true });
    }
    
    fs.writeFileSync(WHITELIST_CONFIG_PATH, JSON.stringify(groups, null, 2));
    return true;
  } catch (error) {
    console.error('Failed to write whitelist groups:', error);
    return false;
  }
};

// Function to read proxy settings from configuration file
export const readProxySettings = async (): Promise<ProxySettings> => {
  try {
    // Check if settings file exists
    if (!fs.existsSync(PROXY_SETTINGS_PATH)) {
      console.error(`Proxy settings not found: ${PROXY_SETTINGS_PATH}`);
      
      // Return default settings
      return {
        nginxConfigPath: NGINX_CONFIG_PATH,
        isReadOnly: false,
        proxyPort: "8080",
        authType: "none"
      };
    }

    const settingsData = fs.readFileSync(PROXY_SETTINGS_PATH, 'utf8');
    return JSON.parse(settingsData) as ProxySettings;
  } catch (error) {
    console.error("Failed to read proxy settings:", error);
    
    // Return default settings on error
    return {
      nginxConfigPath: NGINX_CONFIG_PATH,
      isReadOnly: false,
      proxyPort: "8080",
      authType: "none"
    };
  }
};

// Function to write proxy settings to configuration file
export const writeProxySettings = async (settings: ProxySettings): Promise<boolean> => {
  try {
    const configDir = path.dirname(PROXY_SETTINGS_PATH);
    
    // Create config directory if it doesn't exist
    if (!fs.existsSync(configDir)) {
      fs.mkdirSync(configDir, { recursive: true });
    }
    
    fs.writeFileSync(PROXY_SETTINGS_PATH, JSON.stringify(settings, null, 2));
    return true;
  } catch (error) {
    console.error('Failed to write proxy settings:', error);
    return false;
  }
};

// Function to check Nginx status
export const checkNginxStatus = async (): Promise<NginxStatus> => {
  try {
    // Check if Nginx is running
    const { stdout: statusOutput } = await execAsync('systemctl is-active nginx');
    const isRunning = statusOutput.trim() === 'active';
    
    // Check if Nginx config is valid
    let configTestSuccess = false;
    let configTestMessage = '';
    
    try {
      await execAsync('nginx -t');
      configTestSuccess = true;
      configTestMessage = 'Configuration test successful';
    } catch (error: any) {
      configTestSuccess = false;
      configTestMessage = error.stderr || 'Configuration test failed';
    }
    
    // Check if Nginx config is writable
    const configWritable = fs.accessSync(NGINX_CONFIG_PATH, fs.constants.W_OK) === undefined;
    
    // Get last modified time of the config file
    const stats = fs.statSync(NGINX_CONFIG_PATH);
    
    return {
      isRunning,
      lastConfigTest: {
        success: configTestSuccess,
        message: configTestMessage
      },
      lastModified: stats.mtime.toISOString(),
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
    await execAsync('systemctl reload nginx');
    return true;
  } catch (error) {
    console.error("Failed to reload Nginx:", error);
    return false;
  }
};
