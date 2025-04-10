import { useState, useEffect } from "react";
import { Link, useLocation } from "react-router-dom";
import { ArrowUpDown, Edit, Plus, Trash, RefreshCw, AlertCircle, Bug, Code, Server } from "lucide-react";
import { 
  Table, 
  TableBody, 
  TableCell, 
  TableHead, 
  TableHeader, 
  TableRow 
} from "@/components/ui/table";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle, CardFooter } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Layout } from "@/components/layout/Layout";
import { WhitelistGroup } from "@/types/proxy";
import { Switch } from "@/components/ui/switch";
import { toast } from "sonner";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { useWhitelistGroups } from "@/hooks/useWhitelistGroups";
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from "@/components/ui/accordion";
import axios from "axios";
import { v4 as uuidv4 } from "uuid";

export default function WhitelistGroups() {
  const location = useLocation();
  const { groups, isLoading, error, addGroup, updateGroup, deleteGroup: removeGroup, fetchGroups, toggleGroupEnabled } = useWhitelistGroups();
  const [searchQuery, setSearchQuery] = useState("");
  const [deleteGroupItem, setDeleteGroupItem] = useState<WhitelistGroup | null>(null);
  const [toggleLoading, setToggleLoading] = useState<string | null>(null);
  const [isDebugMode, setIsDebugMode] = useState(false);
  const [apiTestResults, setApiTestResults] = useState<Record<string, any>>({});
  const [apiRoutes, setApiRoutes] = useState<string[]>([]);
  const [lastRefreshed, setLastRefreshed] = useState<string>(new Date().toISOString());

  useEffect(() => {
    document.title = "Whitelist Groups | Proxy Guard";
    
    if (location.state?.newGroup) {
      const newGroup = location.state.newGroup;
      addGroup(newGroup);
      toast.success("Group created", { description: `${newGroup.name} has been created successfully` });
      
      window.history.replaceState({}, document.title);
    }
    
    if (location.state?.updatedGroup) {
      const updatedGroup = location.state.updatedGroup;
      updateGroup(updatedGroup);
      toast.success("Group updated", { description: `${updatedGroup.name} has been updated successfully` });
      
      window.history.replaceState({}, document.title);
    }
  }, [location.state, addGroup, updateGroup]);

  const handleSearch = (e: React.ChangeEvent<HTMLInputElement>) => {
    setSearchQuery(e.target.value);
  };

  const handleToggleGroup = async (groupId: string) => {
    try {
      setToggleLoading(groupId);
      console.log("Toggling group:", groupId);
      await toggleGroupEnabled(groupId);
    } catch (error) {
      console.error("Error toggling group:", error);
      toast.error("Failed to update group status");
    } finally {
      setToggleLoading(null);
    }
  };

  const handleDeleteGroup = (group: WhitelistGroup) => {
    setDeleteGroupItem(group);
  };

  const confirmDelete = async () => {
    if (deleteGroupItem) {
      try {
        console.log("Confirming deletion of group:", deleteGroupItem.id);
        await removeGroup(deleteGroupItem.id);
        toast.success(`Group deleted`, { 
          description: `${deleteGroupItem.name} has been deleted` 
        });
      } catch (error) {
        console.error("Error deleting group:", error);
        toast.error("Failed to delete group", {
          description: "An error occurred while deleting the group"
        });
      } finally {
        setDeleteGroupItem(null);
      }
    }
  };

  const handleRefresh = () => {
    toast.info("Refreshing whitelist groups...");
    fetchGroups();
    setLastRefreshed(new Date().toISOString());
  };

  const toggleDebugMode = () => {
    setIsDebugMode(!isDebugMode);
    
    if (!isDebugMode) {
      fetchApiRoutes();
    }
  };
  
  const fetchApiRoutes = async () => {
    try {
      const timestamp = new Date().getTime();
      const response = await axios.get(`/api/debug/routes?t=${timestamp}`);
      console.log("API routes:", response.data);
      setApiRoutes(response.data.routes || []);
    } catch (err) {
      console.error("Error fetching API routes:", err);
      setApiRoutes([]);
    }
  };
  
  const testApiEndpoint = async (endpoint: string) => {
    try {
      const timestamp = new Date().getTime();
      const response = await axios.get(`${endpoint}?t=${timestamp}`);
      console.log(`API test for ${endpoint}:`, response.data);
      setApiTestResults(prev => ({
        ...prev,
        [endpoint]: {
          status: response.status,
          data: response.data,
          timestamp: new Date().toISOString()
        }
      }));
      toast.success(`API test successful: ${endpoint}`);
      return response.data;
    } catch (err) {
      console.error(`API test failed for ${endpoint}:`, err);
      setApiTestResults(prev => ({
        ...prev,
        [endpoint]: {
          status: err.response?.status || 'Error',
          error: err.message,
          timestamp: new Date().toISOString()
        }
      }));
      toast.error(`API test failed: ${endpoint}`);
      return null;
    }
  };

  const filteredGroups = Array.isArray(groups) 
    ? groups.filter(group => 
        group.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
        (group.description && group.description.toLowerCase().includes(searchQuery.toLowerCase()))
      ) 
    : [];

  const handleCreateDemoGroup = async () => {
    try {
      const demoGroup = {
        name: `Demo Group ${new Date().toLocaleTimeString()}`,
        description: "Automatically created demo group",
        clients: [
          { id: uuidv4(), value: "10.0.0.1", description: "Demo Client 1" },
          { id: uuidv4(), value: "192.168.1.0/24", description: "Demo Network" }
        ],
        destinations: [
          { id: uuidv4(), value: "example.com", description: "Example Website" },
          { id: uuidv4(), value: "api.example.org", description: "Example API" }
        ],
        enabled: true
      };
      
      await addGroup(demoGroup);
      toast.success("Demo group created");
    } catch (error) {
      console.error("Error creating demo group:", error);
      toast.error("Failed to create demo group");
    }
  };

  return (
    <Layout>
      <div className="flex flex-col gap-4">
        <div className="flex items-center justify-between">
          <h1 className="text-3xl font-bold tracking-tight">Whitelist Groups</h1>
          <div className="flex gap-2">
            <Button variant="outline" onClick={handleRefresh}>
              <RefreshCw className="mr-2 h-4 w-4" /> Refresh
            </Button>
            <Button variant="outline" onClick={toggleDebugMode}>
              <Bug className="mr-2 h-4 w-4" /> {isDebugMode ? "Hide Debug" : "Debug"}
            </Button>
            <Button asChild>
              <Link to="/whitelist/create">
                <Plus className="mr-2 h-4 w-4" /> Create Group
              </Link>
            </Button>
          </div>
        </div>

        {isDebugMode && (
          <Card className="border-yellow-400 bg-yellow-50 dark:bg-yellow-950">
            <CardHeader className="pb-2">
              <CardTitle className="text-lg flex items-center">
                <Server className="h-5 w-5 mr-2" />
                Debug Information
              </CardTitle>
              <CardDescription>
                Technical information for troubleshooting API and data issues
              </CardDescription>
            </CardHeader>
            <CardContent>
              <Accordion type="single" collapsible className="w-full">
                <AccordionItem value="api-status">
                  <AccordionTrigger>API Status</AccordionTrigger>
                  <AccordionContent>
                    <div className="flex flex-col gap-2 text-sm">
                      <div><strong>API Base URL:</strong> {import.meta.env.VITE_API_BASE_URL || "/api"}</div>
                      <div><strong>Loading State:</strong> {isLoading ? "True" : "False"}</div>
                      <div><strong>Error:</strong> {error instanceof Error ? error.message : error ? String(error) : "None"}</div>
                      <div><strong>Groups Count:</strong> {groups?.length || 0}</div>
                      <div><strong>Last Refreshed:</strong> {new Date(lastRefreshed).toLocaleString()}</div>
                    </div>
                    <div className="mt-2 space-x-2">
                      <Button size="sm" onClick={handleRefresh} variant="outline">
                        Retry API Call
                      </Button>
                      <Button size="sm" onClick={handleCreateDemoGroup} variant="outline">
                        Create Demo Group
                      </Button>
                    </div>
                  </AccordionContent>
                </AccordionItem>
                <AccordionItem value="groups-data">
                  <AccordionTrigger>Groups Data</AccordionTrigger>
                  <AccordionContent>
                    <pre className="bg-slate-100 dark:bg-slate-900 p-2 rounded text-xs overflow-auto max-h-60">
                      {JSON.stringify(groups, null, 2)}
                    </pre>
                  </AccordionContent>
                </AccordionItem>
                <AccordionItem value="api-routes">
                  <AccordionTrigger>API Routes</AccordionTrigger>
                  <AccordionContent>
                    <div className="mb-2">
                      <Button 
                        size="sm" 
                        onClick={fetchApiRoutes}
                        variant="outline"
                      >
                        Refresh API Routes
                      </Button>
                    </div>
                    {apiRoutes.length > 0 ? (
                      <div className="bg-slate-100 dark:bg-slate-900 p-2 rounded text-xs">
                        <h4 className="font-medium mb-2">Available API Routes:</h4>
                        <ul className="space-y-1">
                          {apiRoutes.map((route, index) => (
                            <li key={index} className="flex items-center justify-between">
                              <code>{route}</code>
                              <Button 
                                size="sm" 
                                variant="ghost" 
                                onClick={() => testApiEndpoint(`/api${route}`)}
                                className="h-6 px-2"
                              >
                                Test
                              </Button>
                            </li>
                          ))}
                        </ul>
                      </div>
                    ) : (
                      <p className="text-sm">No API routes found or loaded yet.</p>
                    )}
                  </AccordionContent>
                </AccordionItem>
                <AccordionItem value="api-request">
                  <AccordionTrigger>API Request Test</AccordionTrigger>
                  <AccordionContent>
                    <div className="space-y-2">
                      <div className="flex flex-wrap gap-2">
                        <Button 
                          size="sm" 
                          onClick={() => testApiEndpoint('/api/whitelist-groups')}
                          className="mr-2"
                        >
                          Test Groups API
                        </Button>
                        <Button 
                          size="sm" 
                          onClick={() => testApiEndpoint('/api/debug/routes')}
                          className="mr-2"
                        >
                          Test Routes API
                        </Button>
                        <Button 
                          size="sm" 
                          onClick={() => testApiEndpoint('/api/health')}
                        >
                          Test Health API
                        </Button>
                      </div>
                      
                      {Object.keys(apiTestResults).length > 0 && (
                        <div className="mt-4">
                          <h4 className="text-sm font-medium mb-2">Test Results:</h4>
                          <div className="space-y-4">
                            {Object.entries(apiTestResults).map(([endpoint, result], index) => (
                              <div 
                                key={index} 
                                className={`p-2 rounded-md text-xs ${
                                  result.status >= 200 && result.status < 300 
                                    ? 'bg-green-50 border-green-200 dark:bg-green-950 border dark:border-green-800' 
                                    : 'bg-red-50 border-red-200 dark:bg-red-950 border dark:border-red-800'
                                }`}
                              >
                                <div className="font-medium mb-1 flex justify-between">
                                  <span>{endpoint}</span>
                                  <span className={result.status >= 200 && result.status < 300 ? 'text-green-600 dark:text-green-400' : 'text-red-600 dark:text-red-400'}>
                                    Status: {result.status}
                                  </span>
                                </div>
                                <div className="mb-1 text-xs text-muted-foreground">
                                  Time: {new Date(result.timestamp).toLocaleString()}
                                </div>
                                {result.error ? (
                                  <div className="text-red-600 dark:text-red-400">{result.error}</div>
                                ) : (
                                  <pre className="whitespace-pre-wrap overflow-auto max-h-40 bg-slate-100 dark:bg-slate-900 p-1 rounded">
                                    {JSON.stringify(result.data, null, 2)}
                                  </pre>
                                )}
                              </div>
                            ))}
                          </div>
                        </div>
                      )}
                    </div>
                  </AccordionContent>
                </AccordionItem>
                <AccordionItem value="request-headers">
                  <AccordionTrigger>Request Headers</AccordionTrigger>
                  <AccordionContent>
                    <Button 
                      size="sm" 
                      onClick={async () => {
                        const timestamp = new Date().getTime();
                        const response = await axios.get(`/api/whitelist-groups?t=${timestamp}`, {
                          headers: {
                            'X-Debug': 'true',
                            'Cache-Control': 'no-cache',
                            'Pragma': 'no-cache'
                          }
                        });
                        console.log("Request with debug headers:", response.data);
                        toast.success("Request sent with debug headers");
                      }}
                      className="mb-2"
                    >
                      Send Request with Debug Headers
                    </Button>
                    <pre className="bg-slate-100 dark:bg-slate-900 p-2 rounded text-xs">
{`// Headers used for API requests
{
  'Accept': 'application/json',
  'Content-Type': 'application/json',
  'Cache-Control': 'no-cache, no-store, must-revalidate',
  'Pragma': 'no-cache',
  'Expires': '0'
}`}
                    </pre>
                  </AccordionContent>
                </AccordionItem>
              </Accordion>
            </CardContent>
          </Card>
        )}

        <Card>
          <CardHeader>
            <CardTitle>Manage Groups</CardTitle>
            <CardDescription>
              Configure whitelist groups to control access between clients and destinations.
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="flex items-center py-4">
              <Input
                placeholder="Search groups..."
                value={searchQuery}
                onChange={handleSearch}
                className="max-w-sm"
              />
            </div>
            
            {isLoading ? (
              <div className="flex justify-center items-center h-40">
                <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
                <span className="ml-2">Loading whitelist groups...</span>
              </div>
            ) : error ? (
              <div className="rounded-md bg-destructive/10 p-4 text-center flex flex-col items-center">
                <AlertCircle className="h-6 w-6 text-destructive mb-2" />
                <p className="text-destructive font-medium">Failed to load groups</p>
                <p className="text-destructive/80 text-sm mb-2">
                  {error instanceof Error ? error.message : String(error)}
                </p>
                <Button 
                  variant="outline" 
                  className="mt-2"
                  onClick={handleRefresh}
                >
                  Try Again
                </Button>
              </div>
            ) : (
              <div className="rounded-md border">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead className="w-[300px]">
                        <div className="flex items-center gap-1">
                          Name
                          <ArrowUpDown className="h-3 w-3" />
                        </div>
                      </TableHead>
                      <TableHead className="hidden md:table-cell">Status</TableHead>
                      <TableHead className="hidden md:table-cell">Clients</TableHead>
                      <TableHead className="hidden md:table-cell">Destinations</TableHead>
                      <TableHead className="text-right">Actions</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {filteredGroups.length > 0 ? filteredGroups.map((group) => (
                      <TableRow key={group.id}>
                        <TableCell className="font-medium">
                          <div className="flex flex-col">
                            <span>{group.name}</span>
                            {group.description && (
                              <span className="text-xs text-muted-foreground hidden md:block">
                                {group.description}
                              </span>
                            )}
                          </div>
                        </TableCell>
                        <TableCell className="hidden md:table-cell">
                          <div className="flex items-center space-x-2">
                            <Switch 
                              checked={group.enabled}
                              onCheckedChange={() => handleToggleGroup(group.id)}
                              disabled={toggleLoading === group.id}
                            />
                            <Badge variant={group.enabled ? "default" : "outline"}>
                              {toggleLoading === group.id ? "Updating..." : group.enabled ? "Enabled" : "Disabled"}
                            </Badge>
                          </div>
                        </TableCell>
                        <TableCell className="hidden md:table-cell">{group.clients ? group.clients.length : 0}</TableCell>
                        <TableCell className="hidden md:table-cell">{group.destinations ? group.destinations.length : 0}</TableCell>
                        <TableCell className="text-right">
                          <div className="flex justify-end gap-2">
                            <Button variant="outline" size="icon" asChild>
                              <Link to={`/whitelist/${group.id}`}>
                                <Edit className="h-4 w-4" />
                              </Link>
                            </Button>
                            <Button 
                              variant="outline" 
                              size="icon" 
                              className="text-destructive"
                              onClick={() => handleDeleteGroup(group)}
                            >
                              <Trash className="h-4 w-4" />
                            </Button>
                          </div>
                        </TableCell>
                      </TableRow>
                    )) : (
                      <TableRow>
                        <TableCell colSpan={5} className="h-24 text-center">
                          <div className="flex flex-col items-center justify-center">
                            <p className="mb-2">No whitelist groups found.</p>
                            <Button size="sm" onClick={handleCreateDemoGroup}>
                              <Plus className="h-4 w-4 mr-2" /> Create Demo Group
                            </Button>
                          </div>
                        </TableCell>
                      </TableRow>
                    )}
                  </TableBody>
                </Table>
              </div>
            )}
          </CardContent>
          {filteredGroups.length > 0 && (
            <CardFooter className="text-sm text-muted-foreground">
              Showing {filteredGroups.length} of {Array.isArray(groups) ? groups.length : 0} groups
            </CardFooter>
          )}
        </Card>
      </div>

      <AlertDialog open={!!deleteGroupItem} onOpenChange={() => setDeleteGroupItem(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Are you sure?</AlertDialogTitle>
            <AlertDialogDescription>
              This action will permanently delete the group "{deleteGroupItem?.name}". 
              This action cannot be undone.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction className="bg-destructive" onClick={confirmDelete}>
              Delete
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </Layout>
  );
}
