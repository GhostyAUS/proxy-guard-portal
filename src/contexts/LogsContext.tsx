
import React, { createContext, useContext, useState, useEffect, ReactNode } from "react";
import { LogEntry, LogStats } from "@/types/logs";
import { mockLogs, mockLogStats } from "@/utils/mockLogs";
import { v4 as uuidv4 } from 'uuid';

interface LogsContextType {
  logs: LogEntry[];
  stats: LogStats;
  isLoading: boolean;
  error: string | null;
  fetchLogs: () => void;
  clearLogs: () => void;
  startRealTimeUpdates: () => void;
  stopRealTimeUpdates: () => void;
  isRealTimeEnabled: boolean;
}

const LogsContext = createContext<LogsContextType | undefined>(undefined);

export function LogsProvider({ children }: { children: ReactNode }) {
  const [logs, setLogs] = useState<LogEntry[]>([]);
  const [stats, setStats] = useState<LogStats>(mockLogStats);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [isRealTimeEnabled, setIsRealTimeEnabled] = useState(false);
  const [updateInterval, setUpdateInterval] = useState<number | null>(null);

  const fetchLogs = () => {
    setIsLoading(true);
    try {
      // In a real implementation, this would be an API call
      setLogs(mockLogs);
      setStats(mockLogStats);
      setError(null);
    } catch (err) {
      setError("Failed to fetch logs");
      console.error(err);
    } finally {
      setIsLoading(false);
    }
  };

  const clearLogs = () => {
    setLogs([]);
    setStats({
      ...mockLogStats,
      totalRequests: 0,
      allowedRequests: 0,
      deniedRequests: 0,
      topClients: [],
      topDestinations: [],
      lastUpdated: new Date().toISOString()
    });
  };

  const addRandomLog = () => {
    const clientIps = ['192.168.1.100', '10.0.0.5', '172.16.0.10', '192.168.1.200', '10.0.0.15'];
    const destinations = ['google.com', 'github.com', 'example.com', 'microsoft.com', 'netflix.com'];
    const methods = ['GET', 'POST', 'PUT', 'DELETE'];
    const status = Math.random() > 0.25 ? 'allowed' : 'denied';

    const newLog: LogEntry = {
      id: uuidv4(),
      timestamp: new Date().toISOString(),
      clientIp: clientIps[Math.floor(Math.random() * clientIps.length)],
      destination: destinations[Math.floor(Math.random() * destinations.length)],
      status,
      reason: status === 'denied' ? 'No matching whitelist rule' : undefined,
      bytesTransferred: status === 'allowed' ? Math.floor(Math.random() * 100000) : 0,
      responseTime: status === 'allowed' ? Math.floor(Math.random() * 1000) : 0,
      method: methods[Math.floor(Math.random() * methods.length)],
    };

    setLogs(prevLogs => [newLog, ...prevLogs.slice(0, 99)]);
    
    // Update stats
    setStats(prevStats => ({
      ...prevStats,
      totalRequests: prevStats.totalRequests + 1,
      allowedRequests: prevStats.allowedRequests + (status === 'allowed' ? 1 : 0),
      deniedRequests: prevStats.deniedRequests + (status === 'denied' ? 1 : 0),
      lastUpdated: new Date().toISOString()
    }));
  };

  const startRealTimeUpdates = () => {
    setIsRealTimeEnabled(true);
    const interval = window.setInterval(() => {
      addRandomLog();
    }, 3000);
    setUpdateInterval(interval);
  };

  const stopRealTimeUpdates = () => {
    setIsRealTimeEnabled(false);
    if (updateInterval) {
      window.clearInterval(updateInterval);
      setUpdateInterval(null);
    }
  };

  useEffect(() => {
    fetchLogs();
    return () => {
      if (updateInterval) {
        window.clearInterval(updateInterval);
      }
    };
  }, []);

  return (
    <LogsContext.Provider
      value={{
        logs,
        stats,
        isLoading,
        error,
        fetchLogs,
        clearLogs,
        startRealTimeUpdates,
        stopRealTimeUpdates,
        isRealTimeEnabled,
      }}
    >
      {children}
    </LogsContext.Provider>
  );
}

export function useLogs() {
  const context = useContext(LogsContext);
  if (context === undefined) {
    throw new Error("useLogs must be used within a LogsProvider");
  }
  return context;
}
