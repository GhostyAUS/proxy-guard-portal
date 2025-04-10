
import axios from "axios";
import { WhitelistGroup, ProxySettings } from "@/types/proxy";

// API base URL
const API_BASE_URL = import.meta.env.VITE_API_BASE_URL || "/api";

// API client
const api = axios.create({
  baseURL: API_BASE_URL,
  headers: {
    "Content-Type": "application/json",
  },
});

// Fetch whitelist groups
export const fetchWhitelistGroups = async (): Promise<WhitelistGroup[]> => {
  try {
    const response = await api.get("/whitelist/groups");
    return response.data;
  } catch (error) {
    console.error("Error fetching whitelist groups:", error);
    throw error;
  }
};

// Fetch proxy settings
export const fetchProxySettings = async (): Promise<ProxySettings> => {
  try {
    const response = await api.get("/settings");
    return response.data;
  } catch (error) {
    console.error("Error fetching proxy settings:", error);
    throw error;
  }
};

// Create whitelist group
export const createWhitelistGroup = async (group: Omit<WhitelistGroup, "id">): Promise<WhitelistGroup> => {
  const response = await api.post("/whitelist/groups", group);
  return response.data;
};

// Update whitelist group
export const updateWhitelistGroup = async (group: WhitelistGroup): Promise<WhitelistGroup> => {
  const response = await api.put(`/whitelist/groups/${group.id}`, group);
  return response.data;
};

// Delete whitelist group
export const deleteWhitelistGroup = async (id: string): Promise<void> => {
  await api.delete(`/whitelist/groups/${id}`);
};

// Apply configuration
export const applyConfiguration = async (): Promise<boolean> => {
  const response = await api.post("/whitelist/apply");
  return response.data.success === true;
};

export default api;
