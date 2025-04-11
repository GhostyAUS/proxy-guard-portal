
import { useEffect } from "react";
import { Layout } from "@/components/layout/Layout";
import { useLogs } from "@/contexts/LogsContext";
import { LogStatsCard } from "@/components/logs/LogStats";
import { LogTable } from "@/components/logs/LogTable";
import { Button } from "@/components/ui/button";
import { RefreshCcw } from "lucide-react";
import { useToast } from "@/hooks/use-toast";

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
      </div>
    </Layout>
  );
}
