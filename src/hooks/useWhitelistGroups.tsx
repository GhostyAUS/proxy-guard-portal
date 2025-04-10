
import React, { createContext, useContext, useCallback, ReactNode } from 'react';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { fetchWhitelistGroups } from '@/services/apiService';
import { WhitelistGroup } from '@/types/proxy';

interface WhitelistGroupsContextType {
  data: WhitelistGroup[] | undefined;
  isLoading: boolean;
  error: unknown;
  refetch: () => Promise<void>;
}

const WhitelistGroupsContext = createContext<WhitelistGroupsContextType | undefined>(undefined);

export function WhitelistGroupsProvider({ children }: { children: ReactNode }) {
  const queryClient = useQueryClient();
  
  const { data, isLoading, error, refetch: tanstackRefetch } = useQuery<WhitelistGroup[]>({
    queryKey: ['whitelistGroups'],
    queryFn: fetchWhitelistGroups,
  });

  const refetch = useCallback(async () => {
    await tanstackRefetch();
  }, [tanstackRefetch]);

  return (
    <WhitelistGroupsContext.Provider value={{ data, isLoading, error, refetch }}>
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
