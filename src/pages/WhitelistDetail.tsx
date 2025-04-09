
import { useState, useEffect } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { toast } from "sonner";
import { 
  ArrowLeft, 
  Check, 
  Edit, 
  Globe, 
  Laptop, 
  Plus, 
  Save, 
  Trash
} from "lucide-react";
import { z } from "zod";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";

import { Layout } from "@/components/layout/Layout";
import { Button } from "@/components/ui/button";
import { 
  Card, 
  CardContent, 
  CardDescription, 
  CardFooter, 
  CardHeader, 
  CardTitle 
} from "@/components/ui/card";
import { 
  Form, 
  FormControl, 
  FormDescription, 
  FormField, 
  FormItem, 
  FormLabel, 
  FormMessage 
} from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Switch } from "@/components/ui/switch";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { 
  Table, 
  TableBody, 
  TableCell, 
  TableHead, 
  TableHeader, 
  TableRow 
} from "@/components/ui/table";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
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

import { ClientIP, Destination, WhitelistGroup } from "@/types/proxy";
import { mockWhitelistGroups } from "@/utils/mockData";

const formSchema = z.object({
  name: z.string().min(1, "Name is required"),
  description: z.string().optional(),
  enabled: z.boolean().default(true),
});

const clientSchema = z.object({
  value: z.string().min(1, "IP/subnet is required"),
  description: z.string().optional(),
});

const destinationSchema = z.object({
  value: z.string().min(1, "URL/domain is required"),
  description: z.string().optional(),
});

export default function WhitelistDetail() {
  const { id } = useParams();
  const navigate = useNavigate();
  const isCreating = id === "create";
  
  const [group, setGroup] = useState<WhitelistGroup | null>(null);
  const [isEditing, setIsEditing] = useState(isCreating);
  const [isAddingClient, setIsAddingClient] = useState(false);
  const [isAddingDestination, setIsAddingDestination] = useState(false);
  const [clientToDelete, setClientToDelete] = useState<string | null>(null);
  const [destinationToDelete, setDestinationToDelete] = useState<string | null>(null);
  
  const form = useForm<z.infer<typeof formSchema>>({
    resolver: zodResolver(formSchema),
    defaultValues: {
      name: "",
      description: "",
      enabled: true,
    },
  });
  
  const clientForm = useForm<z.infer<typeof clientSchema>>({
    resolver: zodResolver(clientSchema),
    defaultValues: {
      value: "",
      description: "",
    },
  });

  const destinationForm = useForm<z.infer<typeof destinationSchema>>({
    resolver: zodResolver(destinationSchema),
    defaultValues: {
      value: "",
      description: "",
    },
  });

  useEffect(() => {
    document.title = isCreating 
      ? "Create Whitelist Group | Proxy Guard"
      : "Edit Whitelist Group | Proxy Guard";
    
    if (!isCreating && id) {
      // Find the group with the matching ID
      const foundGroup = mockWhitelistGroups.find(g => g.id === id);
      if (foundGroup) {
        setGroup(foundGroup);
        form.reset({
          name: foundGroup.name,
          description: foundGroup.description || "",
          enabled: foundGroup.enabled,
        });
      } else {
        toast.error("Group not found");
        navigate("/whitelist");
      }
    }
  }, [id, isCreating, navigate, form]);

  const onSubmit = (values: z.infer<typeof formSchema>) => {
    if (isCreating) {
      const newGroup: WhitelistGroup = {
        id: `group-${Date.now()}`,
        name: values.name,
        description: values.description || undefined,
        enabled: values.enabled,
        clients: [],
        destinations: [],
      };
      
      setGroup(newGroup);
      toast.success("Group created successfully");
      navigate(`/whitelist/${newGroup.id}`);
      setIsEditing(false);
    } else if (group) {
      const updatedGroup = {
        ...group,
        name: values.name,
        description: values.description || undefined,
        enabled: values.enabled,
      };
      
      setGroup(updatedGroup);
      setIsEditing(false);
      toast.success("Group updated successfully");
    }
  };
  
  const addClient = (values: z.infer<typeof clientSchema>) => {
    if (group) {
      const newClient: ClientIP = {
        id: `client-${Date.now()}`,
        value: values.value,
        description: values.description || undefined,
      };
      
      setGroup({
        ...group,
        clients: [...group.clients, newClient],
      });
      
      setIsAddingClient(false);
      clientForm.reset();
      toast.success("Client added successfully");
    }
  };
  
  const addDestination = (values: z.infer<typeof destinationSchema>) => {
    if (group) {
      const newDestination: Destination = {
        id: `dest-${Date.now()}`,
        value: values.value,
        description: values.description || undefined,
      };
      
      setGroup({
        ...group,
        destinations: [...group.destinations, newDestination],
      });
      
      setIsAddingDestination(false);
      destinationForm.reset();
      toast.success("Destination added successfully");
    }
  };

  const deleteClient = (clientId: string) => {
    if (group) {
      setGroup({
        ...group,
        clients: group.clients.filter(client => client.id !== clientId),
      });
      
      setClientToDelete(null);
      toast.success("Client removed successfully");
    }
  };
  
  const deleteDestination = (destId: string) => {
    if (group) {
      setGroup({
        ...group,
        destinations: group.destinations.filter(dest => dest.id !== destId),
      });
      
      setDestinationToDelete(null);
      toast.success("Destination removed successfully");
    }
  };

  if (isCreating || !group) {
    return (
      <Layout>
        <div className="flex flex-col gap-4">
          <div className="flex items-center mb-4">
            <Button 
              variant="ghost" 
              size="sm" 
              onClick={() => navigate("/whitelist")}
              className="mr-2"
            >
              <ArrowLeft className="h-4 w-4 mr-2" />
              Back
            </Button>
            <h1 className="text-3xl font-bold tracking-tight">Create Whitelist Group</h1>
          </div>

          <Card>
            <CardHeader>
              <CardTitle>Group Details</CardTitle>
              <CardDescription>
                Create a new whitelist group to manage client and destination access.
              </CardDescription>
            </CardHeader>
            <Form {...form}>
              <form onSubmit={form.handleSubmit(onSubmit)}>
                <CardContent className="space-y-4">
                  <FormField
                    control={form.control}
                    name="name"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Group Name</FormLabel>
                        <FormControl>
                          <Input placeholder="Enter group name" {...field} />
                        </FormControl>
                        <FormDescription>
                          A descriptive name for this whitelist group
                        </FormDescription>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                  
                  <FormField
                    control={form.control}
                    name="description"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Description</FormLabel>
                        <FormControl>
                          <Textarea
                            placeholder="Enter group description"
                            rows={3}
                            {...field}
                          />
                        </FormControl>
                        <FormDescription>
                          Optional description of the group's purpose
                        </FormDescription>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                  
                  <FormField
                    control={form.control}
                    name="enabled"
                    render={({ field }) => (
                      <FormItem className="flex flex-row items-center justify-between rounded-lg border p-4">
                        <div className="space-y-0.5">
                          <FormLabel className="text-base">
                            Enable Group
                          </FormLabel>
                          <FormDescription>
                            Toggle to enable or disable this whitelist group
                          </FormDescription>
                        </div>
                        <FormControl>
                          <Switch
                            checked={field.value}
                            onCheckedChange={field.onChange}
                          />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                </CardContent>
                <CardFooter>
                  <Button type="submit">
                    <Save className="mr-2 h-4 w-4" />
                    {isCreating ? "Create Group" : "Save Changes"}
                  </Button>
                </CardFooter>
              </form>
            </Form>
          </Card>
        </div>
      </Layout>
    );
  }

  return (
    <Layout>
      <div className="flex flex-col gap-4">
        <div className="flex items-center mb-4">
          <Button 
            variant="ghost" 
            size="sm" 
            onClick={() => navigate("/whitelist")}
            className="mr-2"
          >
            <ArrowLeft className="h-4 w-4 mr-2" />
            Back
          </Button>
          <h1 className="text-3xl font-bold tracking-tight">{group.name}</h1>
          <Badge 
            variant={group.enabled ? "default" : "outline"} 
            className="ml-4"
          >
            {group.enabled ? "Enabled" : "Disabled"}
          </Badge>
        </div>
        
        {isEditing ? (
          <Card>
            <CardHeader>
              <CardTitle>Edit Group</CardTitle>
              <CardDescription>
                Update whitelist group details
              </CardDescription>
            </CardHeader>
            <Form {...form}>
              <form onSubmit={form.handleSubmit(onSubmit)}>
                <CardContent className="space-y-4">
                  <FormField
                    control={form.control}
                    name="name"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Group Name</FormLabel>
                        <FormControl>
                          <Input placeholder="Enter group name" {...field} />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                  
                  <FormField
                    control={form.control}
                    name="description"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Description</FormLabel>
                        <FormControl>
                          <Textarea
                            placeholder="Enter group description"
                            rows={3}
                            {...field}
                          />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                  
                  <FormField
                    control={form.control}
                    name="enabled"
                    render={({ field }) => (
                      <FormItem className="flex flex-row items-center justify-between rounded-lg border p-4">
                        <div className="space-y-0.5">
                          <FormLabel className="text-base">
                            Enable Group
                          </FormLabel>
                          <FormDescription>
                            Toggle to enable or disable this whitelist group
                          </FormDescription>
                        </div>
                        <FormControl>
                          <Switch
                            checked={field.value}
                            onCheckedChange={field.onChange}
                          />
                        </FormControl>
                      </FormItem>
                    )}
                  />
                </CardContent>
                <CardFooter className="flex justify-between">
                  <Button 
                    type="button" 
                    variant="outline" 
                    onClick={() => {
                      setIsEditing(false);
                      form.reset({
                        name: group.name,
                        description: group.description || "",
                        enabled: group.enabled,
                      });
                    }}
                  >
                    Cancel
                  </Button>
                  <Button type="submit">
                    <Save className="mr-2 h-4 w-4" />
                    Save Changes
                  </Button>
                </CardFooter>
              </form>
            </Form>
          </Card>
        ) : (
          <Card>
            <CardHeader>
              <div className="flex justify-between items-start">
                <div>
                  <CardTitle>{group.name}</CardTitle>
                  <CardDescription>{group.description}</CardDescription>
                </div>
                <Button variant="outline" size="sm" onClick={() => setIsEditing(true)}>
                  <Edit className="mr-2 h-4 w-4" />
                  Edit Group
                </Button>
              </div>
            </CardHeader>
            <CardContent>
              <div className="flex items-center space-x-2">
                <span className="text-sm font-medium">Status:</span>
                <Badge variant={group.enabled ? "default" : "outline"}>
                  {group.enabled ? "Enabled" : "Disabled"}
                </Badge>
              </div>
            </CardContent>
          </Card>
        )}

        <Tabs defaultValue="clients" className="mt-6">
          <TabsList>
            <TabsTrigger value="clients">
              <Laptop className="mr-2 h-4 w-4" />
              Client IPs ({group.clients.length})
            </TabsTrigger>
            <TabsTrigger value="destinations">
              <Globe className="mr-2 h-4 w-4" />
              Destinations ({group.destinations.length})
            </TabsTrigger>
          </TabsList>
          <TabsContent value="clients" className="mt-4">
            <Card>
              <CardHeader>
                <div className="flex justify-between items-center">
                  <CardTitle>Client IP Addresses</CardTitle>
                  <Button onClick={() => setIsAddingClient(true)}>
                    <Plus className="mr-2 h-4 w-4" />
                    Add Client IP
                  </Button>
                </div>
                <CardDescription>
                  IP addresses or subnets allowed access in this group
                </CardDescription>
              </CardHeader>
              <CardContent>
                <div className="rounded-md border">
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>IP Address/Subnet</TableHead>
                        <TableHead>Description</TableHead>
                        <TableHead className="text-right">Actions</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {group.clients.map((client) => (
                        <TableRow key={client.id}>
                          <TableCell className="font-mono">{client.value}</TableCell>
                          <TableCell>{client.description || "-"}</TableCell>
                          <TableCell className="text-right">
                            <Button 
                              variant="ghost" 
                              size="icon" 
                              className="text-destructive"
                              onClick={() => setClientToDelete(client.id)}
                            >
                              <Trash className="h-4 w-4" />
                            </Button>
                          </TableCell>
                        </TableRow>
                      ))}
                      {group.clients.length === 0 && (
                        <TableRow>
                          <TableCell colSpan={3} className="h-24 text-center">
                            No client IPs defined for this group.
                          </TableCell>
                        </TableRow>
                      )}
                    </TableBody>
                  </Table>
                </div>
              </CardContent>
            </Card>
          </TabsContent>
          <TabsContent value="destinations" className="mt-4">
            <Card>
              <CardHeader>
                <div className="flex justify-between items-center">
                  <CardTitle>Destination URLs</CardTitle>
                  <Button onClick={() => setIsAddingDestination(true)}>
                    <Plus className="mr-2 h-4 w-4" />
                    Add Destination
                  </Button>
                </div>
                <CardDescription>
                  URLs or domains that clients in this group are allowed to access
                </CardDescription>
              </CardHeader>
              <CardContent>
                <div className="rounded-md border">
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>URL/Domain</TableHead>
                        <TableHead>Description</TableHead>
                        <TableHead className="text-right">Actions</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {group.destinations.map((dest) => (
                        <TableRow key={dest.id}>
                          <TableCell className="font-mono">{dest.value}</TableCell>
                          <TableCell>{dest.description || "-"}</TableCell>
                          <TableCell className="text-right">
                            <Button 
                              variant="ghost" 
                              size="icon" 
                              className="text-destructive"
                              onClick={() => setDestinationToDelete(dest.id)}
                            >
                              <Trash className="h-4 w-4" />
                            </Button>
                          </TableCell>
                        </TableRow>
                      ))}
                      {group.destinations.length === 0 && (
                        <TableRow>
                          <TableCell colSpan={3} className="h-24 text-center">
                            No destinations defined for this group.
                          </TableCell>
                        </TableRow>
                      )}
                    </TableBody>
                  </Table>
                </div>
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>
      </div>

      {/* Add Client Dialog */}
      <Dialog open={isAddingClient} onOpenChange={setIsAddingClient}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Add Client IP</DialogTitle>
            <DialogDescription>
              Add an IP address or subnet (CIDR notation) to this whitelist group.
            </DialogDescription>
          </DialogHeader>
          <Form {...clientForm}>
            <form onSubmit={clientForm.handleSubmit(addClient)} className="space-y-4">
              <FormField
                control={clientForm.control}
                name="value"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>IP Address/Subnet</FormLabel>
                    <FormControl>
                      <Input 
                        placeholder="e.g., 192.168.1.0/24 or 10.0.0.1" 
                        {...field} 
                      />
                    </FormControl>
                    <FormDescription>
                      Enter a single IP address or subnet in CIDR notation
                    </FormDescription>
                    <FormMessage />
                  </FormItem>
                )}
              />
              
              <FormField
                control={clientForm.control}
                name="description"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Description (Optional)</FormLabel>
                    <FormControl>
                      <Input 
                        placeholder="e.g., Marketing Department" 
                        {...field} 
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              
              <DialogFooter>
                <Button 
                  type="button" 
                  variant="outline" 
                  onClick={() => setIsAddingClient(false)}
                >
                  Cancel
                </Button>
                <Button type="submit">
                  <Check className="mr-2 h-4 w-4" />
                  Add Client
                </Button>
              </DialogFooter>
            </form>
          </Form>
        </DialogContent>
      </Dialog>

      {/* Add Destination Dialog */}
      <Dialog open={isAddingDestination} onOpenChange={setIsAddingDestination}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Add Destination URL</DialogTitle>
            <DialogDescription>
              Add a URL or domain that clients in this group can access.
            </DialogDescription>
          </DialogHeader>
          <Form {...destinationForm}>
            <form onSubmit={destinationForm.handleSubmit(addDestination)} className="space-y-4">
              <FormField
                control={destinationForm.control}
                name="value"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>URL/Domain</FormLabel>
                    <FormControl>
                      <Input 
                        placeholder="e.g., example.com or subdomain.example.com" 
                        {...field} 
                      />
                    </FormControl>
                    <FormDescription>
                      Enter a domain name without protocol (e.g., example.com)
                    </FormDescription>
                    <FormMessage />
                  </FormItem>
                )}
              />
              
              <FormField
                control={destinationForm.control}
                name="description"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Description (Optional)</FormLabel>
                    <FormControl>
                      <Input 
                        placeholder="e.g., Corporate Website" 
                        {...field} 
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              
              <DialogFooter>
                <Button 
                  type="button" 
                  variant="outline" 
                  onClick={() => setIsAddingDestination(false)}
                >
                  Cancel
                </Button>
                <Button type="submit">
                  <Check className="mr-2 h-4 w-4" />
                  Add Destination
                </Button>
              </DialogFooter>
            </form>
          </Form>
        </DialogContent>
      </Dialog>

      {/* Delete Client Confirmation */}
      <AlertDialog 
        open={!!clientToDelete} 
        onOpenChange={() => setClientToDelete(null)}
      >
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete Client IP</AlertDialogTitle>
            <AlertDialogDescription>
              Are you sure you want to remove this client IP from the whitelist group?
              This action cannot be undone.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction 
              className="bg-destructive" 
              onClick={() => clientToDelete && deleteClient(clientToDelete)}
            >
              Delete
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {/* Delete Destination Confirmation */}
      <AlertDialog 
        open={!!destinationToDelete} 
        onOpenChange={() => setDestinationToDelete(null)}
      >
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete Destination</AlertDialogTitle>
            <AlertDialogDescription>
              Are you sure you want to remove this destination URL from the whitelist group?
              This action cannot be undone.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction 
              className="bg-destructive" 
              onClick={() => destinationToDelete && deleteDestination(destinationToDelete)}
            >
              Delete
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </Layout>
  );
}
