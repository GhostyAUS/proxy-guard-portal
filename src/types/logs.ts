
export interface LogEntry {
  id: string;
  timestamp: string;
  clientIp: string;
  destination: string;
  status: 'allowed' | 'denied';
  reason?: string;
  bytesTransferred?: number;
  responseTime?: number;
  method?: string;
  userAgent?: string;
}

export interface LogStats {
  totalRequests: number;
  allowedRequests: number;
  deniedRequests: number;
  topClients: Array<{clientIp: string, count: number}>;
  topDestinations: Array<{destination: string, count: number}>;
  lastUpdated: string;
}
