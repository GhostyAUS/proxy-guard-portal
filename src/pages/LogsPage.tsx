
import { useEffect } from "react";
import { Layout } from "@/components/layout/Layout";
import { useLogs } from "@/contexts/LogsContext";
import { Button } from "@/components/ui/button";
import { RefreshCcw } from "lucide-react";
import { useToast } from "@/hooks/use-toast";

// Temporary placeholder components until we implement full dashboard logging
const LogStatsCard = ({ 
  stats, 
  isRealTimeEnabled, 
  onToggleRealTime, 
  onClearLogs, 
  filesAvailable 
}: { 
  stats: any; 
  isRealTimeEnabled: boolean; 
  onToggleRealTime: () => void; 
  onClearLogs: () => void; 
  filesAvailable: boolean; 
}) => {
  return (
    <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
      <div className="rounded-lg border bg-card text-card-foreground shadow-sm p-6">
        <div className="flex flex-row items-center justify-between space-y-0 pb-2">
          <h3 className="tracking-tight text-sm font-medium">Total Requests</h3>
        </div>
        <div className="text-2xl font-bold">{stats?.totalRequests || 0}</div>
      </div>
    </div>
  );
};

const LogTable = ({ logs }: { logs: any[] }) => {
  // This component is not actually used when dashboardLoggingEnabled is false
  return <div>Log entries will be displayed here</div>;
};

export default function LogsPage() {
  const { 
    logs, 
    stats, 
    isLoading, 
    fetchLogs, 
    clearLogs, 
    startRealTimeUpdates, 
    stopRealTimeUpdates, 
    isRealTimeEnabled,
    filesAvailable 
  } = useLogs();
  const { toast } = useToast();
  
  useEffect(() => {
    document.title = "Access Logs | Proxy Guard";
  }, []);

  const handleRefresh = () => {
    fetchLogs();
    toast({
      title: "Logs Refreshed",
      description: "The logs have been refreshed.",
    });
  };

  const handleToggleRealTime = () => {
    if (isRealTimeEnabled) {
      stopRealTimeUpdates();
      toast({
        title: "Real-time Updates Disabled",
        description: "Real-time log updates have been turned off.",
      });
    } else {
      startRealTimeUpdates();
      toast({
        title: "Real-time Updates Enabled",
        description: "Log entries will update automatically.",
      });
    }
  };

  const handleClearLogs = () => {
    clearLogs();
    toast({
      title: "Logs Cleared",
      description: "All logs have been cleared.",
      variant: "destructive",
    });
  };

  // Feature flag for dashboard logging
  const dashboardLoggingEnabled = false; // Set to true when dashboard logging is implemented

  return (
    <Layout>
      <div className="flex flex-col gap-4">
        <div className="flex items-center justify-between">
          <h1 className="text-3xl font-bold tracking-tight">Access Logs</h1>
          <Button onClick={handleRefresh} variant="outline" size="sm" disabled={isLoading}>
            <RefreshCcw className="h-4 w-4 mr-2" />
            Refresh
          </Button>
        </div>

        <LogStatsCard 
          stats={stats}
          isRealTimeEnabled={isRealTimeEnabled}
          onToggleRealTime={handleToggleRealTime}
          onClearLogs={handleClearLogs}
          filesAvailable={filesAvailable}
        />

        {dashboardLoggingEnabled ? (
          <div className="space-y-4 mt-4">
            <h2 className="text-xl font-semibold">Access Log Entries</h2>
            {isLoading ? (
              <div className="flex justify-center p-8">
                <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
              </div>
            ) : (
              <LogTable logs={logs} />
            )}
          </div>
        ) : (
          <div className="bg-muted/50 p-6 rounded-lg mt-4 text-center">
            <h2 className="text-xl font-semibold mb-2">Log Entries Coming Soon</h2>
            <p className="text-muted-foreground">
              Detailed log entries visualization is currently under development. 
              Check back soon for complete dashboard logging capabilities.
            </p>
          </div>
        )}
      </div>
    </Layout>
  );
}
