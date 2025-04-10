
import axios from 'axios';
import { WhitelistGroup, ProxySettings, NginxStatus } from '@/types/proxy';

// Set up API base URL from environment variables
const API_BASE_URL = import.meta.env.VITE_API_BASE_URL || "/api";
const api = axios.create({
  baseURL: API_BASE_URL,
  headers: {
    'Content-Type': 'application/json',
  },
});

export async function fetchWhitelistGroups(): Promise<WhitelistGroup[]> {
  try {
    const response = await api.get('/whitelist/groups');
    console.log("API response for whitelist groups:", response.data);
    
    // Handle both array response and { groups: [...] } structure
    if (Array.isArray(response.data)) {
      return response.data;
    } else if (response.data && Array.isArray(response.data.groups)) {
      return response.data.groups;
    }
    // If neither format is valid, return empty array
    console.warn('Unexpected response format from API:', response.data);
    return [];
  } catch (error) {
    console.error('Error fetching whitelist groups:', error);
    // Return empty array instead of throwing to prevent UI crashes
    return [];
  }
}

export async function fetchNginxStatus(): Promise<NginxStatus> {
  try {
    console.log("Fetching nginx status from:", `${API_BASE_URL}/nginx/status`);
    const response = await api.get('/nginx/status');
    console.log("Nginx status response:", response.data);
    return response.data;
  } catch (error) {
    console.error('Error fetching Nginx status:', error);
    // Return default status with isRunning: false instead of throwing
    return {
      isRunning: false,
      lastModified: new Date().toISOString(),
      lastConfigTest: {
        success: false,
        message: 'Failed to fetch status'
      },
      configWritable: false,
      configExists: false
    };
  }
}

export async function fetchProxySettings(): Promise<ProxySettings> {
  try {
    const response = await api.get('/settings/proxy');
    return response.data;
  } catch (error) {
    console.error('Error fetching proxy settings:', error);
    // Return default settings instead of throwing
    return {
      httpPort: "8080",  // Changed to string
      httpsPort: "8443", // Changed to string
      maxUploadSize: "10m",
      sslCertPath: "/etc/nginx/certs/server.crt"
    };
  }
}

export async function fetchApiRoutes() {
  try {
    console.log("Fetching API routes from:", `${API_BASE_URL}/debug/routes`);
    const response = await api.get('/debug/routes');
    console.log("API routes response:", response.data);
    return response.data.routes || [];
  } catch (error) {
    console.error('Error fetching API routes:', error);
    return [];
  }
}

export default api;
