
import { LogEntry, LogStats } from "@/types/logs";
import { v4 as uuidv4 } from 'uuid';

// Configuration
const LOG_FILE_PATH = import.meta.env.VITE_LOG_FILE_PATH || '/var/log/proxyguard/access.log';
const LOG_STATS_PATH = import.meta.env.VITE_LOG_STATS_PATH || '/var/log/proxyguard/stats.json';

// Function to read logs from the filesystem
export const readLogsFromFile = async (): Promise<LogEntry[]> => {
  try {
    // Since we're running in a browser environment, we can't access the filesystem directly
    // In a real environment, this would be an API call to a backend service
    console.log("Would attempt to read logs from:", LOG_FILE_PATH);
    
    // Create mock data to demonstrate functionality
    const mockLogs: LogEntry[] = [
      {
        id: uuidv4(),
        timestamp: new Date().toISOString(),
        clientIp: '192.168.1.1',
        destination: 'example.com',
        status: 'allowed',
        method: 'GET',
        userAgent: 'Mozilla/5.0',
        reason: 'Mock data - filesystem access not available in browser',
      },
      {
        id: uuidv4(),
        timestamp: new Date(Date.now() - 300000).toISOString(),
        clientIp: '192.168.1.2',
        destination: 'api.example.org',
        status: 'denied',
        method: 'POST',
        userAgent: 'Chrome/96.0',
        reason: 'Mock data - filesystem access not available in browser',
      }
    ];
    
    return mockLogs;
  } catch (error) {
    console.error("Failed to read logs from file:", error);
    throw new Error("Log file access unavailable");
  }
};

// Function to calculate log statistics
export const calculateLogStats = (logs: LogEntry[]): LogStats => {
  const topClients = countTopClients(logs.map(log => log.clientIp), 5);
  const topDestinations = countTopDestinations(logs.map(log => log.destination), 5);
  
  return {
    totalRequests: logs.length,
    allowedRequests: logs.filter(log => log.status === 'allowed').length,
    deniedRequests: logs.filter(log => log.status === 'denied').length,
    topClients,
    topDestinations,
    lastUpdated: new Date().toISOString()
  };
};

// Helper function to count occurrences and get top clients
function countTopClients(items: string[], limit: number) {
  const counts: Record<string, number> = {};
  
  items.forEach(item => {
    counts[item] = (counts[item] || 0) + 1;
  });
  
  return Object.entries(counts)
    .map(([item, count]) => ({ 
      clientIp: item, 
      count 
    }))
    .sort((a, b) => b.count - a.count)
    .slice(0, limit);
}

// Helper function to count occurrences and get top destinations
function countTopDestinations(items: string[], limit: number) {
  const counts: Record<string, number> = {};
  
  items.forEach(item => {
    counts[item] = (counts[item] || 0) + 1;
  });
  
  return Object.entries(counts)
    .map(([item, count]) => ({ 
      destination: item, 
      count 
    }))
    .sort((a, b) => b.count - a.count)
    .slice(0, limit);
}

// Function to write a log entry to the log file
export const writeLogEntry = async (logEntry: LogEntry): Promise<boolean> => {
  try {
    console.log("Would write log entry to:", LOG_FILE_PATH, logEntry);
    // In a browser environment, this would call an API
    return true;
  } catch (error) {
    console.error('Failed to write log entry:', error);
    return false;
  }
};

// Function to get cached stats or calculate new ones
export const getLogStats = async (): Promise<LogStats> => {
  try {
    console.log("Would attempt to get stats from:", LOG_STATS_PATH);
    
    // Generate mock stats
    const logs = await readLogsFromFile();
    const newStats = calculateLogStats(logs);
    
    return newStats;
  } catch (error) {
    console.error('Failed to get log stats:', error);
    
    // Return empty stats if there was an error
    return {
      totalRequests: 0,
      allowedRequests: 0,
      deniedRequests: 0,
      topClients: [],
      topDestinations: [],
      lastUpdated: new Date().toISOString()
    };
  }
};
