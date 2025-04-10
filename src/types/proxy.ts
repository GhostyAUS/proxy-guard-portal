
export interface ClientIP {
  id: string;
  value: string; // IP address or subnet (e.g., 192.168.1.1 or 10.0.0.0/24)
  description?: string;
}

export interface Destination {
  id: string;
  value: string; // URL or domain (e.g., example.com or https://example.com)
  description?: string;
}

export interface WhitelistGroup {
  id: string;
  name: string;
  description?: string;
  clients: ClientIP[];
  destinations: Destination[];
  enabled: boolean;
}

export interface NginxStatus {
  isRunning: boolean;
  version?: string;
  lastConfigTest: {
    success: boolean;
    message: string;
  };
  lastModified: string;
  configWritable: boolean;
}
