
import { useState } from "react";
import { cn } from "@/lib/utils";
import {
  FileText,
  Globe,
  Home,
  ListFilter,
  Menu,
  Server,
  Settings,
  Shield,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Sheet, SheetContent, SheetTrigger } from "@/components/ui/sheet";

const navigation = [
  {
    name: "Dashboard",
    href: "#",
    icon: Home,
    active: true,
  },
  {
    name: "Whitelist Groups",
    href: "#",
    icon: ListFilter,
    active: false,
  },
  {
    name: "HTTP Proxy",
    href: "#",
    icon: Globe,
    active: false,
  },
  {
    name: "HTTPS Proxy",
    href: "#",
    icon: Shield,
    active: false,
  },
  {
    name: "Settings",
    href: "#",
    icon: Settings,
    active: false,
  },
  {
    name: "Documentation",
    href: "#",
    icon: FileText,
    active: false,
  },
];

export function MobileNav() {
  const [open, setOpen] = useState(false);
  
  return (
    <Sheet open={open} onOpenChange={setOpen}>
      <SheetTrigger asChild className="md:hidden">
        <Button variant="outline" size="icon" className="ml-2">
          <Menu className="h-5 w-5" />
        </Button>
      </SheetTrigger>
      <SheetContent side="left" className="w-64 p-0">
        <div className="flex h-16 items-center gap-2 border-b px-6">
          <div className="flex h-7 w-7 items-center justify-center rounded-md bg-primary">
            <Server className="h-4 w-4 text-primary-foreground" />
          </div>
          <span className="font-semibold text-lg">Proxy Guard</span>
        </div>
        <nav className="flex-1 overflow-auto py-4">
          <ul className="grid gap-1 px-2">
            {navigation.map((item) => (
              <li key={item.name}>
                <a
                  href={item.href}
                  className={cn(
                    "flex items-center gap-3 rounded-md px-3 py-2 text-sm font-medium transition-colors",
                    item.active
                      ? "bg-accent text-accent-foreground"
                      : "text-foreground/80 hover:bg-accent/50 hover:text-accent-foreground"
                  )}
                  onClick={() => setOpen(false)}
                >
                  <item.icon className="h-4 w-4" />
                  {item.name}
                </a>
              </li>
            ))}
          </ul>
        </nav>
      </SheetContent>
    </Sheet>
  );
}
