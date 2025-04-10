
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
    throw error;
  }
}

export async function fetchNginxStatus(): Promise<NginxStatus> {
  try {
    const response = await api.get('/nginx/status');
    return response.data;
  } catch (error) {
    console.error('Error fetching Nginx status:', error);
    throw error;
  }
}

export async function fetchProxySettings(): Promise<ProxySettings> {
  try {
    const response = await api.get('/settings/proxy');
    return response.data;
  } catch (error) {
    console.error('Error fetching proxy settings:', error);
    throw error;
  }
}

export default api;
