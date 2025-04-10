
import { useEffect } from "react";
import { ArrowRight, CheckCircle2, Server, XCircle } from "lucide-react";
import { Layout } from "@/components/layout/Layout";
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Link } from "react-router-dom";
import { useNginxStatus } from "@/hooks/useNginxStatus";
import { useWhitelistGroups } from "@/hooks/useWhitelistGroups";
import { Skeleton } from "@/components/ui/skeleton";
import { NginxStatus } from "@/types/proxy";

export default function HttpProxy() {
  const { groups, isLoading: isLoadingGroups } = useWhitelistGroups();
  const { data: nginxStatus, isLoading: isLoadingStatus } = useNginxStatus();
  
  useEffect(() => {
    document.title = "HTTP Proxy | Proxy Guard";
  }, []);
  
  const activeGroups = groups?.filter(group => group.enabled) || [];

  return (
    <Layout>
      <div className="flex flex-col gap-4">
        <h1 className="text-3xl font-bold tracking-tight">HTTP Proxy</h1>
        
        <div className="grid gap-4 md:grid-cols-2">
          <Card>
            <CardHeader>
              <CardTitle>HTTP Proxy Status</CardTitle>
              <CardDescription>HTTP forward proxy on port 80</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              {isLoadingStatus ? (
                <div className="space-y-2">
                  <Skeleton className="h-5 w-32" />
                  <Skeleton className="h-20 w-full" />
                  <Skeleton className="h-16 w-full" />
                </div>
              ) : (
                <>
                  <div className="flex items-center gap-2">
                    {(nginxStatus as NginxStatus)?.isRunning ? (
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
                        <span className="font-mono">80</span>
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
                  
                  {(nginxStatus as NginxStatus)?.isRunning ? (
                    <Alert className="bg-green-50 border-green-200">
                      <Server className="h-4 w-4 text-green-500" />
                      <AlertTitle>Proxy is active</AlertTitle>
                      <AlertDescription>
                        HTTP proxy is running on host network and accepting connections on port 80.
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
                </>
              )}
            </CardContent>
            <CardFooter>
              <Button variant="outline" asChild>
                <Link to="/documentation">View Documentation</Link>
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
                {isLoadingGroups ? (
                  <div className="space-y-2">
                    <Skeleton className="h-16 w-full" />
                    <Skeleton className="h-16 w-full" />
                  </div>
                ) : (
                  activeGroups.length > 0 ? (
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
                            <Link to={`/whitelist/${group.id}`}>
                              <ArrowRight className="h-4 w-4" />
                            </Link>
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
                        <Link to="/whitelist/create">Create Whitelist Group</Link>
                      </Button>
                    </div>
                  )
                )}
              </div>
            </CardContent>
            <CardFooter>
              <Button variant="outline" asChild>
                <Link to="/whitelist">
                  Manage Whitelist Groups
                </Link>
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
                    <span className="font-mono">80</span>
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
                    curl -x http://your-server-ip:80 https://example.com
                  </pre>
                </div>
                
                <div className="rounded-md border p-3">
                  <h4 className="text-xs font-medium mb-1">Environment Variables</h4>
                  <pre className="bg-muted p-2 rounded text-xs overflow-x-auto">
                    export HTTP_PROXY=http://your-server-ip:80
                    export HTTPS_PROXY=http://your-server-ip:80
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
