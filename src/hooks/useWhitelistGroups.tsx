
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
    setError(null);
    try {
      console.log("Fetching whitelist groups from API...");
      
      // Make API request with some additional options to prevent HTML responses
      const response = await axios.get(`${API_BASE_URL}/whitelist-groups`, {
        headers: {
          'Accept': 'application/json',
          'Content-Type': 'application/json',
        },
        validateStatus: status => status < 500 // Don't throw for 4xx responses
      });
      
      console.log("Whitelist groups response:", response.data);
      
      if (response.data && Array.isArray(response.data.groups)) {
        setGroups(response.data.groups);
      } else if (response.data && typeof response.data === 'object' && !Array.isArray(response.data.groups)) {
        console.warn("API response format unexpected:", response.data);
        setGroups([]);
        
        // Try to extract groups if possible
        if (Object.keys(response.data).length > 0) {
          const possibleGroups = response.data.groups || [];
          if (Array.isArray(possibleGroups)) {
            setGroups(possibleGroups);
          }
        }
      } else {
        console.warn("API response format unexpected:", response.data);
        setGroups([]);
        
        // Fallback to mock data if API fails
        import('@/utils/mockData').then(module => {
          console.log("Using mock whitelist groups data");
          setGroups(module.mockWhitelistGroups);
        });
      }
    } catch (err) {
      console.error("Error fetching whitelist groups:", err);
      setError("Failed to fetch whitelist groups");
      toast.error("Failed to load whitelist groups", {
        description: "Could not retrieve groups from the server"
      });
      
      // Fallback to mock data if API fails
      import('@/utils/mockData').then(module => {
        console.log("Using mock whitelist groups data due to error");
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
      
      return true;
    } catch (err) {
      console.error("Error updating NGINX configuration:", err);
      toast.error("Failed to update NGINX configuration", {
        description: "Check server logs for details"
      });
      return false;
    }
  };

  const addGroup = useCallback(async (group: Omit<WhitelistGroup, "id">): Promise<WhitelistGroup> => {
    try {
      const newGroup: WhitelistGroup = {
        ...group,
        id: uuidv4(),
      };
      
      console.log("Adding new whitelist group:", newGroup);
      
      // Send to API
      const response = await axios.post(`${API_BASE_URL}/whitelist-groups`, newGroup, {
        headers: {
          'Accept': 'application/json',
          'Content-Type': 'application/json',
        }
      });
      
      if (response.data && response.data.success) {
        // Update local state with the returned group or the one we created
        const returnedGroup = response.data.group || newGroup;
        setGroups(prevGroups => [...prevGroups, returnedGroup]);
        
        // The server now handles Nginx config updates
        toast.success("Whitelist group created", {
          description: `${returnedGroup.name} has been created successfully`
        });
        
        return returnedGroup;
      } else {
        throw new Error("Failed to save whitelist group");
      }
    } catch (err) {
      console.error("Error adding group:", err);
      toast.error("Failed to create whitelist group", {
        description: "Could not save the group to the server"
      });
      throw err;
    }
  }, []);

  const updateGroup = useCallback(async (updatedGroup: WhitelistGroup): Promise<void> => {
    try {
      console.log("Updating whitelist group:", updatedGroup);
      
      // Send to API
      const response = await axios.post(`${API_BASE_URL}/whitelist-groups`, updatedGroup);
      
      if (response.data && response.data.success) {
        // Update local state
        setGroups(prevGroups => 
          prevGroups.map(group => group.id === updatedGroup.id ? updatedGroup : group)
        );
        
        // The server now handles Nginx config updates
        toast.success("Whitelist group updated", {
          description: `${updatedGroup.name} has been updated successfully`
        });
      } else {
        throw new Error("Failed to update whitelist group");
      }
    } catch (err) {
      console.error("Error updating group:", err);
      toast.error("Failed to update whitelist group", {
        description: "Could not save the changes to the server"
      });
      throw err;
    }
  }, []);

  const deleteGroup = useCallback(async (id: string): Promise<void> => {
    try {
      console.log("Deleting whitelist group:", id);
      
      // Send to API
      const response = await axios.delete(`${API_BASE_URL}/whitelist-groups/${id}`);
      
      if (response.data && response.data.success) {
        // Update local state
        setGroups(prevGroups => prevGroups.filter(group => group.id !== id));
        
        // The server now handles Nginx config updates
        toast.success("Whitelist group deleted", {
          description: "The group has been removed successfully"
        });
      } else {
        throw new Error("Failed to delete whitelist group");
      }
    } catch (err) {
      console.error("Error deleting group:", err);
      toast.error("Failed to delete whitelist group", {
        description: "Could not remove the group from the server"
      });
      throw err;
    }
  }, []);

  const getGroupById = useCallback((id: string) => groups.find(group => group.id === id), [groups]);

  const addClientToGroup = useCallback(async (groupId: string, client: { value: string; description?: string }) => {
    try {
      const group = getGroupById(groupId);
      if (!group) throw new Error("Group not found");
      
      const newClient = { id: uuidv4(), value: client.value, description: client.description };
      const updatedGroup = {
        ...group,
        clients: [...group.clients, newClient]
      };
      
      await updateGroup(updatedGroup);
      return;
    } catch (err) {
      console.error("Error adding client to group:", err);
      toast.error("Failed to add client to group");
      throw err;
    }
  }, [getGroupById, updateGroup]);

  const addDestinationToGroup = useCallback(async (groupId: string, destination: { value: string; description?: string }) => {
    try {
      const group = getGroupById(groupId);
      if (!group) throw new Error("Group not found");
      
      const newDestination = { id: uuidv4(), value: destination.value, description: destination.description };
      const updatedGroup = {
        ...group,
        destinations: [...group.destinations, newDestination]
      };
      
      await updateGroup(updatedGroup);
      return;
    } catch (err) {
      console.error("Error adding destination to group:", err);
      toast.error("Failed to add destination to group");
      throw err;
    }
  }, [getGroupById, updateGroup]);

  const removeClientFromGroup = useCallback(async (groupId: string, clientId: string) => {
    try {
      const group = getGroupById(groupId);
      if (!group) throw new Error("Group not found");
      
      const updatedGroup = {
        ...group,
        clients: group.clients.filter(client => client.id !== clientId)
      };
      
      await updateGroup(updatedGroup);
      return;
    } catch (err) {
      console.error("Error removing client from group:", err);
      toast.error("Failed to remove client from group");
      throw err;
    }
  }, [getGroupById, updateGroup]);

  const removeDestinationFromGroup = useCallback(async (groupId: string, destinationId: string) => {
    try {
      const group = getGroupById(groupId);
      if (!group) throw new Error("Group not found");
      
      const updatedGroup = {
        ...group,
        destinations: group.destinations.filter(destination => destination.id !== destinationId)
      };
      
      await updateGroup(updatedGroup);
      return;
    } catch (err) {
      console.error("Error removing destination from group:", err);
      toast.error("Failed to remove destination from group");
      throw err;
    }
  }, [getGroupById, updateGroup]);

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
