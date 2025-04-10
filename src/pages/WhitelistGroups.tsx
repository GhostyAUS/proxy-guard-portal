
import { useState, useEffect } from "react";
import { Link, useLocation } from "react-router-dom";
import { ArrowUpDown, Edit, Plus, Trash, RefreshCw } from "lucide-react";
import { 
  Table, 
  TableBody, 
  TableCell, 
  TableHead, 
  TableHeader, 
  TableRow 
} from "@/components/ui/table";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
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

export default function WhitelistGroups() {
  const location = useLocation();
  const { groups, isLoading, error, addGroup, updateGroup, deleteGroup: removeGroup, fetchGroups } = useWhitelistGroups();
  const [searchQuery, setSearchQuery] = useState("");
  const [deleteGroupItem, setDeleteGroupItem] = useState<WhitelistGroup | null>(null);
  const [toggleLoading, setToggleLoading] = useState<string | null>(null);

  useEffect(() => {
    document.title = "Whitelist Groups | Proxy Guard";
    
    // Check if we have a new group from state navigation
    if (location.state?.newGroup) {
      const newGroup = location.state.newGroup;
      addGroup(newGroup);
      toast.success("Group created", { description: `${newGroup.name} has been created successfully` });
      
      // Clear the location state
      window.history.replaceState({}, document.title);
    }
    
    // Check if we have updated group info from state navigation
    if (location.state?.updatedGroup) {
      const updatedGroup = location.state.updatedGroup;
      updateGroup(updatedGroup);
      toast.success("Group updated", { description: `${updatedGroup.name} has been updated successfully` });
      
      // Clear the location state
      window.history.replaceState({}, document.title);
    }
  }, [location.state, addGroup, updateGroup]);

  const handleSearch = (e: React.ChangeEvent<HTMLInputElement>) => {
    setSearchQuery(e.target.value);
  };

  const handleToggleGroup = async (groupId: string) => {
    try {
      const group = groups.find(g => g.id === groupId);
      if (group) {
        setToggleLoading(groupId);
        const updatedGroup = { ...group, enabled: !group.enabled };
        await updateGroup(updatedGroup);
        
        toast(
          updatedGroup.enabled ? "Group enabled" : "Group disabled", 
          { description: `${updatedGroup.name} has been ${updatedGroup.enabled ? 'enabled' : 'disabled'}` }
        );
      }
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
  };

  const filteredGroups = groups.filter(group => 
    group.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
    (group.description && group.description.toLowerCase().includes(searchQuery.toLowerCase()))
  );

  return (
    <Layout>
      <div className="flex flex-col gap-4">
        <div className="flex items-center justify-between">
          <h1 className="text-3xl font-bold tracking-tight">Whitelist Groups</h1>
          <div className="flex gap-2">
            <Button variant="outline" onClick={handleRefresh}>
              <RefreshCw className="mr-2 h-4 w-4" /> Refresh
            </Button>
            <Button asChild>
              <Link to="/whitelist/create">
                <Plus className="mr-2 h-4 w-4" /> Create Group
              </Link>
            </Button>
          </div>
        </div>

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
              <div className="rounded-md bg-destructive/10 p-4 text-center">
                <p className="text-destructive">{error}</p>
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
                        <TableCell className="hidden md:table-cell">{group.clients.length}</TableCell>
                        <TableCell className="hidden md:table-cell">{group.destinations.length}</TableCell>
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
                          No whitelist groups found.
                        </TableCell>
                      </TableRow>
                    )}
                  </TableBody>
                </Table>
              </div>
            )}
          </CardContent>
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
