
import { LogEntry, LogStats } from "@/types/logs";
import fs from 'fs';
import path from 'path';
import { v4 as uuidv4 } from 'uuid';

// Configuration
const LOG_FILE_PATH = process.env.LOG_FILE_PATH || '/var/log/proxyguard/access.log';
const LOG_STATS_PATH = process.env.LOG_STATS_PATH || '/var/log/proxyguard/stats.json';

// Function to read logs from the filesystem
export const readLogsFromFile = async (): Promise<LogEntry[]> => {
  try {
    // Check if log file exists
    if (!fs.existsSync(LOG_FILE_PATH)) {
      console.error(`Log file not found: ${LOG_FILE_PATH}`);
      
      // Generate a sample log entry to show the functionality
      const sampleLog: LogEntry = {
        id: uuidv4(),
        timestamp: new Date().toISOString(),
        clientIp: '127.0.0.1',
        destination: 'example.com',
        status: 'allowed',
        method: 'GET',
        userAgent: 'Sample/1.0',
        reason: 'This is a sample log entry since the log file is not available',
      };
      
      // Throw error to be caught by caller
      throw new Error(`Log file not found: ${LOG_FILE_PATH}`);
    }

    const logData = fs.readFileSync(LOG_FILE_PATH, 'utf8');
    const logLines = logData.trim().split('\n');
    
    // Process each line as a log entry
    const logs: LogEntry[] = logLines.map((line, index) => {
      try {
        return JSON.parse(line) as LogEntry;
      } catch (error) {
        console.error(`Error parsing log entry at line ${index}:`, error);
        return null;
      }
    }).filter(Boolean) as LogEntry[];
    
    // Sort logs by timestamp (newest first)
    return logs.sort((a, b) => 
      new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime()
    );
  } catch (error) {
    console.error("Failed to read logs from file:", error);
    return [];
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
    const logDir = path.dirname(LOG_FILE_PATH);
    
    // Create log directory if it doesn't exist
    if (!fs.existsSync(logDir)) {
      fs.mkdirSync(logDir, { recursive: true });
    }
    
    // Append the log entry to the log file
    fs.appendFileSync(LOG_FILE_PATH, JSON.stringify(logEntry) + '\n');
    return true;
  } catch (error) {
    console.error('Failed to write log entry:', error);
    return false;
  }
};

// Function to get cached stats or calculate new ones
export const getLogStats = async (): Promise<LogStats> => {
  try {
    // Try to read cached stats first
    if (fs.existsSync(LOG_STATS_PATH)) {
      const statsData = fs.readFileSync(LOG_STATS_PATH, 'utf8');
      const stats = JSON.parse(statsData) as LogStats;
      
      // Check if stats were updated in the last 15 minutes
      const lastUpdated = new Date(stats.lastUpdated);
      const fifteenMinutesAgo = new Date(Date.now() - 15 * 60 * 1000);
      
      if (lastUpdated > fifteenMinutesAgo) {
        return stats;
      }
    }
    
    // Calculate new stats if cached stats are outdated or don't exist
    const logs = await readLogsFromFile();
    const newStats = calculateLogStats(logs);
    
    // Create stats directory if it doesn't exist
    const statsDir = path.dirname(LOG_STATS_PATH);
    if (!fs.existsSync(statsDir)) {
      fs.mkdirSync(statsDir, { recursive: true });
    }
    
    // Cache the new stats
    fs.writeFileSync(LOG_STATS_PATH, JSON.stringify(newStats));
    
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
