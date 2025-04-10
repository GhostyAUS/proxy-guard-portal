
import { LogEntry, LogStats } from "@/types/logs";
import { v4 as uuidv4 } from 'uuid';

// Generate a random log entry
const generateLogEntry = (index: number): LogEntry => {
  const clientIps = ['192.168.1.100', '10.0.0.5', '172.16.0.10', '192.168.1.200', '10.0.0.15'];
  const destinations = ['google.com', 'github.com', 'example.com', 'microsoft.com', 'netflix.com'];
  const methods = ['GET', 'POST', 'PUT', 'DELETE'];
  const userAgents = [
    'Mozilla/5.0 (Windows NT 10.0; Win64; x64)',
    'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7)',
    'Mozilla/5.0 (X11; Linux x86_64)',
    'Mozilla/5.0 (iPhone; CPU iPhone OS 14_7_1)'
  ];
  
  // More recent entries for newer indices
  const date = new Date();
  date.setMinutes(date.getMinutes() - (100 - index) * 2);
  
  const status = Math.random() > 0.25 ? 'allowed' : 'denied';
  
  return {
    id: uuidv4(),
    timestamp: date.toISOString(),
    clientIp: clientIps[Math.floor(Math.random() * clientIps.length)],
    destination: destinations[Math.floor(Math.random() * destinations.length)],
    status,
    reason: status === 'denied' ? 'No matching whitelist rule' : undefined,
    bytesTransferred: status === 'allowed' ? Math.floor(Math.random() * 100000) : 0,
    responseTime: status === 'allowed' ? Math.floor(Math.random() * 1000) : 0,
    method: methods[Math.floor(Math.random() * methods.length)],
    userAgent: userAgents[Math.floor(Math.random() * userAgents.length)]
  };
};

// Generate 100 mock log entries
export const mockLogs: LogEntry[] = Array.from({ length: 100 }).map((_, i) => 
  generateLogEntry(i)
).sort((a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime());

// Generate log statistics
export const mockLogStats: LogStats = {
  totalRequests: mockLogs.length,
  allowedRequests: mockLogs.filter(log => log.status === 'allowed').length,
  deniedRequests: mockLogs.filter(log => log.status === 'denied').length,
  topClients: countTopClients(mockLogs.map(log => log.clientIp), 5),
  topDestinations: countTopDestinations(mockLogs.map(log => log.destination), 5),
  lastUpdated: new Date().toISOString()
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
