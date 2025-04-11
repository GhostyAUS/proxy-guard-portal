
import React from 'react';
import { BrowserRouter as Router, Routes, Route } from 'react-router-dom';
import { Toaster } from "@/components/ui/sonner";
import { LogsProvider } from './contexts/LogsContext';
import { ProxyProvider } from './contexts/ProxyContext';

// Import pages
import Dashboard from '@/pages/Index';
import HttpProxy from '@/pages/HttpProxy';
import HttpsProxy from '@/pages/HttpsProxy';
import LogsPage from '@/pages/LogsPage';
import WhitelistGroups from '@/pages/WhitelistGroups';
import WhitelistDetail from '@/pages/WhitelistDetail';
import Settings from '@/pages/Settings';
import Documentation from '@/pages/Documentation';
import NotFound from '@/pages/NotFound';

function App() {
  return (
    <ProxyProvider>
      <LogsProvider>
        <Router>
          <Routes>
            <Route path="/" element={<Dashboard />} />
            <Route path="/http-proxy" element={<HttpProxy />} />
            <Route path="/https-proxy" element={<HttpsProxy />} />
            <Route path="/logs" element={<LogsPage />} />
            <Route path="/whitelist" element={<WhitelistGroups />} />
            <Route path="/whitelist/:id" element={<WhitelistDetail />} />
            <Route path="/whitelist/create" element={<WhitelistDetail />} />
            <Route path="/settings" element={<Settings />} />
            <Route path="/documentation" element={<Documentation />} />
            <Route path="*" element={<NotFound />} />
          </Routes>
        </Router>
        <Toaster />
      </LogsProvider>
    </ProxyProvider>
  );
}

export default App;
