
import { useEffect } from "react";
import { 
  ArrowRight, 
  CheckCircle2, 
  Globe, 
  ListFilter, 
  Server, 
  Shield,
  XCircle 
} from "lucide-react";
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";
import { Layout } from "@/components/layout/Layout";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { useProxy } from "@/contexts/ProxyContext";

export default function Dashboard() {
  const { whitelistGroups, nginxStatus, isLoading } = useProxy();

  useEffect(() => {
    document.title = "Dashboard | Proxy Guard";
  }, []);

  const activeGroups = whitelistGroups.filter(group => group.enabled).length;
  
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
        <div className="flex items-center justify-between">
          <h1 className="text-3xl font-bold tracking-tight">Dashboard</h1>
          <Button asChild>
            <a href="/whitelist/create">Create Whitelist Group</a>
          </Button>
        </div>

        <div className="grid grid-cols-1 gap-4 md:grid-cols-2 lg:grid-cols-4">
          <Card>
            <CardHeader className="flex flex-row items-center justify-between pb-2 space-y-0">
              <CardTitle className="text-sm font-medium">Whitelist Groups</CardTitle>
              <ListFilter className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{whitelistGroups.length}</div>
              <p className="text-xs text-muted-foreground">
                {activeGroups} active, {whitelistGroups.length - activeGroups} inactive
              </p>
            </CardContent>
          </Card>
          
          <Card>
            <CardHeader className="flex flex-row items-center justify-between pb-2 space-y-0">
              <CardTitle className="text-sm font-medium">Nginx Status</CardTitle>
              <Server className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="flex items-center gap-2">
                {nginxStatus.isRunning ? (
                  <>
                    <CheckCircle2 className="h-4 w-4 text-green-500" />
                    <span className="text-green-500 font-medium">Running</span>
                  </>
                ) : (
                  <>
                    <XCircle className="h-4 w-4 text-destructive" />
                    <span className="text-destructive font-medium">Stopped</span>
                  </>
                )}
              </div>
              <p className="text-xs text-muted-foreground mt-1">
                Last modified: {new Date(nginxStatus.lastModified).toLocaleString()}
              </p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between pb-2 space-y-0">
              <CardTitle className="text-sm font-medium">HTTP Proxy</CardTitle>
              <Globe className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="flex items-center gap-2">
                <CheckCircle2 className="h-4 w-4 text-green-500" />
                <span className="text-green-500 font-medium">Active</span>
              </div>
              <p className="text-xs text-muted-foreground mt-1">
                Port 8080
              </p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between pb-2 space-y-0">
              <CardTitle className="text-sm font-medium">HTTPS Proxy</CardTitle>
              <Shield className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="flex items-center gap-2">
                <CheckCircle2 className="h-4 w-4 text-green-500" />
                <span className="text-green-500 font-medium">Active</span>
              </div>
              <p className="text-xs text-muted-foreground mt-1">
                Port 8443
              </p>
            </CardContent>
          </Card>
        </div>

        <h2 className="text-xl font-semibold mt-6">Whitelist Groups</h2>
        <div className="grid grid-cols-1 gap-4 md:grid-cols-2 lg:grid-cols-3">
          {whitelistGroups.map((group) => (
            <Card key={group.id} className="overflow-hidden">
              <CardHeader>
                <div className="flex items-center justify-between">
                  <CardTitle>{group.name}</CardTitle>
                  <Badge variant={group.enabled ? "default" : "outline"}>
                    {group.enabled ? "Enabled" : "Disabled"}
                  </Badge>
                </div>
                <CardDescription>{group.description}</CardDescription>
              </CardHeader>
              <CardContent>
                <div className="grid gap-2">
                  <div>
                    <h3 className="text-sm font-medium">Clients</h3>
                    <p className="text-sm text-muted-foreground">
                      {group.clients.length} IPs/Subnets
                    </p>
                  </div>
                  <div>
                    <h3 className="text-sm font-medium">Destinations</h3>
                    <p className="text-sm text-muted-foreground">
                      {group.destinations.length} URLs/Domains
                    </p>
                  </div>
                </div>
              </CardContent>
              <CardFooter className="bg-muted/50 p-2">
                <Button variant="ghost" size="sm" className="w-full" asChild>
                  <a href={`/whitelist/${group.id}`} className="flex items-center justify-center gap-1">
                    View details
                    <ArrowRight className="h-4 w-4" />
                  </a>
                </Button>
              </CardFooter>
            </Card>
          ))}
          <Card className="flex flex-col items-center justify-center p-6 border-dashed">
            <div className="flex h-20 w-20 items-center justify-center rounded-full bg-muted">
              <ListFilter className="h-10 w-10 text-muted-foreground" />
            </div>
            <h3 className="mt-4 text-xl font-medium">Create a new group</h3>
            <p className="mb-4 mt-2 text-center text-sm text-muted-foreground">
              Create a new whitelist group to manage access control.
            </p>
            <Button asChild>
              <a href="/whitelist/create">Create Whitelist Group</a>
            </Button>
          </Card>
        </div>
      </div>
    </Layout>
  );
}
