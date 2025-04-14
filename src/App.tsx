
import React from 'react';
import { BrowserRouter as Router } from 'react-router-dom';
import { Toaster } from "@/components/ui/sonner";
import { LogsProvider } from './contexts/LogsContext';
import { ProxyProvider } from './contexts/ProxyContext';

// Import the Dashboard as our main component
import Dashboard from '@/pages/Index';

function App() {
  return (
    <ProxyProvider>
      <LogsProvider>
        <Router>
          <Dashboard />
          <Toaster />
        </Router>
      </LogsProvider>
    </ProxyProvider>
  );
}

export default App;
