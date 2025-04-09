import { WhitelistGroup, ProxySettings, NginxStatus } from "@/types/proxy";

export const mockWhitelistGroups: WhitelistGroup[] = [
  {
    id: "group-1",
    name: "Development Team",
    description: "Access for development team to development resources",
    enabled: true,
    clients: [
      { id: "client-1", value: "192.168.1.0/24", description: "Development office network" },
      { id: "client-2", value: "10.0.0.5", description: "Lead developer workstation" }
    ],
    destinations: [
      { id: "dest-1", value: "github.com", description: "GitHub" },
      { id: "dest-2", value: "npmjs.org", description: "NPM Registry" }
    ]
  },
  {
    id: "group-2",
    name: "Marketing Team",
    description: "Access for marketing team to social media platforms",
    enabled: true,
    clients: [
      { id: "client-3", value: "192.168.2.0/24", description: "Marketing office network" }
    ],
    destinations: [
      { id: "dest-3", value: "facebook.com", description: "Facebook" },
      { id: "dest-4", value: "twitter.com", description: "Twitter" },
      { id: "dest-5", value: "linkedin.com", description: "LinkedIn" }
    ]
  },
  {
    id: "group-3",
    name: "Restricted Sites",
    description: "Limited access to specific sites for compliance",
    enabled: false,
    clients: [
      { id: "client-4", value: "192.168.0.0/16", description: "All company networks" }
    ],
    destinations: [
      { id: "dest-6", value: "example.com", description: "Example Site" }
    ]
  }
];

export const mockProxySettings: ProxySettings = {
  nginxConfigPath: "/etc/nginx/nginx.conf",
  isReadOnly: false,
  proxyPort: "8080",
  authType: "none",
  ldapSettings: {
    serverUrl: "ldaps://ldap.example.com:636",
    bindDn: "cn=admin,dc=example,dc=com",
    searchBase: "ou=users,dc=example,dc=com",
    searchFilter: "(uid={{username}})"
  },
  samlSettings: {
    entityId: "https://proxy-guard.example.com",
    assertionConsumerService: "https://proxy-guard.example.com/saml/acs",
    idpMetadataUrl: "https://idp.example.com/metadata"
  }
};

export const mockNginxStatus: NginxStatus = {
  isRunning: true,
  lastConfigTest: {
    success: true,
    message: "Configuration test successful"
  },
  lastModified: new Date().toISOString(),
  configWritable: true
};
