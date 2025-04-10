
import { useState, useEffect } from "react";
import { ArrowRight, CheckCircle2, Lock, Shield, XCircle } from "lucide-react";
import { Layout } from "@/components/layout/Layout";
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { mockWhitelistGroups, mockNginxStatus } from "@/utils/mockData";
import { Link } from "react-router-dom";

export default function HttpsProxy() {
  const [whitelistGroups] = useState(mockWhitelistGroups);
  const [nginxStatus] = useState(mockNginxStatus);
  
  useEffect(() => {
    document.title = "HTTPS Proxy | Proxy Guard";
  }, []);
  
  const activeGroups = whitelistGroups.filter(group => group.enabled);

  return (
    <Layout>
      <div className="flex flex-col gap-4">
        <h1 className="text-3xl font-bold tracking-tight">HTTPS Proxy</h1>
        
        <div className="grid gap-4 md:grid-cols-2">
          <Card>
            <CardHeader>
              <CardTitle>HTTPS Proxy Status</CardTitle>
              <CardDescription>HTTPS forward proxy on port 8443</CardDescription>
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
                    <span className="font-mono">8443</span>
                  </li>
                  <li className="flex justify-between">
                    <span className="text-muted-foreground">SSL Preread:</span>
                    <span className="font-mono">Enabled</span>
                  </li>
                  <li className="flex justify-between">
                    <span className="text-muted-foreground">Connection Timeout:</span>
                    <span className="font-mono">600s</span>
                  </li>
                  <li className="flex justify-between">
                    <span className="text-muted-foreground">Active Whitelist Groups:</span>
                    <Badge variant="outline">{activeGroups.length}</Badge>
                  </li>
                </ul>
              </div>
              
              {nginxStatus.isRunning ? (
                <Alert className="bg-green-50 border-green-200">
                  <Shield className="h-4 w-4 text-green-500" />
                  <AlertTitle>Proxy is active</AlertTitle>
                  <AlertDescription>
                    HTTPS proxy is running and accepting connections on port 8443.
                  </AlertDescription>
                </Alert>
              ) : (
                <Alert variant="destructive">
                  <XCircle className="h-4 w-4" />
                  <AlertTitle>Proxy is not running</AlertTitle>
                  <AlertDescription>
                    HTTPS proxy service is currently not active.
                  </AlertDescription>
                </Alert>
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
              <CardTitle>HTTPS Stream Module</CardTitle>
              <CardDescription>
                Information about HTTPS proxy requirements
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div>
                <h3 className="text-sm font-medium mb-2">Stream Module Requirements</h3>
                <p className="text-sm text-muted-foreground mb-4">
                  The HTTPS proxy functionality relies on Nginx's Stream module. This module 
                  must be compiled into Nginx for HTTPS forwarding to work correctly.
                </p>
                
                <div className="rounded-md border p-3">
                  <div className="flex items-start gap-3">
                    <Lock className="h-5 w-5 text-amber-500 mt-0.5" />
                    <div>
                      <h4 className="font-medium text-sm">SSL Preread Technology</h4>
                      <p className="text-xs text-muted-foreground mt-1">
                        The HTTPS proxy uses Nginx's SSL preread feature to extract the SNI (Server Name Indication)
                        from HTTPS requests without decrypting the traffic, preserving the end-to-end encryption.
                      </p>
                    </div>
                  </div>
                </div>
              </div>
              
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
              How to configure clients to use this HTTPS proxy
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              <p>
                Configure your clients to use the HTTPS proxy with these settings:
              </p>
              
              <div className="rounded-md bg-muted p-4">
                <h3 className="text-sm font-medium mb-2">Proxy Configuration</h3>
                <ul className="space-y-2 text-sm">
                  <li className="flex justify-between">
                    <span className="text-muted-foreground">Proxy Type:</span>
                    <span className="font-mono">HTTPS</span>
                  </li>
                  <li className="flex justify-between">
                    <span className="text-muted-foreground">Server:</span>
                    <span className="font-mono">[your-server-hostname-or-ip]</span>
                  </li>
                  <li className="flex justify-between">
                    <span className="text-muted-foreground">Port:</span>
                    <span className="font-mono">8443</span>
                  </li>
                </ul>
              </div>
              
              <div className="space-y-2">
                <h3 className="text-sm font-medium">Example Configurations</h3>
                
                <div className="rounded-md border p-3">
                  <h4 className="text-xs font-medium mb-1">Environment Variables</h4>
                  <pre className="bg-muted p-2 rounded text-xs overflow-x-auto">
                    export HTTPS_PROXY=https://your-proxy-server:8443
                  </pre>
                </div>
                
                <div className="rounded-md border p-3">
                  <h4 className="text-xs font-medium mb-1">Technical Notes</h4>
                  <ul className="list-disc list-inside text-xs text-muted-foreground space-y-1 mt-1">
                    <li>
                      The HTTPS proxy transparently forwards encrypted traffic without decryption
                    </li>
                    <li>
                      SNI (Server Name Indication) extension is used to determine the destination
                    </li>
                    <li>
                      All whitelisting rules applied to HTTP proxy also apply to HTTPS traffic
                    </li>
                  </ul>
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
              </div>
            </div>
          </CardContent>
        </Card>
      </div>
    </Layout>
  );
}
