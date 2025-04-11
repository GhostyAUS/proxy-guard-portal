
import React, { createContext, useContext, useState, useEffect, ReactNode } from "react";
import { WhitelistGroup, ProxySettings, NginxStatus } from "@/types/proxy";
import {
  readWhitelistGroups,
  writeWhitelistGroups,
  readProxySettings,
  writeProxySettings,
  checkNginxStatus
} from "@/utils/productionData";
import { 
  generateNginxConfig, 
  DEFAULT_NGINX_TEMPLATE, 
  saveNginxConfig, 
  validateNginxConfig, 
  reloadNginxConfig,
  NGINX_CONFIG_PATH
} from "@/utils/nginxUtils";
import { toast } from "sonner";

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
  applyConfiguration: () => Promise<boolean>;
}

const ProxyContext = createContext<ProxyContextType | undefined>(undefined);

export function ProxyProvider({ children }: { children: ReactNode }) {
  const [whitelistGroups, setWhitelistGroups] = useState<WhitelistGroup[]>([]);
  const [proxySettings, setProxySettings] = useState<ProxySettings>({
    nginxConfigPath: NGINX_CONFIG_PATH,
    isReadOnly: false,
    proxyPort: "8080",
    authType: "none",
    logSettings: {
      accessLogPath: "/var/log/nginx/access.log",
      errorLogPath: "/var/log/nginx/error.log",
      deniedLogPath: "/var/log/nginx/denied.log"
    }
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

  const fetchWhitelistGroups = async () => {
    setIsLoading(true);
    try {
      const groups = await readWhitelistGroups();
      setWhitelistGroups(groups);
      setError(null);
    } catch (err) {
      setError("Failed to fetch whitelist groups");
      toast.error("Failed to fetch whitelist groups");
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
        toast.success("Whitelist group saved successfully");
      } else {
        toast.error("Failed to save whitelist group");
      }
      
      return success;
    } catch (err) {
      console.error(err);
      toast.error("Failed to save whitelist group");
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
        toast.success("Whitelist group deleted successfully");
      } else {
        toast.error("Failed to delete whitelist group");
      }
      
      return success;
    } catch (err) {
      console.error(err);
      toast.error("Failed to delete whitelist group");
      return false;
    }
  };

  const updateProxySettings = async (settings: ProxySettings): Promise<boolean> => {
    try {
      // Save to production data store
      const success = await writeProxySettings(settings);
      
      if (success) {
        setProxySettings(settings);
        toast.success("Proxy settings updated successfully");
      } else {
        toast.error("Failed to update proxy settings");
      }
      
      return success;
    } catch (err) {
      console.error(err);
      toast.error("Failed to update proxy settings");
      return false;
    }
  };

  const reloadNginx = async (): Promise<boolean> => {
    try {
      const success = await reloadNginxConfig();
      
      if (success) {
        toast.success("Nginx configuration reloaded successfully");
        
        // Update nginx status after reload
        await checkStatus();
      } else {
        toast.error("Failed to reload Nginx configuration");
      }
      
      return success;
    } catch (err) {
      console.error(err);
      toast.error("Failed to reload Nginx configuration");
      return false;
    }
  };

  const checkStatus = async (): Promise<void> => {
    try {
      const status = await checkNginxStatus();
      setNginxStatus(status);
    } catch (err) {
      console.error(err);
      toast.error("Failed to check Nginx status");
    }
  };

  // Generate and apply the nginx configuration
  const applyConfiguration = async (): Promise<boolean> => {
    try {
      // Generate the configuration from our groups using the template
      const generatedConfig = generateNginxConfig(
        whitelistGroups,
        DEFAULT_NGINX_TEMPLATE
      );
      
      // Validate the configuration first
      const isValid = await validateNginxConfig(proxySettings.nginxConfigPath, generatedConfig);
      
      if (!isValid) {
        toast.error("Failed to validate Nginx configuration");
        return false;
      }
      
      // Save the configuration
      const saved = await saveNginxConfig(proxySettings.nginxConfigPath, generatedConfig);
      
      if (!saved) {
        toast.error("Failed to save Nginx configuration");
        return false;
      }
      
      // Reload Nginx
      const reloaded = await reloadNginxConfig();
      
      if (reloaded) {
        toast.success("Configuration applied and Nginx reloaded successfully");
        await checkStatus();
        return true;
      } else {
        toast.error("Failed to reload Nginx configuration");
        return false;
      }
    } catch (err) {
      console.error(err);
      toast.error(`Failed to apply configuration: ${err instanceof Error ? err.message : String(err)}`);
      return false;
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
        await checkStatus();
        
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
        checkStatus,
        applyConfiguration
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
