
import React, { createContext, useContext, useState, useEffect, ReactNode } from "react";
import { LogEntry, LogStats } from "@/types/logs";
import { readLogsFromFile, getLogStats, writeLogEntry } from "@/utils/productionLogs";
import { v4 as uuidv4 } from 'uuid';
import { toast } from "sonner";

interface LogsContextType {
  logs: LogEntry[];
  stats: LogStats;
  isLoading: boolean;
  error: string | null;
  filesAvailable: boolean;
  fetchLogs: () => void;
  clearLogs: () => void;
  startRealTimeUpdates: () => void;
  stopRealTimeUpdates: () => void;
  isRealTimeEnabled: boolean;
}

const LogsContext = createContext<LogsContextType | undefined>(undefined);

export function LogsProvider({ children }: { children: ReactNode }) {
  const [logs, setLogs] = useState<LogEntry[]>([]);
  const [stats, setStats] = useState<LogStats>({
    totalRequests: 0,
    allowedRequests: 0,
    deniedRequests: 0,
    topClients: [],
    topDestinations: [],
    lastUpdated: new Date().toISOString()
  });
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [isRealTimeEnabled, setIsRealTimeEnabled] = useState(false);
  const [updateInterval, setUpdateInterval] = useState<number | null>(null);
  const [filesAvailable, setFilesAvailable] = useState(true);

  const fetchLogs = async () => {
    setIsLoading(true);
    try {
      // Fetch logs from the production data utility
      const fetchedLogs = await readLogsFromFile();
      setLogs(fetchedLogs);
      
      // Fetch or calculate log statistics
      const logStats = await getLogStats();
      setStats(logStats);
      
      setError(null);
      setFilesAvailable(true);
    } catch (err) {
      console.error(err);
      setError("Failed to fetch logs");
      setFilesAvailable(false);
      // Show a toast notification for the error
      toast.error("Log files are not available", {
        description: "The system could not access the required log files"
      });
    } finally {
      setIsLoading(false);
    }
  };

  const clearLogs = () => {
    // In a production environment, we might want to archive logs instead of clearing them
    // For now, we'll just reset the state
    setLogs([]);
    setStats({
      totalRequests: 0,
      allowedRequests: 0,
      deniedRequests: 0,
      topClients: [],
      topDestinations: [],
      lastUpdated: new Date().toISOString()
    });
  };

  const addRandomLog = async () => {
    // In production, we wouldn't add random logs
    // Instead, we would periodically fetch the latest logs
    await fetchLogs();
  };

  const startRealTimeUpdates = () => {
    if (!filesAvailable) {
      toast.error("Cannot enable real-time updates", {
        description: "Log files are not accessible"
      });
      return;
    }
    
    setIsRealTimeEnabled(true);
    const interval = window.setInterval(() => {
      addRandomLog();
    }, 5000); // Fetch every 5 seconds in real-time mode
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
        filesAvailable,
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
