
import { Toaster } from "@/components/ui/toaster";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Routes, Route } from "react-router-dom";
import Index from "./pages/Index";
import NotFound from "./pages/NotFound";
import WhitelistGroups from "./pages/WhitelistGroups";
import WhitelistDetail from "./pages/WhitelistDetail";
import Settings from "./pages/Settings";
import Documentation from "./pages/Documentation";
import HttpProxy from "./pages/HttpProxy";
import HttpsProxy from "./pages/HttpsProxy";
import LogsPage from "./pages/LogsPage";
import { LogsProvider } from "./contexts/LogsContext";
import { WhitelistGroupsProvider } from "./hooks/useWhitelistGroups";

const queryClient = new QueryClient();

const App = () => (
  <QueryClientProvider client={queryClient}>
    <TooltipProvider>
      <LogsProvider>
        <WhitelistGroupsProvider>
          <Toaster />
          <Sonner />
          <BrowserRouter>
            <Routes>
              <Route path="/" element={<Index />} />
              <Route path="/whitelist" element={<WhitelistGroups />} />
              <Route path="/whitelist/:id" element={<WhitelistDetail />} />
              <Route path="/settings" element={<Settings />} />
              <Route path="/documentation" element={<Documentation />} />
              <Route path="/http-proxy" element={<HttpProxy />} />
              <Route path="/https-proxy" element={<HttpsProxy />} />
              <Route path="/logs" element={<LogsPage />} />
              <Route path="/whitelist/create" element={<WhitelistDetail />} />
              {/* ADD ALL CUSTOM ROUTES ABOVE THE CATCH-ALL "*" ROUTE */}
              <Route path="*" element={<NotFound />} />
            </Routes>
          </BrowserRouter>
        </WhitelistGroupsProvider>
      </LogsProvider>
    </TooltipProvider>
  </QueryClientProvider>
);

export default App;
