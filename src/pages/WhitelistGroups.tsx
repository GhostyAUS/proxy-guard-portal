
import { useState, useEffect } from "react";
import { Link } from "react-router-dom";
import { ArrowUpDown, Edit, Plus, Trash } from "lucide-react";
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
import { mockWhitelistGroups } from "@/utils/mockData";
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

export default function WhitelistGroups() {
  const [groups, setGroups] = useState<WhitelistGroup[]>(mockWhitelistGroups);
  const [searchQuery, setSearchQuery] = useState("");
  const [deleteGroup, setDeleteGroup] = useState<WhitelistGroup | null>(null);

  useEffect(() => {
    document.title = "Whitelist Groups | Proxy Guard";
  }, []);

  const handleSearch = (e: React.ChangeEvent<HTMLInputElement>) => {
    setSearchQuery(e.target.value);
  };

  const handleToggleGroup = (groupId: string) => {
    setGroups(groups.map(group => 
      group.id === groupId ? { ...group, enabled: !group.enabled } : group
    ));
    
    const group = groups.find(g => g.id === groupId);
    if (group) {
      toast(
        group.enabled ? "Group disabled" : "Group enabled", 
        { description: `${group.name} has been ${group.enabled ? 'disabled' : 'enabled'}` }
      );
    }
  };

  const handleDeleteGroup = (group: WhitelistGroup) => {
    setDeleteGroup(group);
  };

  const confirmDelete = () => {
    if (deleteGroup) {
      setGroups(groups.filter(g => g.id !== deleteGroup.id));
      toast.success(`Group deleted`, { 
        description: `${deleteGroup.name} has been deleted` 
      });
      setDeleteGroup(null);
    }
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
          <Button asChild>
            <Link to="/whitelist/create">
              <Plus className="mr-2 h-4 w-4" /> Create Group
            </Link>
          </Button>
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
                  {filteredGroups.map((group) => (
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
                          />
                          <Badge variant={group.enabled ? "default" : "outline"}>
                            {group.enabled ? "Enabled" : "Disabled"}
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
                  ))}
                  {filteredGroups.length === 0 && (
                    <TableRow>
                      <TableCell colSpan={5} className="h-24 text-center">
                        No whitelist groups found.
                      </TableCell>
                    </TableRow>
                  )}
                </TableBody>
              </Table>
            </div>
          </CardContent>
        </Card>
      </div>

      <AlertDialog open={!!deleteGroup} onOpenChange={() => setDeleteGroup(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Are you sure?</AlertDialogTitle>
            <AlertDialogDescription>
              This action will permanently delete the group "{deleteGroup?.name}". 
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
