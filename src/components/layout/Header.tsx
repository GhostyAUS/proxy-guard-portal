
import { AlertCircle, Bell, Settings } from "lucide-react";
import { Link } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { 
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger
} from "@/components/ui/dropdown-menu";

export function Header() {
  return (
    <header className="sticky top-0 z-30 w-full border-b bg-background">
      <div className="flex h-16 items-center px-4 md:px-6">
        <Link 
          to="/" 
          className="flex items-center gap-2 font-semibold text-lg"
        >
          <div className="flex h-7 w-7 items-center justify-center rounded-md bg-primary">
            <div className="h-3 w-3 rounded-sm bg-primary-foreground" />
          </div>
          <span className="hidden md:inline-flex">Proxy Guard</span>
        </Link>
        
        <div className="ml-auto flex items-center gap-2">
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button 
                variant="outline" 
                size="icon" 
                className="relative"
              >
                <Bell className="h-4 w-4" />
                <span className="absolute top-0 right-0 h-2 w-2 rounded-full bg-destructive" />
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end" className="w-80">
              <div className="flex items-center justify-between border-b px-4 py-2">
                <h2 className="text-sm font-semibold">Notifications</h2>
                <Button variant="ghost" size="sm">
                  Mark all as read
                </Button>
              </div>
              <div className="flex items-center gap-4 border-b px-4 py-3">
                <AlertCircle className="h-5 w-5 text-blue-500" />
                <div>
                  <p className="text-sm font-medium">Nginx configuration updated</p>
                  <p className="text-xs text-muted-foreground">
                    Configuration changes were successfully applied
                  </p>
                </div>
              </div>
              <DropdownMenuItem asChild className="justify-center cursor-pointer">
                <Link to="/notifications" className="w-full">View all</Link>
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
          
          <Link to="/settings">
            <Button variant="outline" size="icon">
              <Settings className="h-4 w-4" />
            </Button>
          </Link>
        </div>
      </div>
    </header>
  );
}
