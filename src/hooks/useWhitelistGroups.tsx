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
  addDestinationToGroup: (groupId: string, destination: { value: string; description?: string }) => Promise<void>;
  removeClientFromGroup: (groupId: string, clientId: string) => Promise<void>;
  removeDestinationFromGroup: (groupId: string, destinationId: string) => Promise<void>;
  fetchGroups: () => Promise<void>;
  toggleGroupEnabled: (id: string) => Promise<void>;
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
      
      const response = await axios.get(`${API_BASE_URL}/whitelist-groups?t=${timestamp}`, {
        headers: {
          'Accept': 'application/json',
          'Content-Type': 'application/json',
          'Cache-Control': 'no-cache, no-store, must-revalidate',
          'Pragma': 'no-cache',
          'Expires': '0'
        },
        validateStatus: status => true
      });
      
      console.log("Whitelist groups response status:", response.status);
      console.log("Whitelist groups response data:", response.data);
      
      if (response.status >= 400) {
        throw new Error(`API returned error status: ${response.status}`);
      }
      
      let groupsData: WhitelistGroup[] = [];
      
      if (response.data && Array.isArray(response.data.groups)) {
        groupsData = response.data.groups;
        console.log(`Successfully loaded ${groupsData.length} groups from API`);
      } else if (response.data && Array.isArray(response.data)) {
        groupsData = response.data;
        console.log(`Successfully loaded ${groupsData.length} groups from direct array`);
      } else if (response.data && typeof response.data === 'object') {
        for (const key in response.data) {
          if (Array.isArray(response.data[key])) {
            console.log(`Found array in response.data.${key}, using as groups`);
            groupsData = response.data[key];
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
      
      setGroups([]);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchGroups();
  }, []);

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

  const addGroup = useCallback(async (group: Omit<WhitelistGroup, "id">): Promise<WhitelistGroup> => {
    try {
      setIsLoading(true);
      const newGroup: WhitelistGroup = {
        ...group,
        id: uuidv4(),
      };
      
      console.log("Adding new whitelist group:", newGroup);
      
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
        setGroups(prevGroups => [...prevGroups, returnedGroup]);
        
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
        setGroups(prevGroups => [...prevGroups, newGroup]);
        
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
        setGroups(prevGroups => 
          prevGroups.map(group => group.id === updatedGroup.id ? updatedGroup : group)
        );
        
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
        setGroups(prevGroups => 
          prevGroups.map(group => group.id === updatedGroup.id ? updatedGroup : group)
        );
        
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
      
      setGroups(prevGroups => prevGroups.filter(group => group.id !== id));
      
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
        setGroups(prevGroups => prevGroups.filter(group => group.id !== id));
        
        toast.success("Whitelist group deleted locally", {
          description: "The group has been removed from the local state"
        });
      }
    } catch (err) {
      console.error("Error deleting group:", err);
      
      setGroups(prevGroups => prevGroups.filter(group => group.id !== id));
      
      toast.warning("Group may not be deleted on server", {
        description: "The group has been removed locally but there was an issue with the server."
      });
    } finally {
      setIsLoading(false);
    }
  }, []);

  const getGroupById = useCallback((id: string) => groups.find(group => group.id === id), [groups]);

  const addClient = useCallback(async (groupId: string, client: { value: string; description?: string }) => {
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
    addClient,
    addDestinationToGroup,
    removeClientFromGroup,
    removeDestinationFromGroup,
    fetchGroups,
    toggleGroupEnabled
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
