
import React, { createContext, useContext, useCallback, useState, useEffect, ReactNode } from 'react';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { fetchWhitelistGroups } from '@/services/apiService';
import { WhitelistGroup, ClientIP, Destination } from '@/types/proxy';
import axios from 'axios';
import { toast } from 'sonner';

interface WhitelistGroupsContextType {
  data: WhitelistGroup[] | undefined;
  isLoading: boolean;
  error: unknown;
  refetch: () => Promise<void>;
  // Add these missing properties
  groups: WhitelistGroup[];
  fetchGroups: () => Promise<void>;
  commitChanges: () => Promise<boolean>;
  addGroup: (group: Omit<WhitelistGroup, "id">) => Promise<WhitelistGroup>;
  updateGroup: (group: WhitelistGroup) => Promise<void>;
  deleteGroup: (id: string) => Promise<void>;
  getGroupById: (id: string) => WhitelistGroup | undefined;
  addClient: (groupId: string, client: Omit<ClientIP, "id">) => Promise<void>;
  addDestination: (groupId: string, destination: Omit<Destination, "id">) => Promise<void>;
  removeClient: (groupId: string, clientId: string) => Promise<void>;
  removeDestination: (groupId: string, destinationId: string) => Promise<void>;
  toggleGroupEnabled: (groupId: string) => Promise<void>;
}

const WhitelistGroupsContext = createContext<WhitelistGroupsContextType | undefined>(undefined);

const API_BASE_URL = import.meta.env.VITE_API_BASE_URL || "/api";

export function WhitelistGroupsProvider({ children }: { children: ReactNode }) {
  const queryClient = useQueryClient();
  const [groups, setGroups] = useState<WhitelistGroup[]>([]);
  
  const { data, isLoading, error, refetch: tanstackRefetch } = useQuery<WhitelistGroup[]>({
    queryKey: ['whitelistGroups'],
    queryFn: fetchWhitelistGroups,
  });

  useEffect(() => {
    if (data) {
      setGroups(data);
    }
  }, [data]);

  const refetch = useCallback(async () => {
    await tanstackRefetch();
  }, [tanstackRefetch]);
  
  const fetchGroups = useCallback(async () => {
    try {
      await refetch();
      return Promise.resolve();
    } catch (error) {
      console.error("Error fetching whitelist groups:", error);
      return Promise.reject(error);
    }
  }, [refetch]);

  const commitChanges = useCallback(async () => {
    try {
      // In a real application, this would call an API to commit changes
      await axios.post(`${API_BASE_URL}/whitelist/apply`);
      toast.success("Changes applied successfully");
      return true;
    } catch (error) {
      console.error("Error committing changes:", error);
      toast.error("Failed to apply changes");
      return false;
    }
  }, []);

  const addGroup = useCallback(async (group: Omit<WhitelistGroup, "id">) => {
    try {
      const response = await axios.post(`${API_BASE_URL}/whitelist/groups`, group);
      const newGroup = response.data;
      
      // Update local state
      setGroups(prevGroups => [...prevGroups, newGroup]);
      
      return newGroup;
    } catch (error) {
      console.error("Error adding group:", error);
      throw error;
    }
  }, []);

  const updateGroup = useCallback(async (group: WhitelistGroup) => {
    try {
      await axios.put(`${API_BASE_URL}/whitelist/groups/${group.id}`, group);
      
      // Update local state
      setGroups(prevGroups => 
        prevGroups.map(g => g.id === group.id ? group : g)
      );
    } catch (error) {
      console.error("Error updating group:", error);
      throw error;
    }
  }, []);

  const deleteGroup = useCallback(async (id: string) => {
    try {
      await axios.delete(`${API_BASE_URL}/whitelist/groups/${id}`);
      
      // Update local state
      setGroups(prevGroups => prevGroups.filter(g => g.id !== id));
    } catch (error) {
      console.error("Error deleting group:", error);
      throw error;
    }
  }, []);

  const getGroupById = useCallback((id: string) => {
    return groups.find(g => g.id === id);
  }, [groups]);

  const toggleGroupEnabled = useCallback(async (groupId: string) => {
    try {
      const group = groups.find(g => g.id === groupId);
      if (!group) throw new Error("Group not found");
      
      const updatedGroup = { ...group, enabled: !group.enabled };
      await updateGroup(updatedGroup);
    } catch (error) {
      console.error("Error toggling group enabled state:", error);
      throw error;
    }
  }, [groups, updateGroup]);

  const addClient = useCallback(async (groupId: string, client: Omit<ClientIP, "id">) => {
    try {
      const response = await axios.post(`${API_BASE_URL}/whitelist/groups/${groupId}/clients`, client);
      
      // Update local state
      setGroups(prevGroups => 
        prevGroups.map(group => {
          if (group.id === groupId) {
            return {
              ...group,
              clients: [...(group.clients || []), response.data]
            };
          }
          return group;
        })
      );
    } catch (error) {
      console.error("Error adding client:", error);
      throw error;
    }
  }, []);

  const addDestination = useCallback(async (groupId: string, destination: Omit<Destination, "id">) => {
    try {
      const response = await axios.post(`${API_BASE_URL}/whitelist/groups/${groupId}/destinations`, destination);
      
      // Update local state
      setGroups(prevGroups => 
        prevGroups.map(group => {
          if (group.id === groupId) {
            return {
              ...group,
              destinations: [...(group.destinations || []), response.data]
            };
          }
          return group;
        })
      );
    } catch (error) {
      console.error("Error adding destination:", error);
      throw error;
    }
  }, []);

  const removeClient = useCallback(async (groupId: string, clientId: string) => {
    try {
      await axios.delete(`${API_BASE_URL}/whitelist/groups/${groupId}/clients/${clientId}`);
      
      // Update local state
      setGroups(prevGroups => 
        prevGroups.map(group => {
          if (group.id === groupId) {
            return {
              ...group,
              clients: (group.clients || []).filter(client => client.id !== clientId)
            };
          }
          return group;
        })
      );
    } catch (error) {
      console.error("Error removing client:", error);
      throw error;
    }
  }, []);

  const removeDestination = useCallback(async (groupId: string, destinationId: string) => {
    try {
      await axios.delete(`${API_BASE_URL}/whitelist/groups/${groupId}/destinations/${destinationId}`);
      
      // Update local state
      setGroups(prevGroups => 
        prevGroups.map(group => {
          if (group.id === groupId) {
            return {
              ...group,
              destinations: (group.destinations || []).filter(dest => dest.id !== destinationId)
            };
          }
          return group;
        })
      );
    } catch (error) {
      console.error("Error removing destination:", error);
      throw error;
    }
  }, []);

  return (
    <WhitelistGroupsContext.Provider 
      value={{ 
        data, 
        isLoading, 
        error, 
        refetch,
        groups,
        fetchGroups,
        commitChanges,
        addGroup,
        updateGroup,
        deleteGroup,
        getGroupById,
        addClient,
        addDestination,
        removeClient,
        removeDestination,
        toggleGroupEnabled
      }}
    >
      {children}
    </WhitelistGroupsContext.Provider>
  );
}

export function useWhitelistGroups(): WhitelistGroupsContextType {
  const context = useContext(WhitelistGroupsContext);
  if (context === undefined) {
    throw new Error('useWhitelistGroups must be used within a WhitelistGroupsProvider');
  }
  return context;
}
