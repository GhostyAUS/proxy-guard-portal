
import { useState, useCallback, createContext, useContext, ReactNode, useEffect } from "react";
import { WhitelistGroup } from "@/types/proxy";
import { v4 as uuidv4 } from "uuid";
import axios from "axios";
import { useToast } from "@/hooks/use-toast";

const API_BASE_URL = import.meta.env.VITE_API_BASE_URL || "/api";

interface WhitelistGroupsContextType {
  groups: WhitelistGroup[];
  isLoading: boolean;
  error: string | null;
  addGroup: (group: Omit<WhitelistGroup, "id">) => Promise<WhitelistGroup>;
  updateGroup: (updatedGroup: WhitelistGroup) => Promise<void>;
  deleteGroup: (id: string) => Promise<void>;
  getGroupById: (id: string) => WhitelistGroup | undefined;
  addClientToGroup: (groupId: string, client: { value: string; description?: string }) => Promise<void>;
  addDestinationToGroup: (groupId: string, destination: { value: string; description?: string }) => Promise<void>;
  removeClientFromGroup: (groupId: string, clientId: string) => Promise<void>;
  removeDestinationFromGroup: (groupId: string, destinationId: string) => Promise<void>;
  fetchGroups: () => Promise<void>;
}

const WhitelistGroupsContext = createContext<WhitelistGroupsContextType | undefined>(undefined);

export const WhitelistGroupsProvider = ({ children }: { children: ReactNode }) => {
  const [groups, setGroups] = useState<WhitelistGroup[]>([]);
  const [isLoading, setIsLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);
  const { toast } = useToast();

  const fetchGroups = async () => {
    setIsLoading(true);
    try {
      const response = await axios.get(`${API_BASE_URL}/whitelist-groups`);
      setGroups(response.data.groups);
      setError(null);
    } catch (err) {
      console.error("Error fetching whitelist groups:", err);
      setError("Failed to fetch whitelist groups");
      toast({
        title: "Error",
        description: "Failed to fetch whitelist groups",
        variant: "destructive",
      });
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchGroups();
  }, []);

  const addGroup = useCallback(async (group: Omit<WhitelistGroup, "id">): Promise<WhitelistGroup> => {
    try {
      const newGroup: WhitelistGroup = {
        ...group,
        id: uuidv4(),
      };
      
      // In a real application, we would save to the server here
      // For now, just update local state
      setGroups(currentGroups => [...currentGroups, newGroup]);
      
      // Update NGINX configuration
      await generateAndSaveNginxConfig([...groups, newGroup]);
      
      return newGroup;
    } catch (err) {
      console.error("Error adding group:", err);
      toast({
        title: "Error",
        description: "Failed to add whitelist group",
        variant: "destructive",
      });
      throw err;
    }
  }, [groups, toast]);

  const updateGroup = useCallback(async (updatedGroup: WhitelistGroup): Promise<void> => {
    try {
      setGroups(currentGroups => 
        currentGroups.map(group => 
          group.id === updatedGroup.id ? updatedGroup : group
        )
      );
      
      // Update NGINX configuration
      await generateAndSaveNginxConfig(
        groups.map(group => group.id === updatedGroup.id ? updatedGroup : group)
      );
    } catch (err) {
      console.error("Error updating group:", err);
      toast({
        title: "Error",
        description: "Failed to update whitelist group",
        variant: "destructive",
      });
      throw err;
    }
  }, [groups, toast]);

  const deleteGroup = useCallback(async (id: string): Promise<void> => {
    try {
      setGroups(currentGroups => currentGroups.filter(group => group.id !== id));
      
      // Update NGINX configuration
      await generateAndSaveNginxConfig(
        groups.filter(group => group.id !== id)
      );
    } catch (err) {
      console.error("Error deleting group:", err);
      toast({
        title: "Error",
        description: "Failed to delete whitelist group",
        variant: "destructive",
      });
      throw err;
    }
  }, [groups, toast]);

  const getGroupById = useCallback((id: string) => {
    return groups.find(group => group.id === id);
  }, [groups]);

  const addClientToGroup = useCallback(async (groupId: string, client: { value: string; description?: string }): Promise<void> => {
    try {
      const newGroups = groups.map(group => {
        if (group.id === groupId) {
          return {
            ...group,
            clients: [
              ...group.clients,
              { id: uuidv4(), value: client.value, description: client.description }
            ]
          };
        }
        return group;
      });
      
      setGroups(newGroups);
      
      // Update NGINX configuration
      await generateAndSaveNginxConfig(newGroups);
    } catch (err) {
      console.error("Error adding client to group:", err);
      toast({
        title: "Error",
        description: "Failed to add client to group",
        variant: "destructive",
      });
      throw err;
    }
  }, [groups, toast]);

  const addDestinationToGroup = useCallback(async (groupId: string, destination: { value: string; description?: string }): Promise<void> => {
    try {
      const newGroups = groups.map(group => {
        if (group.id === groupId) {
          return {
            ...group,
            destinations: [
              ...group.destinations,
              { id: uuidv4(), value: destination.value, description: destination.description }
            ]
          };
        }
        return group;
      });
      
      setGroups(newGroups);
      
      // Update NGINX configuration
      await generateAndSaveNginxConfig(newGroups);
    } catch (err) {
      console.error("Error adding destination to group:", err);
      toast({
        title: "Error",
        description: "Failed to add destination to group",
        variant: "destructive",
      });
      throw err;
    }
  }, [groups, toast]);

  const removeClientFromGroup = useCallback(async (groupId: string, clientId: string): Promise<void> => {
    try {
      const newGroups = groups.map(group => {
        if (group.id === groupId) {
          return {
            ...group,
            clients: group.clients.filter(client => client.id !== clientId)
          };
        }
        return group;
      });
      
      setGroups(newGroups);
      
      // Update NGINX configuration
      await generateAndSaveNginxConfig(newGroups);
    } catch (err) {
      console.error("Error removing client from group:", err);
      toast({
        title: "Error",
        description: "Failed to remove client from group",
        variant: "destructive",
      });
      throw err;
    }
  }, [groups, toast]);

  const removeDestinationFromGroup = useCallback(async (groupId: string, destinationId: string): Promise<void> => {
    try {
      const newGroups = groups.map(group => {
        if (group.id === groupId) {
          return {
            ...group,
            destinations: group.destinations.filter(destination => destination.id !== destinationId)
          };
        }
        return group;
      });
      
      setGroups(newGroups);
      
      // Update NGINX configuration
      await generateAndSaveNginxConfig(newGroups);
    } catch (err) {
      console.error("Error removing destination from group:", err);
      toast({
        title: "Error",
        description: "Failed to remove destination from group",
        variant: "destructive",
      });
      throw err;
    }
  }, [groups, toast]);

  // Helper function to generate and save NGINX configuration
  const generateAndSaveNginxConfig = async (groups: WhitelistGroup[]) => {
    try {
      // Get current NGINX configuration
      const configResponse = await axios.get(`${API_BASE_URL}/nginx/config`);
      const currentConfig = configResponse.data.config;
      
      // Generate new configuration using the utility function
      const { generateNginxConfig } = await import('@/utils/nginxUtils');
      const newConfig = generateNginxConfig(groups, currentConfig);
      
      // Save the updated configuration
      await axios.post(`${API_BASE_URL}/nginx/save`, {
        config: newConfig,
        configPath: process.env.NGINX_CONFIG_PATH || '/etc/nginx/nginx.conf'
      });
      
      // Reload NGINX to apply changes
      await axios.post(`${API_BASE_URL}/nginx/reload`);
      
      toast({
        title: "Success",
        description: "NGINX configuration updated and reloaded",
      });
    } catch (err) {
      console.error("Error updating NGINX configuration:", err);
      toast({
        title: "Error",
        description: "Failed to update NGINX configuration",
        variant: "destructive",
      });
      throw err;
    }
  };

  const value = {
    groups,
    isLoading,
    error,
    addGroup,
    updateGroup,
    deleteGroup,
    getGroupById,
    addClientToGroup,
    addDestinationToGroup,
    removeClientFromGroup,
    removeDestinationFromGroup,
    fetchGroups
  };

  return (
    <WhitelistGroupsContext.Provider value={value}>
      {children}
    </WhitelistGroupsContext.Provider>
  );
};

export const useWhitelistGroups = () => {
  const context = useContext(WhitelistGroupsContext);
  if (!context) {
    throw new Error("useWhitelistGroups must be used within a WhitelistGroupsProvider");
  }
  return context;
};
