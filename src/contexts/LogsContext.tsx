
import React, { createContext, useContext, useState, useEffect, ReactNode } from "react";
import { LogEntry, LogStats } from "@/types/logs";
import axios from "axios";
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

const API_BASE_URL = import.meta.env.VITE_API_BASE_URL || "/api";

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

  const fetchLogs = async () => {
    setIsLoading(true);
    try {
      const response = await axios.get(`${API_BASE_URL}/logs`);
      setLogs(response.data.logs);
      setStats(response.data.stats);
      setError(null);
    } catch (err) {
      console.error("Error fetching logs:", err);
      setError("Failed to fetch logs");
    } finally {
      setIsLoading(false);
    }
  };

  const clearLogs = async () => {
    try {
      // In a real implementation, this would send a request to clear logs on the server
      // Here we'll just reset the local state
      setLogs([]);
      setStats({
        totalRequests: 0,
        allowedRequests: 0,
        deniedRequests: 0,
        topClients: [],
        topDestinations: [],
        lastUpdated: new Date().toISOString()
      });
    } catch (err) {
      console.error("Error clearing logs:", err);
      setError("Failed to clear logs");
    }
  };

  const startRealTimeUpdates = () => {
    setIsRealTimeEnabled(true);
    const interval = window.setInterval(() => {
      fetchLogs();
    }, 5000);
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
