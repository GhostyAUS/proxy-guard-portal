
import { WhitelistGroup, ProxySettings, NginxStatus } from "@/types/proxy";

// Base API URL for server operations - use a relative path to avoid CORS issues
const API_BASE_URL = '/api';

// Function to read whitelist groups from configuration file via the API
export const readWhitelistGroups = async (): Promise<WhitelistGroup[]> => {
  try {
    // Call the API endpoint
    const response = await fetch(`${API_BASE_URL}/whitelist`, {
      headers: {
        'Cache-Control': 'no-cache',
        'Pragma': 'no-cache'
      }
    });
    
    if (!response.ok) {
      throw new Error(`API error: ${response.status}`);
    }
    
    return await response.json();
  } catch (error) {
    console.error("Failed to read whitelist groups:", error);
    throw error;
  }
};

// Function to write whitelist groups to configuration file via the API
export const writeWhitelistGroups = async (groups: WhitelistGroup[]): Promise<boolean> => {
  try {
    // Call the API endpoint
    const response = await fetch(`${API_BASE_URL}/whitelist`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(groups),
    });
    
    if (!response.ok) {
      const errorData = await response.json().catch(() => ({}));
      throw new Error(`API error: ${response.status} - ${errorData.error || 'Unknown error'}`);
    }
    
    return true;
  } catch (error) {
    console.error('Failed to write whitelist groups:', error);
    throw error;
  }
};

// Function to read proxy settings from configuration file via the API
export const readProxySettings = async (): Promise<ProxySettings> => {
  try {
    // Call the API endpoint
    const response = await fetch(`${API_BASE_URL}/settings`, {
      headers: {
        'Cache-Control': 'no-cache',
        'Pragma': 'no-cache'
      }
    });
    
    if (!response.ok) {
      throw new Error(`API error: ${response.status}`);
    }
    
    return await response.json();
  } catch (error) {
    console.error("Failed to read proxy settings:", error);
    throw error;
  }
};

// Function to write proxy settings to configuration file via the API
export const writeProxySettings = async (settings: ProxySettings): Promise<boolean> => {
  try {
    // Call the API endpoint
    const response = await fetch(`${API_BASE_URL}/settings`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(settings),
    });
    
    if (!response.ok) {
      const errorData = await response.json().catch(() => ({}));
      throw new Error(`API error: ${response.status} - ${errorData.error || 'Unknown error'}`);
    }
    
    return true;
  } catch (error) {
    console.error('Failed to write proxy settings:', error);
    throw error;
  }
};

// Function to check Nginx status via the API
export const checkNginxStatus = async (): Promise<NginxStatus> => {
  try {
    // Call the API endpoint
    const response = await fetch(`${API_BASE_URL}/nginx/status`, {
      headers: {
        'Cache-Control': 'no-cache',
        'Pragma': 'no-cache'
      }
    });
    
    if (!response.ok) {
      throw new Error(`API error: ${response.status}`);
    }
    
    return await response.json();
  } catch (error) {
    console.error("Failed to check Nginx status:", error);
    throw error;
  }
};

// Function to reload Nginx configuration via the API
export const reloadNginxConfig = async (): Promise<boolean> => {
  try {
    // Call the API endpoint
    const response = await fetch(`${API_BASE_URL}/nginx/reload`, {
      method: 'POST',
    });
    
    if (!response.ok) {
      const errorData = await response.json().catch(() => ({}));
      throw new Error(`API error: ${response.status} - ${errorData.error || 'Unknown error'}`);
    }
    
    return true;
  } catch (error) {
    console.error("Failed to reload Nginx:", error);
    throw error;
  }
};
