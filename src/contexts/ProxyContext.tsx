
import React, { createContext, useContext, useState, useEffect, ReactNode } from "react";
import { WhitelistGroup, ProxySettings, NginxStatus } from "@/types/proxy";
import {
  readWhitelistGroups,
  writeWhitelistGroups,
  readProxySettings,
  writeProxySettings,
  checkNginxStatus,
  reloadNginxConfig
} from "@/utils/productionData";
import { useToast } from "@/hooks/use-toast";

interface ProxyContextType {
  whitelistGroups: WhitelistGroup[];
  proxySettings: ProxySettings;
  nginxStatus: NginxStatus;
  isLoading: boolean;
  error: string | null;
  fetchWhitelistGroups: () => Promise<void>;
  saveWhitelistGroup: (group: WhitelistGroup) => Promise<boolean>;
  deleteWhitelistGroup: (groupId: string) => Promise<boolean>;
  updateProxySettings: (settings: ProxySettings) => Promise<boolean>;
  reloadNginx: () => Promise<boolean>;
  checkStatus: () => Promise<void>;
}

const ProxyContext = createContext<ProxyContextType | undefined>(undefined);

export function ProxyProvider({ children }: { children: ReactNode }) {
  const [whitelistGroups, setWhitelistGroups] = useState<WhitelistGroup[]>([]);
  const [proxySettings, setProxySettings] = useState<ProxySettings>({
    nginxConfigPath: "/etc/nginx/nginx.conf",
    isReadOnly: false,
    proxyPort: "8080",
    authType: "none"
  });
  const [nginxStatus, setNginxStatus] = useState<NginxStatus>({
    isRunning: false,
    lastConfigTest: {
      success: false,
      message: "Not checked"
    },
    lastModified: new Date().toISOString(),
    configWritable: false
  });
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const { toast } = useToast();

  const fetchWhitelistGroups = async () => {
    setIsLoading(true);
    try {
      const groups = await readWhitelistGroups();
      setWhitelistGroups(groups);
      setError(null);
    } catch (err) {
      setError("Failed to fetch whitelist groups");
      toast({
        title: "Error",
        description: "Failed to fetch whitelist groups",
        variant: "destructive"
      });
      console.error(err);
    } finally {
      setIsLoading(false);
    }
  };

  const saveWhitelistGroup = async (group: WhitelistGroup): Promise<boolean> => {
    try {
      // Check if group exists
      const existingIndex = whitelistGroups.findIndex(g => g.id === group.id);
      let updatedGroups;
      
      if (existingIndex >= 0) {
        // Update existing group
        updatedGroups = [
          ...whitelistGroups.slice(0, existingIndex),
          group,
          ...whitelistGroups.slice(existingIndex + 1)
        ];
      } else {
        // Add new group
        updatedGroups = [...whitelistGroups, group];
      }
      
      // Save to production data store
      const success = await writeWhitelistGroups(updatedGroups);
      
      if (success) {
        setWhitelistGroups(updatedGroups);
        toast({
          title: "Success",
          description: "Whitelist group saved successfully"
        });
      } else {
        toast({
          title: "Error",
          description: "Failed to save whitelist group",
          variant: "destructive"
        });
      }
      
      return success;
    } catch (err) {
      console.error(err);
      toast({
        title: "Error",
        description: "Failed to save whitelist group",
        variant: "destructive"
      });
      return false;
    }
  };

  const deleteWhitelistGroup = async (groupId: string): Promise<boolean> => {
    try {
      const updatedGroups = whitelistGroups.filter(group => group.id !== groupId);
      
      // Save to production data store
      const success = await writeWhitelistGroups(updatedGroups);
      
      if (success) {
        setWhitelistGroups(updatedGroups);
        toast({
          title: "Success",
          description: "Whitelist group deleted successfully"
        });
      } else {
        toast({
          title: "Error",
          description: "Failed to delete whitelist group",
          variant: "destructive"
        });
      }
      
      return success;
    } catch (err) {
      console.error(err);
      toast({
        title: "Error",
        description: "Failed to delete whitelist group",
        variant: "destructive"
      });
      return false;
    }
  };

  const updateProxySettings = async (settings: ProxySettings): Promise<boolean> => {
    try {
      // Save to production data store
      const success = await writeProxySettings(settings);
      
      if (success) {
        setProxySettings(settings);
        toast({
          title: "Success",
          description: "Proxy settings updated successfully"
        });
      } else {
        toast({
          title: "Error",
          description: "Failed to update proxy settings",
          variant: "destructive"
        });
      }
      
      return success;
    } catch (err) {
      console.error(err);
      toast({
        title: "Error",
        description: "Failed to update proxy settings",
        variant: "destructive"
      });
      return false;
    }
  };

  const reloadNginx = async (): Promise<boolean> => {
    try {
      const success = await reloadNginxConfig();
      
      if (success) {
        toast({
          title: "Success",
          description: "Nginx configuration reloaded successfully"
        });
        
        // Update nginx status after reload
        await checkStatus();
      } else {
        toast({
          title: "Error",
          description: "Failed to reload Nginx configuration",
          variant: "destructive"
        });
      }
      
      return success;
    } catch (err) {
      console.error(err);
      toast({
        title: "Error",
        description: "Failed to reload Nginx configuration",
        variant: "destructive"
      });
      return false;
    }
  };

  const checkStatus = async (): Promise<void> => {
    try {
      const status = await checkNginxStatus();
      setNginxStatus(status);
    } catch (err) {
      console.error(err);
      toast({
        title: "Error",
        description: "Failed to check Nginx status",
        variant: "destructive"
      });
    }
  };

  useEffect(() => {
    // Initial data load
    const loadData = async () => {
      setIsLoading(true);
      try {
        // Load whitelist groups
        const groups = await readWhitelistGroups();
        setWhitelistGroups(groups);
        
        // Load proxy settings
        const settings = await readProxySettings();
        setProxySettings(settings);
        
        // Check nginx status
        const status = await checkNginxStatus();
        setNginxStatus(status);
        
        setError(null);
      } catch (err) {
        setError("Failed to load data");
        console.error(err);
      } finally {
        setIsLoading(false);
      }
    };
    
    loadData();
  }, []);

  return (
    <ProxyContext.Provider
      value={{
        whitelistGroups,
        proxySettings,
        nginxStatus,
        isLoading,
        error,
        fetchWhitelistGroups,
        saveWhitelistGroup,
        deleteWhitelistGroup,
        updateProxySettings,
        reloadNginx,
        checkStatus
      }}
    >
      {children}
    </ProxyContext.Provider>
  );
}

export function useProxy() {
  const context = useContext(ProxyContext);
  if (context === undefined) {
    throw new Error("useProxy must be used within a ProxyProvider");
  }
  return context;
}
