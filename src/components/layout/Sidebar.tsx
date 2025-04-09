
import { Link, useLocation } from "react-router-dom";
import { cn } from "@/lib/utils";
import { 
  FileText, 
  Globe, 
  Home, 
  ListFilter, 
  Server, 
  Settings, 
  Shield 
} from "lucide-react";

const navigation = [
  {
    name: "Dashboard",
    href: "/",
    icon: Home,
  },
  {
    name: "Whitelist Groups",
    href: "/whitelist",
    icon: ListFilter,
  },
  {
    name: "HTTP Proxy",
    href: "/http-proxy",
    icon: Globe,
  },
  {
    name: "HTTPS Proxy",
    href: "/https-proxy",
    icon: Shield,
  },
  {
    name: "Settings",
    href: "/settings",
    icon: Settings,
  },
  {
    name: "Documentation",
    href: "/documentation",
    icon: FileText,
  },
];

export function Sidebar() {
  const location = useLocation();

  return (
    <aside className="fixed inset-y-0 left-0 z-20 hidden w-64 flex-col border-r bg-sidebar md:flex">
      <div className="flex h-16 items-center gap-2 border-b px-6">
        <div className="flex h-7 w-7 items-center justify-center rounded-md bg-sidebar-primary">
          <Server className="h-4 w-4 text-sidebar-primary-foreground" />
        </div>
        <span className="font-semibold text-lg text-sidebar-foreground">
          Proxy Guard
        </span>
      </div>
      <nav className="flex-1 overflow-auto py-4">
        <ul className="grid gap-1 px-2">
          {navigation.map((item) => (
            <li key={item.name}>
              <Link
                to={item.href}
                className={cn(
                  "flex items-center gap-3 rounded-md px-3 py-2 text-sm font-medium transition-colors",
                  location.pathname === item.href
                    ? "bg-sidebar-accent text-sidebar-accent-foreground"
                    : "text-sidebar-foreground/80 hover:bg-sidebar-accent/50 hover:text-sidebar-accent-foreground"
                )}
              >
                <item.icon className="h-4 w-4" />
                {item.name}
              </Link>
            </li>
          ))}
        </ul>
      </nav>
      <div className="border-t p-4">
        <div className="flex items-center gap-3 rounded-md bg-sidebar-accent/50 px-3 py-2">
          <div className="flex h-8 w-8 items-center justify-center rounded-full bg-sidebar-primary text-sidebar-primary-foreground">
            <span className="text-sm font-medium">PG</span>
          </div>
          <div>
            <p className="text-xs font-medium text-sidebar-foreground">
              Proxy Guard
            </p>
            <p className="text-xs text-sidebar-foreground/60">
              v1.0.0
            </p>
          </div>
        </div>
      </div>
    </aside>
  );
}
