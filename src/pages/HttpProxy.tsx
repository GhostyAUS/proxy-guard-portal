
import { useEffect } from "react";
import { ArrowRight, CheckCircle2, Server, XCircle } from "lucide-react";
import { Layout } from "@/components/layout/Layout";
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { useProxy } from "@/contexts/ProxyContext";

export default function HttpProxy() {
  const { whitelistGroups, nginxStatus, proxySettings, isLoading, checkStatus } = useProxy();
  
  useEffect(() => {
    document.title = "HTTP Proxy | Proxy Guard";
    // Check status when page loads
    checkStatus();
  }, [checkStatus]);
  
  const activeGroups = whitelistGroups.filter(group => group.enabled);

  if (isLoading) {
    return (
      <Layout>
        <div className="flex items-center justify-center h-[60vh]">
          <div className="animate-spin rounded-full h-10 w-10 border-b-2 border-primary"></div>
        </div>
      </Layout>
    );
  }

  return (
    <Layout>
      <div className="flex flex-col gap-4">
        <h1 className="text-3xl font-bold tracking-tight">HTTP Proxy</h1>
        
        <div className="grid gap-4 md:grid-cols-2">
          <Card>
            <CardHeader>
              <CardTitle>HTTP Proxy Status</CardTitle>
              <CardDescription>HTTP forward proxy on port {proxySettings.proxyPort}</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="flex items-center gap-2">
                {nginxStatus.isRunning ? (
                  <>
                    <CheckCircle2 className="h-5 w-5 text-green-500" />
                    <span className="font-medium text-green-500">Running</span>
                  </>
                ) : (
                  <>
                    <XCircle className="h-5 w-5 text-destructive" />
                    <span className="font-medium text-destructive">Not Running</span>
                  </>
                )}
              </div>
              
              <div>
                <h3 className="text-sm font-medium mb-2">Configuration</h3>
                <ul className="space-y-2 text-sm">
                  <li className="flex justify-between">
                    <span className="text-muted-foreground">Listening Port:</span>
                    <span className="font-mono">{proxySettings.proxyPort}</span>
                  </li>
                  <li className="flex justify-between">
                    <span className="text-muted-foreground">Network Mode:</span>
                    <span className="font-mono">Host</span>
                  </li>
                  <li className="flex justify-between">
                    <span className="text-muted-foreground">DNS Resolver:</span>
                    <span className="font-mono">8.8.8.8</span>
                  </li>
                  <li className="flex justify-between">
                    <span className="text-muted-foreground">Connection Timeout:</span>
                    <span className="font-mono">60s</span>
                  </li>
                  <li className="flex justify-between">
                    <span className="text-muted-foreground">Active Whitelist Groups:</span>
                    <Badge variant="outline">{activeGroups.length}</Badge>
                  </li>
                </ul>
              </div>
              
              {nginxStatus.isRunning ? (
                <Alert className="bg-green-50 border-green-200">
                  <Server className="h-4 w-4 text-green-500" />
                  <AlertTitle>Proxy is active</AlertTitle>
                  <AlertDescription>
                    HTTP proxy is running on host network and accepting connections on port {proxySettings.proxyPort}.
                  </AlertDescription>
                </Alert>
              ) : (
                <Alert variant="destructive">
                  <XCircle className="h-4 w-4" />
                  <AlertTitle>Proxy is not running</AlertTitle>
                  <AlertDescription>
                    HTTP proxy service is currently not active.
                  </AlertDescription>
                </Alert>
              )}
            </CardContent>
            <CardFooter>
              <Button variant="outline" asChild>
                <a href="/documentation">View Documentation</a>
              </Button>
            </CardFooter>
          </Card>
          
          <Card>
            <CardHeader>
              <CardTitle>Configuration</CardTitle>
              <CardDescription>
                HTTP proxy settings and active whitelists
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div>
                <h3 className="text-sm font-medium mb-2">Active Whitelist Groups</h3>
                {activeGroups.length > 0 ? (
                  <div className="space-y-2">
                    {activeGroups.map((group) => (
                      <div key={group.id} className="flex items-center justify-between rounded-md border p-3">
                        <div>
                          <p className="font-medium">{group.name}</p>
                          <p className="text-xs text-muted-foreground">
                            {group.clients.length} clients, {group.destinations.length} destinations
                          </p>
                        </div>
                        <Button variant="ghost" size="sm" asChild>
                          <a href={`/whitelist/${group.id}`}>
                            <ArrowRight className="h-4 w-4" />
                          </a>
                        </Button>
                      </div>
                    ))}
                  </div>
                ) : (
                  <div className="rounded-md border border-dashed p-8 text-center">
                    <h3 className="text-sm font-medium mb-1">No active whitelist groups</h3>
                    <p className="text-xs text-muted-foreground mb-4">
                      Create and enable whitelist groups to allow proxy access
                    </p>
                    <Button asChild>
                      <a href="/whitelist/create">Create Whitelist Group</a>
                    </Button>
                  </div>
                )}
              </div>
            </CardContent>
            <CardFooter>
              <Button variant="outline" asChild>
                <a href="/whitelist">
                  Manage Whitelist Groups
                </a>
              </Button>
            </CardFooter>
          </Card>
        </div>
        
        <Card>
          <CardHeader>
            <CardTitle>Client Configuration</CardTitle>
            <CardDescription>
              How to configure clients to use this HTTP proxy
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              <p>
                Configure your clients to use the HTTP proxy with these settings:
              </p>
              
              <div className="rounded-md bg-muted p-4">
                <h3 className="text-sm font-medium mb-2">Proxy Configuration</h3>
                <ul className="space-y-2 text-sm">
                  <li className="flex justify-between">
                    <span className="text-muted-foreground">Proxy Type:</span>
                    <span className="font-mono">HTTP</span>
                  </li>
                  <li className="flex justify-between">
                    <span className="text-muted-foreground">Server:</span>
                    <span className="font-mono">[your-server-hostname-or-ip]</span>
                  </li>
                  <li className="flex justify-between">
                    <span className="text-muted-foreground">Port:</span>
                    <span className="font-mono">{proxySettings.proxyPort}</span>
                  </li>
                  <li className="flex justify-between">
                    <span className="text-muted-foreground">Network Mode:</span>
                    <span className="font-mono">Host</span>
                  </li>
                </ul>
              </div>
              
              <div className="space-y-2">
                <h3 className="text-sm font-medium">Example Configurations</h3>
                
                <div className="rounded-md border p-3">
                  <h4 className="text-xs font-medium mb-1">Command Line (curl)</h4>
                  <pre className="bg-muted p-2 rounded text-xs overflow-x-auto">
                    curl -x http://your-server-ip:{proxySettings.proxyPort} https://example.com
                  </pre>
                </div>
                
                <div className="rounded-md border p-3">
                  <h4 className="text-xs font-medium mb-1">Environment Variables</h4>
                  <pre className="bg-muted p-2 rounded text-xs overflow-x-auto">
                    export HTTP_PROXY=http://your-server-ip:{proxySettings.proxyPort}
                    export HTTPS_PROXY=http://your-server-ip:{proxySettings.proxyPort}
                  </pre>
                </div>
                
                <div className="rounded-md border p-3 mt-2">
                  <h4 className="text-xs font-medium mb-1">Accessing Web UI</h4>
                  <p className="text-xs text-muted-foreground">
                    Since the app is running in host network mode, access the web UI directly via:
                  </p>
                  <pre className="bg-muted p-2 rounded text-xs overflow-x-auto mt-1">
                    http://your-server-ip:3000
                  </pre>
                </div>
                
                <p className="text-sm text-amber-600 mt-2">
                  <strong>Note:</strong> Since the proxy is running in host network mode, 
                  it will use the host's network interfaces directly. You can use either the 
                  server's IP address or hostname to connect.
                </p>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>
    </Layout>
  );
}
