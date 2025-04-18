
export interface ClientIP {
  id: string;
  value: string; // IP address or subnet (e.g., 192.168.1.1 or 10.0.0.0/24)
  description?: string;
}

export interface Destination {
  id: string;
  value: string; // URL or domain (e.g., example.com or *.example.com)
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

export interface ProxySettings {
  nginxConfigPath: string;
  isReadOnly: boolean;
  proxyPort: string; // Combined HTTP/HTTPS port
  authType: 'none' | 'ldap' | 'saml';
  logSettings?: {
    accessLogPath: string;
    errorLogPath: string;
    deniedLogPath: string;
  };
  ldapSettings?: {
    serverUrl: string;
    bindDn: string;
    searchBase: string;
    searchFilter: string;
    useLdaps?: boolean;
    ldapPort?: string;
  };
  samlSettings?: {
    entityId: string;
    assertionConsumerService: string;
    idpMetadataUrl: string;
  };
  clientAuth?: {
    requireAuth: boolean;
    authMethod: 'none' | 'ldap' | 'basic';
    realm?: string;
    ldapUrl?: string;
    ldapBindDn?: string;
    ldapSearchBase?: string;
    ldapSearchFilter?: string;
    ldapPort?: string;
    useLdaps?: boolean;
  };
}

export interface NginxStatus {
  isRunning: boolean;
  lastConfigTest: {
    success: boolean;
    message: string;
  };
  lastModified: string;
  configWritable: boolean;
}
