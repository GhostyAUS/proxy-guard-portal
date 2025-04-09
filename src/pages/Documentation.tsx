import { useState, useEffect } from "react";
import { Layout } from "@/components/layout/Layout";
import { 
  Card, 
  CardContent,
  CardDescription, 
  CardHeader, 
  CardTitle 
} from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { ScrollArea } from "@/components/ui/scroll-area";

export default function Documentation() {
  useEffect(() => {
    document.title = "Documentation | Proxy Guard";
  }, []);

  return (
    <Layout>
      <div className="flex flex-col gap-4">
        <h1 className="text-3xl font-bold tracking-tight">Documentation</h1>

        <Card>
          <CardHeader>
            <CardTitle>Nginx Forward Proxy Documentation</CardTitle>
            <CardDescription>
              Learn how to configure and manage your Nginx forward proxy
            </CardDescription>
          </CardHeader>
          <CardContent>
            <Tabs defaultValue="overview">
              <TabsList className="mb-4">
                <TabsTrigger value="overview">Overview</TabsTrigger>
                <TabsTrigger value="whitelisting">Whitelisting</TabsTrigger>
                <TabsTrigger value="manual-config">Manual Configuration</TabsTrigger>
                <TabsTrigger value="docker">Docker Deployment</TabsTrigger>
                <TabsTrigger value="troubleshooting">Troubleshooting</TabsTrigger>
              </TabsList>
              
              <TabsContent value="overview">
                <ScrollArea className="h-[500px] rounded-md border p-4">
                  <div className="space-y-4">
                    <h3 className="text-lg font-medium">About Proxy Guard</h3>
                    <p>
                      Proxy Guard is a web-based management interface for an Nginx forward proxy
                      that enables controlled HTTP and HTTPS traffic forwarding through whitelisting
                      rules. This application allows you to:
                    </p>
                    
                    <ul className="list-disc list-inside space-y-2 pl-4">
                      <li>
                        Create and manage whitelisting groups that define which clients can
                        access which destinations
                      </li>
                      <li>
                        Configure both HTTP (port 8080) and HTTPS (port 8443) forwarding
                      </li>
                      <li>
                        Manage the Nginx configuration file through an intuitive web interface
                      </li>
                      <li>
                        Set up authentication using LDAP or SAML for the management interface
                      </li>
                    </ul>
                    
                    <h3 className="text-lg font-medium pt-4">Architecture</h3>
                    <p>
                      The application is based on the{" "}
                      <a href="https://github.com/dominikwinter/nginx-forward-proxy" className="text-primary hover:underline">
                        nginx-forward-proxy
                      </a>{" "}
                      project and extends it with a management interface. The key components are:
                    </p>
                    
                    <ul className="list-disc list-inside space-y-2 pl-4">
                      <li>
                        <strong>Nginx:</strong> The proxy server that handles the actual traffic forwarding
                      </li>
                      <li>
                        <strong>Web UI:</strong> The management interface you&apos;re currently using
                      </li>
                      <li>
                        <strong>Configuration Generator:</strong> A system that translates the whitelist
                        rules into the correct Nginx configuration format
                      </li>
                    </ul>
                    
                    <h3 className="text-lg font-medium pt-4">Getting Started</h3>
                    <p>
                      To get started with Proxy Guard:
                    </p>
                    
                    <ol className="list-decimal list-inside space-y-2 pl-4">
                      <li>
                        Go to the <strong>Settings</strong> page to configure the path to your
                        Nginx configuration file
                      </li>
                      <li>
                        Create whitelist groups on the <strong>Whitelist Groups</strong> page
                      </li>
                      <li>
                        Add client IPs/subnets and destination URLs to your groups
                      </li>
                      <li>
                        Enable your groups to activate the whitelisting rules
                      </li>
                    </ol>
                  </div>
                </ScrollArea>
              </TabsContent>
              
              <TabsContent value="whitelisting">
                <ScrollArea className="h-[500px] rounded-md border p-4">
                  <div className="space-y-4">
                    <h3 className="text-lg font-medium">Understanding Whitelist Groups</h3>
                    <p>
                      Whitelist groups are the core component of access control in Proxy Guard. 
                      Each group contains two main elements:
                    </p>
                    
                    <ul className="list-disc list-inside space-y-2 pl-4">
                      <li>
                        <strong>Client IPs/Subnets:</strong> The source IP addresses or networks 
                        that are allowed to use the proxy
                      </li>
                      <li>
                        <strong>Destination URLs/Domains:</strong> The websites that the clients 
                        in this group are allowed to access
                      </li>
                    </ul>
                    
                    <p className="pt-2">
                      A client is allowed to access a destination if there is at least one whitelist group
                      where both the client IP and the destination are listed.
                    </p>
                    
                    <h3 className="text-lg font-medium pt-4">Creating a Whitelist Group</h3>
                    <p>
                      To create a new whitelist group:
                    </p>
                    
                    <ol className="list-decimal list-inside space-y-2 pl-4">
                      <li>
                        Go to <strong>Whitelist Groups</strong> and click <strong>Create Group</strong>
                      </li>
                      <li>
                        Enter a name and optional description for your group
                      </li>
                      <li>
                        Set the group to enabled or disabled (you can change this later)
                      </li>
                      <li>
                        After creating the group, switch to the <strong>Client IPs</strong> tab to add IP addresses
                      </li>
                      <li>
                        Switch to the <strong>Destinations</strong> tab to add allowed websites
                      </li>
                    </ol>
                    
                    <h3 className="text-lg font-medium pt-4">Client IP Format</h3>
                    <p>
                      Client IPs can be specified in two formats:
                    </p>
                    
                    <ul className="list-disc list-inside space-y-2 pl-4">
                      <li>
                        <strong>Single IP:</strong> e.g., <code className="bg-muted p-1 rounded">192.168.1.100</code>
                      </li>
                      <li>
                        <strong>CIDR Subnet:</strong> e.g., <code className="bg-muted p-1 rounded">192.168.1.0/24</code> 
                        (represents all IPs from 192.168.1.0 to 192.168.1.255)
                      </li>
                    </ul>
                    
                    <h3 className="text-lg font-medium pt-4">Destination Format</h3>
                    <p>
                      Destinations should be specified as domain names without protocols:
                    </p>
                    
                    <ul className="list-disc list-inside space-y-2 pl-4">
                      <li>
                        <strong>Correct:</strong> <code className="bg-muted p-1 rounded">example.com</code>
                      </li>
                      <li>
                        <strong>Also correct:</strong> <code className="bg-muted p-1 rounded">subdomain.example.com</code>
                      </li>
                      <li>
                        <strong>Incorrect:</strong> <code className="bg-muted p-1 rounded">https://example.com</code> 
                        (don&apos;t include the protocol)
                      </li>
                    </ul>
                    
                    <h3 className="text-lg font-medium pt-4">Best Practices</h3>
                    <p>
                      When working with whitelist groups:
                    </p>
                    
                    <ul className="list-disc list-inside space-y-2 pl-4">
                      <li>
                        Create logical groups that represent real access patterns in your organization
                      </li>
                      <li>
                        Use descriptive names and add detailed descriptions to make management easier
                      </li>
                      <li>
                        Be cautious with broad subnet ranges (like /8 or /16) as they include many IPs
                      </li>
                      <li>
                        Test your configuration after making changes to ensure proper access control
                      </li>
                    </ul>
                  </div>
                </ScrollArea>
              </TabsContent>
              
              <TabsContent value="manual-config">
                <ScrollArea className="h-[500px] rounded-md border p-4">
                  <div className="space-y-4">
                    <h3 className="text-lg font-medium">Manual Nginx Configuration</h3>
                    <p>
                      While the Proxy Guard interface handles configuration automatically, 
                      you may need to edit the Nginx configuration file manually in some cases.
                    </p>

                    <h4 className="text-md font-medium pt-3">Nginx Configuration Structure</h4>
                    <p>
                      The Nginx configuration generated by Proxy Guard follows this structure:
                    </p>
                    
                    <pre className="bg-muted p-3 rounded-md overflow-x-auto text-sm mt-2">
{`worker_processes auto;
error_log /var/log/nginx/error.log info;

events {
    worker_connections 1024;
}

http {
    access_log /var/log/nginx/access.log;
    
    # Define variables for access control
    map $remote_addr $allow_access {
        default 0;
    }
    
    # Group: Development Team
    map $remote_addr $client_group-1 {
        default 0;
        192.168.1.0/24 1;  # Development office network
        10.0.0.5 1;        # Lead developer workstation
    }
    
    map $http_host $dest_group-1 {
        default 0;
        github.com 1;      # GitHub
        npmjs.org 1;       # NPM Registry
    }
    
    # Group: Marketing Team
    map $remote_addr $client_group-2 {
        default 0;
        192.168.2.0/24 1;  # Marketing office network
    }
    
    map $http_host $dest_group-2 {
        default 0;
        facebook.com 1;    # Facebook
        twitter.com 1;     # Twitter
        linkedin.com 1;    # LinkedIn
    }
    
    server {
        listen 8080;
        
        # Check if client is allowed to access the requested destination
        if ($client_group-1 = 1 && $dest_group-1 = 1) { set $allow_access 1; }
        if ($client_group-2 = 1 && $dest_group-2 = 1) { set $allow_access 1; }
        
        # Block access if not allowed
        if ($allow_access != 1) {
            return 403 "Access denied";
        }
        
        # Forward proxy configuration
        resolver 8.8.8.8 ipv6=off;
        
        # HTTP proxy
        location / {
            proxy_pass $scheme://$http_host$request_uri;
            proxy_set_header Host $http_host;
            proxy_set_header X-Real-IP $remote_addr;
            proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
            proxy_connect_timeout 60s;
            proxy_send_timeout 60s;
            proxy_read_timeout 60s;
        }
    }
    
    # HTTPS proxy - requires NGINX compiled with --with-stream
    stream {
        server {
            listen 8443;
            
            # Use preread to get SNI without decrypting
            ssl_preread on;
            
            # Forward the connection
            proxy_pass $ssl_preread_server_name:443;
            proxy_connect_timeout 60s;
            proxy_timeout 600s;
        }
    }
}`}
                    </pre>
                    
                    <h4 className="text-md font-medium pt-3">Manual Editing Guidelines</h4>
                    <p>
                      If you need to manually edit the configuration:
                    </p>
                    
                    <ol className="list-decimal list-inside space-y-2 pl-4">
                      <li>
                        Make a backup of your configuration before editing:
                        <pre className="bg-muted p-2 rounded-md text-sm mt-1 ml-4">
                          cp /etc/nginx/nginx.conf /etc/nginx/nginx.conf.bak
                        </pre>
                      </li>
                      <li>
                        Edit the configuration file using a text editor:
                        <pre className="bg-muted p-2 rounded-md text-sm mt-1 ml-4">
                          nano /etc/nginx/nginx.conf
                        </pre>
                      </li>
                      <li>
                        Test your configuration before applying:
                        <pre className="bg-muted p-2 rounded-md text-sm mt-1 ml-4">
                          nginx -t
                        </pre>
                      </li>
                      <li>
                        Reload Nginx to apply changes:
                        <pre className="bg-muted p-2 rounded-md text-sm mt-1 ml-4">
                          nginx -s reload
                        </pre>
                      </li>
                    </ol>
                    
                    <h4 className="text-md font-medium pt-3">Adding Groups Manually</h4>
                    <p>
                      To add a new whitelist group manually:
                    </p>
                    
                    <ol className="list-decimal list-inside space-y-2 pl-4">
                      <li>
                        Add client map block:
                        <pre className="bg-muted p-2 rounded-md text-sm mt-1 ml-4">
{`# Group: My Custom Group
map $remote_addr $client_my-group {
    default 0;
    192.168.3.0/24 1;  # Description
    10.1.1.1 1;        # Another client
}`}
                        </pre>
                      </li>
                      <li>
                        Add destination map block:
                        <pre className="bg-muted p-2 rounded-md text-sm mt-1 ml-4">
{`map $http_host $dest_my-group {
    default 0;
    example.com 1;     # Example site
    api.example.com 1; # API endpoint
}`}
                        </pre>
                      </li>
                      <li>
                        Add access condition to the server block:
                        <pre className="bg-muted p-2 rounded-md text-sm mt-1 ml-4">
                          if ($client_my-group = 1 && $dest_my-group = 1) {"{set $allow_access 1;}"}
                        </pre>
                      </li>
                    </ol>
                    
                    <h4 className="text-md font-medium pt-3">Caution</h4>
                    <p>
                      After manual edits, Proxy Guard may overwrite your changes when applying 
                      updates through the web interface. Consider using the web interface exclusively 
                      for most configuration tasks.
                    </p>
                  </div>
                </ScrollArea>
              </TabsContent>
              
              <TabsContent value="docker">
                <ScrollArea className="h-[500px] rounded-md border p-4">
                  <div className="space-y-4">
                    <h3 className="text-lg font-medium">Docker Deployment</h3>
                    <p>
                      Proxy Guard can be easily deployed using Docker Compose. This allows you to run
                      the application in a containerized environment with minimal setup.
                    </p>
                    
                    <h4 className="text-md font-medium pt-3">Prerequisites</h4>
                    <ul className="list-disc list-inside space-y-2 pl-4">
                      <li>Docker and Docker Compose installed on your system</li>
                      <li>Git to clone the repository</li>
                    </ul>
                    
                    <h4 className="text-md font-medium pt-3">Directory Structure</h4>
                    <p>
                      The repository contains the following structure for Docker deployment:
                    </p>
                    
                    <pre className="bg-muted p-3 rounded-md overflow-x-auto text-sm mt-2">
{`proxy-guard/
├── docker-compose.yml
├── nginx/
│   ├── Dockerfile
│   ├── nginx.conf.template
│   └── certs/
│       ├── server.crt
│       └── server.key
├── app/
│   ├── Dockerfile
│   └── [application files]
├── .env
└── README.md`}
                    </pre>
                    
                    <h4 className="text-md font-medium pt-3">Step 1: Clone the Repository</h4>
                    <pre className="bg-muted p-2 rounded-md text-sm mt-1">
                      git clone https://github.com/yourusername/proxy-guard.git
                      cd proxy-guard
                    </pre>
                    
                    <h4 className="text-md font-medium pt-3">Step 2: Configure Environment Variables</h4>
                    <p>
                      Create or edit the <code>.env</code> file to set your configuration:
                    </p>
                    <pre className="bg-muted p-2 rounded-md text-sm mt-1">
{`# Proxy settings
PROXY_PORT=8080
NGINX_CONFIG_PATH=/etc/nginx/nginx.conf

# Authentication settings
AUTH_TYPE=none   # Options: none, ldap, saml
LDAP_SERVER=ldap.example.com
LDAP_PORT=389
LDAP_USE_SSL=false
LDAP_BIND_DN=cn=admin,dc=example,dc=com
LDAP_SEARCH_BASE=ou=users,dc=example,dc=com
LDAP_SEARCH_FILTER=(uid={{username}})

# Client authentication (for proxy access)
CLIENT_AUTH_REQUIRED=false
CLIENT_AUTH_METHOD=none   # Options: none, basic, ldap
CLIENT_AUTH_REALM=Proxy Access`}
                    </pre>
                    
                    <h4 className="text-md font-medium pt-3">Step 3: SSL Certificates</h4>
                    <p>
                      For the combined HTTP/HTTPS proxy, you need SSL certificates:
                    </p>
                    <ul className="list-disc list-inside space-y-2 pl-4">
                      <li>
                        Place your certificates in the <code>nginx/certs/</code> directory:
                        <ul className="list-disc list-inside space-y-1 pl-4 mt-1">
                          <li><code>server.crt</code> - SSL certificate</li>
                          <li><code>server.key</code> - Private key</li>
                        </ul>
                      </li>
                      <li>
                        Or generate self-signed certificates (for testing only):
                        <pre className="bg-muted p-2 rounded-md text-sm mt-1 ml-4">
{`mkdir -p nginx/certs
openssl req -x509 -nodes -days 365 -newkey rsa:2048 \
  -keyout nginx/certs/server.key \
  -out nginx/certs/server.crt \
  -subj "/CN=proxy-guard"`}
                        </pre>
                      </li>
                    </ul>
                    
                    <h4 className="text-md font-medium pt-3">Step 4: Start the Services</h4>
                    <p>
                      Launch Proxy Guard using Docker Compose:
                    </p>
                    <pre className="bg-muted p-2 rounded-md text-sm mt-1">
                      docker-compose up -d
                    </pre>
                    
                    <h4 className="text-md font-medium pt-3">Docker Compose File</h4>
                    <p>
                      Here's the <code>docker-compose.yml</code> file that defines the services:
                    </p>
                    <pre className="bg-muted p-3 rounded-md overflow-x-auto text-sm mt-2">
{`version: '3'

services:
  # Web UI for proxy management
  app:
    build:
      context: ./app
    ports:
      - "3000:3000"
    environment:
      - NGINX_CONFIG_PATH=/etc/nginx/nginx.conf
    volumes:
      - nginx_config:/etc/nginx
    networks:
      - proxy-network
    depends_on:
      - nginx-proxy

  # Nginx proxy service
  nginx-proxy:
    build:
      context: ./nginx
    ports:
      - "${PROXY_PORT:-8080}:8080"
    volumes:
      - nginx_config:/etc/nginx
      - ./nginx/certs:/etc/nginx/certs:ro
    networks:
      - proxy-network
    restart: unless-stopped

networks:
  proxy-network:

volumes:
  nginx_config:`}
                    </pre>
                    
                    <h4 className="text-md font-medium pt-3">Accessing the Application</h4>
                    <p>
                      After starting the containers:
                    </p>
                    <ul className="list-disc list-inside space-y-2 pl-4">
                      <li>Access the management interface: <code>http://localhost:3000</code></li>
                      <li>Configure your clients to use the proxy at: <code>http(s)://your-server-ip:8080</code></li>
                    </ul>
                    
                    <h4 className="text-md font-medium pt-3">Basic Client Proxy Configuration</h4>
                    <p>
                      To use the proxy from a client machine:
                    </p>
                    <pre className="bg-muted p-2 rounded-md text-sm mt-1">
{`# Linux/macOS environment variables
export http_proxy=http://your-server-ip:8080
export https_proxy=http://your-server-ip:8080

# With authentication (if enabled)
export http_proxy=http://username:password@your-server-ip:8080
export https_proxy=http://username:password@your-server-ip:8080

# For Windows CMD
set http_proxy=http://your-server-ip:8080
set https_proxy=http://your-server-ip:8080

# For PowerShell
$env:http_proxy = "http://your-server-ip:8080"
$env:https_proxy = "http://your-server-ip:8080"`}
                    </pre>
                    
                    <h4 className="text-md font-medium pt-3">Managing the Docker Environment</h4>
                    <ul className="list-disc list-inside space-y-2 pl-4">
                      <li>
                        Stop the services:
                        <pre className="bg-muted p-2 rounded-md text-sm mt-1 ml-4">
                          docker-compose down
                        </pre>
                      </li>
                      <li>
                        View logs:
                        <pre className="bg-muted p-2 rounded-md text-sm mt-1 ml-4">
                          docker-compose logs -f
                        </pre>
                      </li>
                      <li>
                        Restart after configuration changes:
                        <pre className="bg-muted p-2 rounded-md text-sm mt-1 ml-4">
                          docker-compose restart
                        </pre>
                      </li>
                    </ul>
                  </div>
                </ScrollArea>
              </TabsContent>
              
              <TabsContent value="troubleshooting">
                <ScrollArea className="h-[500px] rounded-md border p-4">
                  <div className="space-y-4">
                    <h3 className="text-lg font-medium">Troubleshooting Common Issues</h3>
                    
                    <h4 className="text-md font-medium pt-3">Access Issues</h4>
                    <div className="space-y-2 pl-4">
                      <div className="border rounded-md p-3">
                        <h5 className="font-medium">Problem: Client cannot access any websites through the proxy</h5>
                        <ul className="list-disc list-inside space-y-1 pl-4 pt-2">
                          <li>
                            Verify that the client&apos;s IP address is included in at least one enabled whitelist group
                          </li>
                          <li>
                            Check that the requested destination is included in the same whitelist group
                          </li>
                          <li>
                            Ensure that Nginx is running and the configuration has been applied
                          </li>
                          <li>
                            Verify that the client is correctly configured to use the proxy (proper IP and port)
                          </li>
                        </ul>
                      </div>
                      
                      <div className="border rounded-md p-3">
                        <h5 className="font-medium">Problem: Client can access some websites but not others</h5>
                        <ul className="list-disc list-inside space-y-1 pl-4 pt-2">
                          <li>
                            Check if the inaccessible websites are included in an enabled whitelist group
                          </li>
                          <li>
                            Verify that the domain format is correct (no protocol prefix like http:// or https://)
                          </li>
                          <li>
                            For HTTPS connections, ensure that the Nginx build includes stream support
                          </li>
                        </ul>
                      </div>
                    </div>
                    
                    <h4 className="text-md font-medium pt-3">Configuration Issues</h4>
                    <div className="space-y-2 pl-4">
                      <div className="border rounded-md p-3">
                        <h5 className="font-medium">Problem: Configuration changes don&apos;t take effect</h5>
                        <ul className="list-disc list-inside space-y-1 pl-4 pt-2">
                          <li>
                            Check if Nginx configuration was successfully reloaded after changes
                          </li>
                          <li>
                            Verify that the application has write permissions to the configuration file
                          </li>
                          <li>
                            Look for syntax errors in the Nginx configuration
                          </li>
                        </ul>
                      </div>
                      
                      <div className="border rounded-md p-3">
                        <h5 className="font-medium">Problem: Nginx fails to start or reload</h5>
                        <ul className="list-disc list-inside space-y-1 pl-4 pt-2">
                          <li>
                            Check the Nginx error log for detailed error messages:
                            <pre className="bg-muted p-1 rounded-md text-sm mt-1">
                              tail -n 50 /var/log/nginx/error.log
                            </pre>
                          </li>
                          <li>
                            Test the configuration for syntax errors:
                            <pre className="bg-muted p-1 rounded-md text-sm mt-1">
                              nginx -t
                            </pre>
                          </li>
                          <li>
                            Verify that Nginx has appropriate permissions to read all included files
                          </li>
                        </ul>
                      </div>
                    </div>
                    
                    <h4 className="text-md font-medium pt-3">Web Interface Issues</h4>
                    <div className="space-y-2 pl-4">
                      <div className="border rounded-md p-3">
                        <h5 className="font-medium">Problem: Cannot save settings in the web interface</h5>
                        <ul className="list-disc list-inside space-y-1 pl-4 pt-2">
                          <li>
                            Check if the application has appropriate file system permissions
                          </li>
                          <li>
                            Verify that all required fields are completed correctly
                          </li>
                          <li>
                            Look for any error messages in the browser console
                          </li>
                        </ul>
                      </div>
                      
                      <div className="border rounded-md p-3">
                        <h5 className="font-medium">Problem: Authentication problems</h5>
                        <ul className="list-disc list-inside space-y-1 pl-4 pt-2">
                          <li>
                            For LDAP: Verify server URL, bind DN, and search parameters
                          </li>
                          <li>
                            For SAML: Check entity ID, assertion consumer service URL, and IdP metadata
                          </li>
                          <li>
                            Ensure network connectivity to authentication servers
                          </li>
                        </ul>
                      </div>
                    </div>
                    
                    <h4 className="text-md font-medium pt-3">Getting Help</h4>
                    <p>
                      If you continue to experience issues:
                    </p>
                    
                    <ul className="list-disc list-inside space-y-1 pl-4">
                      <li>
                        Check the Nginx logs for detailed error information
                      </li>
                      <li>
                        Consult the{" "}
                        <a href="https://github.com/dominikwinter/nginx-forward-proxy" className="text-primary hover:underline">
                          nginx-forward-proxy documentation
                        </a>{" "}
                        for more information on the base project
                      </li>
                      <li>
                        Ensure your Nginx version is compatible with the required features
                      </li>
                    </ul>
                  </div>
                </ScrollArea>
              </TabsContent>
            </Tabs>
          </CardContent>
        </Card>
      </div>
    </Layout>
  );
}
