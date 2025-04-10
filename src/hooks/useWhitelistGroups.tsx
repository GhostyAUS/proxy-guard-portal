import { useState, useCallback, createContext, useContext, ReactNode, useEffect } from "react";
import { WhitelistGroup } from "@/types/proxy";
import { v4 as uuidv4 } from "uuid";
import axios from "axios";
import { useToast } from "@/hooks/use-toast";
import { toast } from "sonner";

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
  const { toast: shadowToast } = useToast();

  const fetchGroups = async () => {
    setIsLoading(true);
    try {
      console.log("Fetching whitelist groups from API...");
      const response = await axios.get(`${API_BASE_URL}/whitelist-groups`);
      console.log("Whitelist groups response:", response.data);
      setGroups(response.data.groups || []);
      setError(null);
    } catch (err) {
      console.error("Error fetching whitelist groups:", err);
      setError("Failed to fetch whitelist groups");
      shadowToast({
        title: "Error",
        description: "Failed to fetch whitelist groups",
        variant: "destructive",
      });
      
      // Fallback to mock data if API fails
      import('@/utils/mockData').then(module => {
        console.log("Using mock whitelist groups data");
        setGroups(module.mockWhitelistGroups);
      });
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchGroups();
  }, []);

  const generateAndSaveNginxConfig = async (updatedGroups: WhitelistGroup[]) => {
    try {
      console.log("Generating and saving NGINX configuration...");
      // Get current NGINX configuration template
      const { DEFAULT_NGINX_TEMPLATE } = await import('@/utils/nginxUtils');
      
      // Generate new configuration
      const { generateNginxConfig } = await import('@/utils/nginxUtils');
      const newConfig = generateNginxConfig(updatedGroups, DEFAULT_NGINX_TEMPLATE);
      
      // Save the updated configuration
      console.log("Saving NGINX configuration...");
      await axios.post(`${API_BASE_URL}/nginx/save`, {
        config: newConfig,
        configPath: '/etc/nginx/nginx.conf'
      });
      
      // Reload NGINX to apply changes
      console.log("Reloading NGINX...");
      await axios.post(`${API_BASE_URL}/nginx/reload`);
      
      console.log("NGINX configuration updated and reloaded successfully");
      toast.success("NGINX configuration updated", {
        description: "Changes have been applied successfully"
      });
    } catch (err) {
      console.error("Error updating NGINX configuration:", err);
      toast.error("Failed to update NGINX configuration", {
        description: "Check server logs for details"
      });
    }
  };

  const addGroup = useCallback(async (group: Omit<WhitelistGroup, "id">): Promise<WhitelistGroup> => {
    try {
      const newGroup: WhitelistGroup = {
        ...group,
        id: uuidv4(),
      };
      
      const newGroups = [...groups, newGroup];
      setGroups(newGroups);
      
      // Update NGINX configuration
      await generateAndSaveNginxConfig(newGroups);
      
      return newGroup;
    } catch (err) {
      console.error("Error adding group:", err);
      shadowToast({
        title: "Error",
        description: "Failed to add whitelist group",
        variant: "destructive",
      });
      throw err;
    }
  }, [groups, shadowToast]);

  const updateGroup = useCallback(async (updatedGroup: WhitelistGroup): Promise<void> => {
    try {
      const newGroups = groups.map(group => 
        group.id === updatedGroup.id ? updatedGroup : group
      );
      
      setGroups(newGroups);
      
      // Update NGINX configuration
      await generateAndSaveNginxConfig(newGroups);
    } catch (err) {
      console.error("Error updating group:", err);
      shadowToast({
        title: "Error",
        description: "Failed to update whitelist group",
        variant: "destructive",
      });
      throw err;
    }
  }, [groups, shadowToast]);

  const deleteGroup = useCallback(async (id: string): Promise<void> => {
    try {
      const newGroups = groups.filter(group => group.id !== id);
      setGroups(newGroups);
      
      // Update NGINX configuration
      await generateAndSaveNginxConfig(newGroups);
    } catch (err) {
      console.error("Error deleting group:", err);
      shadowToast({
        title: "Error",
        description: "Failed to delete whitelist group",
        variant: "destructive",
      });
      throw err;
    }
  }, [groups, shadowToast]);

  const getGroupById = useCallback((id: string) => groups.find(group => group.id === id), [groups]);

  const addClientToGroup = useCallback(async (groupId: string, client: { value: string; description?: string }) => {
    try {
      const newGroups = groups.map(group => {
        if (group.id === groupId) {
          return {
            ...group,
            clients: [...group.clients, { id: uuidv4(), value: client.value, description: client.description }]
          };
        }
        return group;
      });
      
      setGroups(newGroups);
      await generateAndSaveNginxConfig(newGroups);
    } catch (err) {
      console.error("Error adding client to group:", err);
      shadowToast({
        title: "Error",
        description: "Failed to add client to group",
        variant: "destructive",
      });
      throw err;
    }
  }, [groups, shadowToast]);

  const addDestinationToGroup = useCallback(async (groupId: string, destination: { value: string; description?: string }) => {
    try {
      const newGroups = groups.map(group => {
        if (group.id === groupId) {
          return {
            ...group,
            destinations: [...group.destinations, { id: uuidv4(), value: destination.value, description: destination.description }]
          };
        }
        return group;
      });
      
      setGroups(newGroups);
      await generateAndSaveNginxConfig(newGroups);
    } catch (err) {
      console.error("Error adding destination to group:", err);
      shadowToast({
        title: "Error",
        description: "Failed to add destination to group",
        variant: "destructive",
      });
      throw err;
    }
  }, [groups, shadowToast]);

  const removeClientFromGroup = useCallback(async (groupId: string, clientId: string) => {
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
      await generateAndSaveNginxConfig(newGroups);
    } catch (err) {
      console.error("Error removing client from group:", err);
      shadowToast({
        title: "Error",
        description: "Failed to remove client from group",
        variant: "destructive",
      });
      throw err;
    }
  }, [groups, shadowToast]);

  const removeDestinationFromGroup = useCallback(async (groupId: string, destinationId: string) => {
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
      await generateAndSaveNginxConfig(newGroups);
    } catch (err) {
      console.error("Error removing destination from group:", err);
      shadowToast({
        title: "Error",
        description: "Failed to remove destination from group",
        variant: "destructive",
      });
      throw err;
    }
  }, [groups, shadowToast]);

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
