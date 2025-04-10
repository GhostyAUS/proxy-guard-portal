
import { useState, useCallback, createContext, useContext, ReactNode } from "react";
import { WhitelistGroup } from "@/types/proxy";
import { mockWhitelistGroups } from "@/utils/mockData";
import { v4 as uuidv4 } from "uuid";

interface WhitelistGroupsContextType {
  groups: WhitelistGroup[];
  addGroup: (group: Omit<WhitelistGroup, "id">) => WhitelistGroup;
  updateGroup: (updatedGroup: WhitelistGroup) => void;
  deleteGroup: (id: string) => void;
  getGroupById: (id: string) => WhitelistGroup | undefined;
  addClientToGroup: (groupId: string, client: { value: string; description?: string }) => void;
  addDestinationToGroup: (groupId: string, destination: { value: string; description?: string }) => void;
  removeClientFromGroup: (groupId: string, clientId: string) => void;
  removeDestinationFromGroup: (groupId: string, destinationId: string) => void;
}

const WhitelistGroupsContext = createContext<WhitelistGroupsContextType | undefined>(undefined);

export const WhitelistGroupsProvider = ({ children }: { children: ReactNode }) => {
  const [groups, setGroups] = useState<WhitelistGroup[]>(mockWhitelistGroups);

  const addGroup = useCallback((group: Omit<WhitelistGroup, "id">) => {
    const newGroup: WhitelistGroup = {
      ...group,
      id: uuidv4(),
    };
    
    setGroups(currentGroups => [...currentGroups, newGroup]);
    return newGroup;
  }, []);

  const updateGroup = useCallback((updatedGroup: WhitelistGroup) => {
    setGroups(currentGroups => 
      currentGroups.map(group => 
        group.id === updatedGroup.id ? updatedGroup : group
      )
    );
  }, []);

  const deleteGroup = useCallback((id: string) => {
    setGroups(currentGroups => currentGroups.filter(group => group.id !== id));
  }, []);

  const getGroupById = useCallback((id: string) => {
    return groups.find(group => group.id === id);
  }, [groups]);

  const addClientToGroup = useCallback((groupId: string, client: { value: string; description?: string }) => {
    setGroups(currentGroups => 
      currentGroups.map(group => {
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
      })
    );
  }, []);

  const addDestinationToGroup = useCallback((groupId: string, destination: { value: string; description?: string }) => {
    setGroups(currentGroups => 
      currentGroups.map(group => {
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
      })
    );
  }, []);

  const removeClientFromGroup = useCallback((groupId: string, clientId: string) => {
    setGroups(currentGroups => 
      currentGroups.map(group => {
        if (group.id === groupId) {
          return {
            ...group,
            clients: group.clients.filter(client => client.id !== clientId)
          };
        }
        return group;
      })
    );
  }, []);

  const removeDestinationFromGroup = useCallback((groupId: string, destinationId: string) => {
    setGroups(currentGroups => 
      currentGroups.map(group => {
        if (group.id === groupId) {
          return {
            ...group,
            destinations: group.destinations.filter(destination => destination.id !== destinationId)
          };
        }
        return group;
      })
    );
  }, []);

  const value = {
    groups,
    addGroup,
    updateGroup,
    deleteGroup,
    getGroupById,
    addClientToGroup,
    addDestinationToGroup,
    removeClientFromGroup,
    removeDestinationFromGroup
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
    // If this hook is called outside of a provider, fallback to local state
    const [groups, setGroups] = useState<WhitelistGroup[]>(mockWhitelistGroups);
    
    const addGroup = (group: Omit<WhitelistGroup, "id">) => {
      const newGroup = {
        ...group,
        id: uuidv4(),
      };
      setGroups(prev => [...prev, newGroup]);
      return newGroup;
    };

    const updateGroup = (updatedGroup: WhitelistGroup) => {
      setGroups(prev => 
        prev.map(group => group.id === updatedGroup.id ? updatedGroup : group)
      );
    };

    const deleteGroup = (id: string) => {
      setGroups(prev => prev.filter(group => group.id !== id));
    };

    const getGroupById = (id: string) => {
      return groups.find(group => group.id === id);
    };

    const addClientToGroup = (groupId: string, client: { value: string; description?: string }) => {
      setGroups(prev => 
        prev.map(group => {
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
        })
      );
    };

    const addDestinationToGroup = (groupId: string, destination: { value: string; description?: string }) => {
      setGroups(prev => 
        prev.map(group => {
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
        })
      );
    };

    const removeClientFromGroup = (groupId: string, clientId: string) => {
      setGroups(prev => 
        prev.map(group => {
          if (group.id === groupId) {
            return {
              ...group,
              clients: group.clients.filter(client => client.id !== clientId)
            };
          }
          return group;
        })
      );
    };

    const removeDestinationFromGroup = (groupId: string, destinationId: string) => {
      setGroups(prev => 
        prev.map(group => {
          if (group.id === groupId) {
            return {
              ...group,
              destinations: group.destinations.filter(destination => destination.id !== destinationId)
            };
          }
          return group;
        })
      );
    };

    return {
      groups,
      addGroup,
      updateGroup,
      deleteGroup,
      getGroupById,
      addClientToGroup,
      addDestinationToGroup,
      removeClientFromGroup,
      removeDestinationFromGroup
    };
  }
  
  return context;
};
