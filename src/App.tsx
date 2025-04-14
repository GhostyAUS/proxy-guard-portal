
import React from 'react';
import { Toaster } from "@/components/ui/sonner";
import { LogsProvider } from './contexts/LogsContext';
import { ProxyProvider } from './contexts/ProxyContext';

// Import the Dashboard as our main component
import Dashboard from '@/pages/Index';

function App() {
  return (
    <ProxyProvider>
      <LogsProvider>
        <Dashboard />
        <Toaster />
      </LogsProvider>
    </ProxyProvider>
  );
}

export default App;
