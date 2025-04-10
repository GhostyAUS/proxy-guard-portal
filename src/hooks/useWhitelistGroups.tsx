
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
      
      // Make API request with detailed error handling
      const response = await axios.get(`${API_BASE_URL}/whitelist-groups`, {
        headers: {
          'Accept': 'application/json',
          'Content-Type': 'application/json',
        },
        validateStatus: status => true // Don't throw for any status code
      });
      
      console.log("Whitelist groups response status:", response.status);
      console.log("Whitelist groups response data:", response.data);
      
      if (response.status >= 400) {
        throw new Error(`API returned error status: ${response.status}`);
      }
      
      if (response.data && Array.isArray(response.data.groups)) {
        setGroups(response.data.groups);
        console.log(`Successfully loaded ${response.data.groups.length} groups from API`);
      } else if (response.data && typeof response.data === 'object' && Object.keys(response.data).includes('groups')) {
        // Handle empty groups array
        if (Array.isArray(response.data.groups)) {
          setGroups(response.data.groups);
          console.log(`API returned empty groups array or ${response.data.groups.length} groups`);
        } else {
          console.warn("API returned non-array for groups:", response.data.groups);
          setGroups([]);
        }
      } else {
        console.warn("API response format unexpected:", response.data);
        
        // Try to extract groups if possible
        if (response.data && typeof response.data === 'object') {
          // If response.data is the groups array itself
          if (Array.isArray(response.data)) {
            console.log(`Found ${response.data.length} groups in direct response array`);
            setGroups(response.data);
          } else {
            // Look for any property that might be the groups array
            for (const key in response.data) {
              if (Array.isArray(response.data[key]) && response.data[key].length > 0 && 
                response.data[key][0] && 'name' in response.data[key][0]) {
                console.log(`Found potential groups array in property '${key}'`);
                setGroups(response.data[key]);
                break;
              }
            }
          }
        }
        
        // If we still haven't found any groups, set empty array
        if (groups.length === 0) {
          console.warn("Could not extract groups from response");
          setGroups([]);
        }
      }
    } catch (err) {
      console.error("Error fetching whitelist groups:", err);
      setError("Failed to fetch whitelist groups");
      toast.error("Failed to load whitelist groups", {
        description: "Could not retrieve groups from the server. Please try again."
      });
      
      // Set empty array on error
      setGroups([]);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchGroups();
  }, []);

  const addGroup = useCallback(async (group: Omit<WhitelistGroup, "id">): Promise<WhitelistGroup> => {
    try {
      setIsLoading(true);
      const newGroup: WhitelistGroup = {
        ...group,
        id: uuidv4(),
      };
      
      console.log("Adding new whitelist group:", newGroup);
      
      // Send to API with detailed error handling
      const response = await axios.post(`${API_BASE_URL}/whitelist-groups`, newGroup, {
        headers: {
          'Accept': 'application/json',
          'Content-Type': 'application/json',
        }
      }).catch(error => {
        console.error("API error response:", error.response?.data || error.message);
        throw error;
      });
      
      if (response.data && response.data.success) {
        // Update local state with the returned group or the one we created
        const returnedGroup = response.data.group || newGroup;
        setGroups(prevGroups => [...prevGroups, returnedGroup]);
        
        // Check if Nginx was reloaded
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
        
        return returnedGroup;
      } else {
        console.error("API returned unsuccessful response:", response.data);
        throw new Error("Failed to save whitelist group");
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
      
      // Send to API with detailed error handling
      const response = await axios.post(`${API_BASE_URL}/whitelist-groups`, updatedGroup, {
        headers: {
          'Accept': 'application/json',
          'Content-Type': 'application/json',
        }
      }).catch(error => {
        console.error("API error response:", error.response?.data || error.message);
        throw error;
      });
      
      if (response.data && response.data.success) {
        // Update local state
        setGroups(prevGroups => 
          prevGroups.map(group => group.id === updatedGroup.id ? updatedGroup : group)
        );
        
        // Check if Nginx was reloaded
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
        console.error("API returned unsuccessful response:", response.data);
        throw new Error("Failed to update whitelist group");
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
      
      // Send to API with detailed error handling
      const response = await axios.delete(`${API_BASE_URL}/whitelist-groups/${id}`, {
        headers: {
          'Accept': 'application/json',
          'Content-Type': 'application/json',
        }
      }).catch(error => {
        console.error("API error response:", error.response?.data || error.message);
        throw error;
      });
      
      console.log("Delete response:", response.data);
      
      if (response.data && response.data.success) {
        // Update local state
        setGroups(prevGroups => prevGroups.filter(group => group.id !== id));
        
        // Check if Nginx was reloaded
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
        console.error("API returned unsuccessful response:", response.data);
        throw new Error("Failed to delete whitelist group");
      }
    } catch (err) {
      console.error("Error deleting group:", err);
      toast.error("Failed to delete whitelist group", {
        description: "Could not remove the group from the server"
      });
      throw err;
    } finally {
      setIsLoading(false);
    }
  }, []);

  const getGroupById = useCallback((id: string) => groups.find(group => group.id === id), [groups]);

  const addClientToGroup = useCallback(async (groupId: string, client: { value: string; description?: string }) => {
    try {
      setIsLoading(true);
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
    } finally {
      setIsLoading(false);
    }
  }, [getGroupById, updateGroup]);

  const addDestinationToGroup = useCallback(async (groupId: string, destination: { value: string; description?: string }) => {
    try {
      setIsLoading(true);
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
    } finally {
      setIsLoading(false);
    }
  }, [getGroupById, updateGroup]);

  const removeClientFromGroup = useCallback(async (groupId: string, clientId: string) => {
    try {
      setIsLoading(true);
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
    } finally {
      setIsLoading(false);
    }
  }, [getGroupById, updateGroup]);

  const removeDestinationFromGroup = useCallback(async (groupId: string, destinationId: string) => {
    try {
      setIsLoading(true);
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
    } finally {
      setIsLoading(false);
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
