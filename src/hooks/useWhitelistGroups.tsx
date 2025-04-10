
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
  addClient: (groupId: string, client: { value: string; description?: string }) => Promise<void>;
  addDestination: (groupId: string, destination: { value: string; description?: string }) => Promise<void>;
  removeClient: (groupId: string, clientId: string) => Promise<void>;
  removeDestination: (groupId: string, destinationId: string) => Promise<void>;
  fetchGroups: () => Promise<void>;
  toggleGroupEnabled: (id: string) => Promise<void>;
  commitChanges: () => Promise<boolean>;
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
      
      const timestamp = new Date().getTime();
      
      // Modified to use explicit Accept header and handle text/html responses
      const response = await axios.get(`${API_BASE_URL}/whitelist-groups?t=${timestamp}`, {
        headers: {
          'Accept': 'application/json',
          'Content-Type': 'application/json',
          'Cache-Control': 'no-cache, no-store, must-revalidate',
          'Pragma': 'no-cache',
          'Expires': '0'
        },
        responseType: 'text', // First get as text to check if it's HTML
        validateStatus: status => true
      });
      
      console.log("Whitelist groups response status:", response.status);
      
      // Check if response appears to be HTML
      const responseText = response.data;
      const isHtml = typeof responseText === 'string' && responseText.trim().startsWith('<!DOCTYPE html>');
      
      if (isHtml) {
        console.log("API returned HTML instead of JSON");
        throw new Error("Invalid API response format. Server returned HTML instead of JSON.");
      }
      
      // Now parse as JSON if it's not HTML
      let responseData;
      try {
        responseData = typeof responseText === 'string' ? JSON.parse(responseText) : responseText;
        console.log("Whitelist groups response data:", responseData);
      } catch (e) {
        console.error("Failed to parse response as JSON:", e);
        throw new Error("Invalid JSON response from API");
      }
      
      if (response.status >= 400) {
        throw new Error(`API returned error status: ${response.status}`);
      }
      
      let groupsData: WhitelistGroup[] = [];
      
      if (responseData && Array.isArray(responseData.groups)) {
        groupsData = responseData.groups;
        console.log(`Successfully loaded ${groupsData.length} groups from API`);
      } else if (responseData && Array.isArray(responseData)) {
        groupsData = responseData;
        console.log(`Successfully loaded ${groupsData.length} groups from direct array`);
      } else if (responseData && typeof responseData === 'object') {
        for (const key in responseData) {
          if (Array.isArray(responseData[key])) {
            console.log(`Found array in response.data.${key}, using as groups`);
            groupsData = responseData[key];
            break;
          }
        }
      }
      
      const sanitizedGroups = groupsData.map(group => ({
        ...group,
        id: group.id || uuidv4(),
        name: group.name || 'Unnamed Group',
        description: group.description || '',
        clients: Array.isArray(group.clients) ? group.clients : [],
        destinations: Array.isArray(group.destinations) ? group.destinations : [],
        enabled: typeof group.enabled === 'boolean' ? group.enabled : true
      }));
      
      setGroups(sanitizedGroups);
      
    } catch (err) {
      console.error("Error fetching whitelist groups:", err);
      setError("Failed to fetch whitelist groups");
      toast.error("Failed to load whitelist groups", {
        description: "Could not retrieve groups from the server. Please try again."
      });
      
      // Use mock data in development environment as fallback
      if (import.meta.env.DEV) {
        const mockGroups: WhitelistGroup[] = [
          {
            id: "mock-group-1",
            name: "Development Mock Group",
            description: "This is a mock group for development",
            clients: [
              { id: "mock-client-1", value: "192.168.1.1", description: "Mock Client 1" },
              { id: "mock-client-2", value: "10.0.0.0/24", description: "Mock Network" }
            ],
            destinations: [
              { id: "mock-dest-1", value: "example.com", description: "Example Site" },
              { id: "mock-dest-2", value: "*.google.com", description: "Google Sites" }
            ],
            enabled: true
          }
        ];
        console.log("Using mock data for development:", mockGroups);
        setGroups(mockGroups);
      } else {
        setGroups([]);
      }
    } finally {
      setIsLoading(false);
    }
  };

  // Add new function to commit changes to nginx.conf and reload nginx
  const commitChanges = async (): Promise<boolean> => {
    try {
      setIsLoading(true);
      console.log("Committing whitelist changes to nginx.conf...");

      // Get the current nginx.conf template
      const templateResponse = await axios.get(`${API_BASE_URL}/nginx/config`, {
        headers: {
          'Accept': 'application/json',
          'Content-Type': 'application/json',
          'Cache-Control': 'no-cache'
        },
        responseType: 'json'
      });

      if (!templateResponse.data || !templateResponse.data.config) {
        throw new Error("Could not retrieve nginx config template");
      }

      // Use the imported function to generate nginx config
      const { generateNginxConfig } = await import('@/utils/nginxUtils');
      const newConfig = generateNginxConfig(groups, templateResponse.data.config);

      // Save the new config
      const saveResponse = await axios.post(`${API_BASE_URL}/nginx/save`, {
        config: newConfig,
        configPath: '/etc/nginx/nginx.conf'
      }, {
        headers: {
          'Accept': 'application/json',
          'Content-Type': 'application/json'
        }
      });

      if (!saveResponse.data || !saveResponse.data.success) {
        throw new Error("Failed to save nginx configuration");
      }

      // Reload nginx
      const reloadResponse = await axios.post(`${API_BASE_URL}/nginx/reload`, {}, {
        headers: {
          'Accept': 'application/json',
          'Content-Type': 'application/json'
        }
      });

      if (!reloadResponse.data || !reloadResponse.data.success) {
        throw new Error("Failed to reload nginx service");
      }

      toast.success("Changes committed successfully", {
        description: "All whitelist changes have been applied to the nginx configuration"
      });

      return true;
    } catch (err) {
      console.error("Error committing nginx changes:", err);
      toast.error("Failed to commit changes", {
        description: "Could not apply changes to the nginx configuration. Please try again."
      });
      return false;
    } finally {
      setIsLoading(false);
    }
  };

  const toggleGroupEnabled = useCallback(async (id: string): Promise<void> => {
    try {
      setIsLoading(true);
      console.log("Toggling whitelist group enabled status:", id);
      
      const timestamp = new Date().getTime();
      const response = await axios.patch(`${API_BASE_URL}/whitelist-groups/${id}/toggle?t=${timestamp}`, {}, {
        headers: {
          'Accept': 'application/json',
          'Content-Type': 'application/json',
          'Cache-Control': 'no-cache'
        }
      }).catch(error => {
        console.error("API error response:", error.response?.data || error.message);
        throw error;
      });
      
      console.log("Toggle response:", response.data);
      
      if (response.data && response.data.success) {
        const updatedGroup = response.data.group;
        setGroups(prevGroups => 
          prevGroups.map(group => group.id === id ? updatedGroup : group)
        );
        
        toast.success(
          updatedGroup.enabled ? "Group enabled" : "Group disabled", 
          { description: `${updatedGroup.name} has been ${updatedGroup.enabled ? 'enabled' : 'disabled'}` }
        );
      } else {
        setGroups(prevGroups => 
          prevGroups.map(group => {
            if (group.id === id) {
              return { ...group, enabled: !group.enabled };
            }
            return group;
          })
        );
        
        const group = groups.find(g => g.id === id);
        if (group) {
          toast.success(
            !group.enabled ? "Group enabled" : "Group disabled", 
            { description: `${group.name} has been ${!group.enabled ? 'enabled' : 'disabled'}` }
          );
        }
      }
    } catch (err) {
      console.error("Error toggling group:", err);
      toast.error("Failed to update group status");
      throw err;
    } finally {
      setIsLoading(false);
    }
  }, [groups]);

  // Fix the addGroup function to ensure new group is immediately available for client/destination additions
  const addGroup = useCallback(async (group: Omit<WhitelistGroup, "id">): Promise<WhitelistGroup> => {
    try {
      setIsLoading(true);
      // Generate ID immediately to ensure it's available for subsequent operations
      const newGroupId = uuidv4();
      
      const newGroup: WhitelistGroup = {
        ...group,
        id: newGroupId,
      };
      
      console.log("Adding new whitelist group:", newGroup);
      
      // Immediately update state to make the group available for operations
      setGroups(prevGroups => [...prevGroups, newGroup]);
      
      const timestamp = new Date().getTime();
      const response = await axios.post(`${API_BASE_URL}/whitelist-groups?t=${timestamp}`, newGroup, {
        headers: {
          'Accept': 'application/json',
          'Content-Type': 'application/json',
          'Cache-Control': 'no-cache'
        }
      }).catch(error => {
        console.error("API error response:", error.response?.data || error.message);
        throw error;
      });
      
      if (response.data && response.data.success) {
        const returnedGroup = response.data.group || newGroup;
        
        // Update the state with the returned group data, preserving our ID
        setGroups(prevGroups => prevGroups.map(g => 
          g.id === newGroup.id ? { ...returnedGroup, id: newGroup.id } : g
        ));
        
        if (response.data.nginxReloaded === false) {
          console.warn("Nginx was not reloaded:", response.data.error);
          toast.warning("Group created but Nginx configuration not updated", {
            description: "The group was saved but there was an issue updating the Nginx configuration."
          });
        } else {
          toast.success("Whitelist group created", {
            description: `${returnedGroup.name} has been created successfully`
          });
        }
        
        return { ...returnedGroup, id: newGroup.id };
      } else {
        toast.success("Whitelist group created locally", {
          description: `${newGroup.name} has been created successfully (locally)`
        });
        
        return newGroup;
      }
    } catch (err) {
      console.error("Error adding group:", err);
      toast.error("Failed to create whitelist group", {
        description: "Could not save the group to the server"
      });
      throw err;
    } finally {
      setIsLoading(false);
    }
  }, []);

  const updateGroup = useCallback(async (updatedGroup: WhitelistGroup): Promise<void> => {
    try {
      setIsLoading(true);
      console.log("Updating whitelist group:", updatedGroup);
      
      // Update local state immediately
      setGroups(prevGroups => 
        prevGroups.map(group => group.id === updatedGroup.id ? updatedGroup : group)
      );
      
      const timestamp = new Date().getTime();
      const response = await axios.post(`${API_BASE_URL}/whitelist-groups?t=${timestamp}`, updatedGroup, {
        headers: {
          'Accept': 'application/json',
          'Content-Type': 'application/json',
          'Cache-Control': 'no-cache'
        }
      }).catch(error => {
        console.error("API error response:", error.response?.data || error.message);
        throw error;
      });
      
      if (response.data && response.data.success) {
        if (response.data.nginxReloaded === false) {
          console.warn("Nginx was not reloaded:", response.data.error);
          toast.warning("Group updated but Nginx configuration not updated", {
            description: "The group was saved but there was an issue updating the Nginx configuration."
          });
        } else {
          toast.success("Whitelist group updated", {
            description: `${updatedGroup.name} has been updated successfully`
          });
        }
      } else {
        toast.success("Whitelist group updated locally", {
          description: `${updatedGroup.name} has been updated successfully (locally)`
        });
      }
    } catch (err) {
      console.error("Error updating group:", err);
      toast.error("Failed to update whitelist group", {
        description: "Could not save the changes to the server"
      });
      throw err;
    } finally {
      setIsLoading(false);
    }
  }, []);

  const deleteGroup = useCallback(async (id: string): Promise<void> => {
    try {
      setIsLoading(true);
      console.log("Deleting whitelist group:", id);
      
      // Remove from local state immediately
      setGroups(prevGroups => prevGroups.filter(group => group.id !== id));
      
      const timestamp = new Date().getTime();
      const response = await axios.delete(`${API_BASE_URL}/whitelist-groups/${id}?t=${timestamp}`, {
        headers: {
          'Accept': 'application/json',
          'Content-Type': 'application/json',
          'Cache-Control': 'no-cache'
        }
      }).catch(error => {
        console.error("API error response:", error.response?.data || error.message);
        throw error;
      });
      
      console.log("Delete response:", response?.data);
      
      if (response.data && response.data.success) {
        if (response.data.nginxReloaded === false) {
          console.warn("Nginx was not reloaded:", response.data.error);
          toast.warning("Group deleted but Nginx configuration not updated", {
            description: "The group was removed but there was an issue updating the Nginx configuration."
          });
        } else {
          toast.success("Whitelist group deleted", {
            description: "The group has been removed successfully"
          });
        }
      } else {
        toast.success("Whitelist group deleted locally", {
          description: "The group has been removed from the local state"
        });
      }
    } catch (err) {
      console.error("Error deleting group:", err);
      
      toast.warning("Group may not be deleted on server", {
        description: "The group has been removed locally but there was an issue with the server."
      });
    } finally {
      setIsLoading(false);
    }
  }, []);

  // Fix getGroupById to better handle undefined cases and add debugging
  const getGroupById = useCallback((id: string) => {
    const group = groups.find(group => group.id === id);
    if (!group) {
      console.warn(`Group not found with id: ${id}. Available groups:`, groups.map(g => ({id: g.id, name: g.name})));
    }
    return group;
  }, [groups]);

  // Fix addClient to handle not found cases gracefully
  const addClient = useCallback(async (groupId: string, client: { value: string; description?: string }): Promise<void> => {
    try {
      setIsLoading(true);
      const group = getGroupById(groupId);
      
      if (!group) {
        console.error(`Cannot add client to non-existent group with ID: ${groupId}`);
        console.log("Available groups:", groups.map(g => ({id: g.id, name: g.name})));
        throw new Error(`Group not found with ID: ${groupId}`);
      }
      
      const newClient = { id: uuidv4(), value: client.value, description: client.description };
      const updatedGroup = {
        ...group,
        clients: [...group.clients, newClient]
      };
      
      await updateGroup(updatedGroup);
    } catch (err) {
      console.error("Error adding client to group:", err);
      toast.error("Failed to add client to group");
      throw err;
    } finally {
      setIsLoading(false);
    }
  }, [getGroupById, updateGroup, groups]);

  const addDestination = useCallback(async (groupId: string, destination: { value: string; description?: string }): Promise<void> => {
    try {
      setIsLoading(true);
      const group = getGroupById(groupId);
      
      if (!group) {
        console.error(`Cannot add destination to non-existent group with ID: ${groupId}`);
        console.log("Available groups:", groups.map(g => ({id: g.id, name: g.name})));
        throw new Error(`Group not found with ID: ${groupId}`);
      }
      
      const newDestination = { id: uuidv4(), value: destination.value, description: destination.description };
      const updatedGroup = {
        ...group,
        destinations: [...group.destinations, newDestination]
      };
      
      await updateGroup(updatedGroup);
    } catch (err) {
      console.error("Error adding destination to group:", err);
      toast.error("Failed to add destination to group");
      throw err;
    } finally {
      setIsLoading(false);
    }
  }, [getGroupById, updateGroup, groups]);

  const removeClient = useCallback(async (groupId: string, clientId: string): Promise<void> => {
    try {
      setIsLoading(true);
      const group = getGroupById(groupId);
      
      if (!group) {
        console.error(`Cannot remove client from non-existent group with ID: ${groupId}`);
        throw new Error("Group not found");
      }
      
      const updatedGroup = {
        ...group,
        clients: group.clients.filter(client => client.id !== clientId)
      };
      
      await updateGroup(updatedGroup);
    } catch (err) {
      console.error("Error removing client from group:", err);
      toast.error("Failed to remove client from group");
      throw err;
    } finally {
      setIsLoading(false);
    }
  }, [getGroupById, updateGroup]);

  const removeDestination = useCallback(async (groupId: string, destinationId: string): Promise<void> => {
    try {
      setIsLoading(true);
      const group = getGroupById(groupId);
      
      if (!group) {
        console.error(`Cannot remove destination from non-existent group with ID: ${groupId}`);
        throw new Error("Group not found");
      }
      
      const updatedGroup = {
        ...group,
        destinations: group.destinations.filter(destination => destination.id !== destinationId)
      };
      
      await updateGroup(updatedGroup);
    } catch (err) {
      console.error("Error removing destination from group:", err);
      toast.error("Failed to remove destination from group");
      throw err;
    } finally {
      setIsLoading(false);
    }
  }, [getGroupById, updateGroup]);

  useEffect(() => {
    fetchGroups();
  }, []);

  const value = {
    groups,
    isLoading,
    error,
    addGroup,
    updateGroup,
    deleteGroup,
    getGroupById,
    addClient,
    addDestination,
    removeClient,
    removeDestination,
    fetchGroups,
    toggleGroupEnabled,
    commitChanges
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
