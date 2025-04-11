
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

// In-memory store for development mode
let inMemoryWhitelistGroups: WhitelistGroup[] = [];
let inMemoryProxySettings: ProxySettings = {
  nginxConfigPath: NGINX_CONFIG_PATH,
  isReadOnly: false,
  proxyPort: "8080",
  authType: "none",
  logSettings: {
    accessLogPath: "/var/log/nginx/access.log",
    errorLogPath: "/var/log/nginx/error.log",
    deniedLogPath: "/var/log/nginx/denied.log"
  }
};

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
  
  // Check if we're in development mode
  const isDev = import.meta.env.DEV || !import.meta.env.PROD;

  const fetchWhitelistGroups = async () => {
    setIsLoading(true);
    try {
      if (isDev) {
        // In development, use in-memory data or initialize with mock data if empty
        if (inMemoryWhitelistGroups.length === 0) {
          const groups = await readWhitelistGroups();
          inMemoryWhitelistGroups = groups;
        }
        setWhitelistGroups(inMemoryWhitelistGroups);
        setError(null);
      } else {
        // In production, call the API
        const groups = await readWhitelistGroups();
        setWhitelistGroups(groups);
        setError(null);
      }
    } catch (err) {
      console.error("Failed to fetch whitelist groups:", err);
      setError("Failed to fetch whitelist groups");
      toast.error("Failed to fetch whitelist groups");
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
      
      let success = false;
      
      if (isDev) {
        // In development, just update the in-memory store
        inMemoryWhitelistGroups = updatedGroups;
        success = true;
      } else {
        // In production, call the API
        success = await writeWhitelistGroups(updatedGroups);
      }
      
      if (success) {
        setWhitelistGroups(updatedGroups);
        toast.success("Whitelist group saved successfully");
      } else {
        toast.error("Failed to save whitelist group");
      }
      
      return success;
    } catch (err) {
      console.error("Failed to save whitelist group:", err);
      toast.error("Failed to save whitelist group");
      return false;
    }
  };

  const deleteWhitelistGroup = async (groupId: string): Promise<boolean> => {
    try {
      const updatedGroups = whitelistGroups.filter(group => group.id !== groupId);
      
      let success = false;
      
      if (isDev) {
        // In development, just update the in-memory store
        inMemoryWhitelistGroups = updatedGroups;
        success = true;
      } else {
        // In production, call the API
        success = await writeWhitelistGroups(updatedGroups);
      }
      
      if (success) {
        setWhitelistGroups(updatedGroups);
        toast.success("Whitelist group deleted successfully");
      } else {
        toast.error("Failed to delete whitelist group");
      }
      
      return success;
    } catch (err) {
      console.error("Failed to delete whitelist group:", err);
      toast.error("Failed to delete whitelist group");
      return false;
    }
  };

  const updateProxySettings = async (settings: ProxySettings): Promise<boolean> => {
    try {
      let success = false;
      
      if (isDev) {
        // In development, just update the in-memory store
        inMemoryProxySettings = settings;
        success = true;
      } else {
        // In production, call the API
        success = await writeProxySettings(settings);
      }
      
      if (success) {
        setProxySettings(settings);
        toast.success("Proxy settings updated successfully");
      } else {
        toast.error("Failed to update proxy settings");
      }
      
      return success;
    } catch (err) {
      console.error("Failed to update proxy settings:", err);
      toast.error("Failed to update proxy settings");
      return false;
    }
  };

  const reloadNginx = async (): Promise<boolean> => {
    try {
      if (isDev) {
        // In development, just simulate a successful reload
        toast.success("Nginx configuration reloaded successfully (development mode)");
        await checkStatus();
        return true;
      } else {
        // In production, call the API
        const success = await reloadNginxConfig();
        
        if (success) {
          toast.success("Nginx configuration reloaded successfully");
          await checkStatus();
        } else {
          toast.error("Failed to reload Nginx configuration");
        }
        
        return success;
      }
    } catch (err) {
      console.error("Failed to reload Nginx:", err);
      toast.error("Failed to reload Nginx configuration");
      return false;
    }
  };

  const checkStatus = async (): Promise<void> => {
    try {
      if (isDev) {
        // In development, simulate a mock status
        setNginxStatus({
          isRunning: true,
          lastConfigTest: {
            success: true,
            message: 'Development mode: Configuration test would be successful'
          },
          lastModified: new Date().toISOString(),
          configWritable: true
        });
      } else {
        // In production, call the API
        const status = await checkNginxStatus();
        setNginxStatus(status);
      }
    } catch (err) {
      console.error("Failed to check Nginx status:", err);
      toast.error("Failed to check Nginx status");
    }
  };

  // Generate and apply the nginx configuration
  const applyConfiguration = async (): Promise<boolean> => {
    try {
      if (isDev) {
        // In development mode, simulate success
        toast.success("Configuration applied successfully (development mode)");
        await checkStatus();
        return true;
      }
      
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
      console.error("Failed to apply configuration:", err);
      toast.error(`Failed to apply configuration: ${err instanceof Error ? err.message : String(err)}`);
      return false;
    }
  };

  useEffect(() => {
    // Initial data load
    const loadData = async () => {
      setIsLoading(true);
      try {
        if (isDev) {
          // In development, use in-memory data or initialize with mock data
          if (inMemoryWhitelistGroups.length === 0) {
            // Initialize with mock data
            const groups = await readWhitelistGroups();
            inMemoryWhitelistGroups = groups;
          }
          setWhitelistGroups(inMemoryWhitelistGroups);
          setProxySettings(inMemoryProxySettings);
          
          // Set a mock status for development
          setNginxStatus({
            isRunning: true,
            lastConfigTest: {
              success: true,
              message: 'Development mode: Configuration test would be successful'
            },
            lastModified: new Date().toISOString(),
            configWritable: true
          });
        } else {
          // In production, load from API
          const groups = await readWhitelistGroups();
          setWhitelistGroups(groups);
          
          const settings = await readProxySettings();
          setProxySettings(settings);
          
          await checkStatus();
        }
        
        setError(null);
      } catch (err) {
        console.error("Failed to load data:", err);
        setError("Failed to load data");
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
