
import { useEffect } from "react";
import { Layout } from "@/components/layout/Layout";
import { useLogs } from "@/contexts/LogsContext";
import { Button } from "@/components/ui/button";
import { RefreshCcw } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";

export default function LogsPage() {
  const { logs, stats, isLoading, fetchLogs, clearLogs, startRealTimeUpdates, stopRealTimeUpdates, isRealTimeEnabled } = useLogs();
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

        <Card>
          <CardHeader>
            <CardTitle>Log Statistics</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-1 gap-4 md:grid-cols-3">
              <div className="flex flex-col gap-1">
                <span className="text-lg font-medium">{stats.totalRequests}</span>
                <span className="text-sm text-muted-foreground">Total Requests</span>
              </div>
              <div className="flex flex-col gap-1">
                <span className="text-lg font-medium">{stats.allowedRequests}</span>
                <span className="text-sm text-muted-foreground">Allowed</span>
              </div>
              <div className="flex flex-col gap-1">
                <span className="text-lg font-medium">{stats.deniedRequests}</span>
                <span className="text-sm text-muted-foreground">Denied</span>
              </div>
            </div>

            <div className="mt-4 space-y-2">
              <div className="flex justify-between">
                <Button
                  variant="outline"
                  size="sm"
                  onClick={handleToggleRealTime}
                >
                  {isRealTimeEnabled ? "Disable" : "Enable"} Real-time Updates
                </Button>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={handleClearLogs}
                  className="text-destructive border-destructive hover:bg-destructive/10"
                >
                  Clear Logs
                </Button>
              </div>
            </div>
          </CardContent>
        </Card>

        <div className="space-y-4 mt-4">
          <h2 className="text-xl font-semibold">Access Log Entries</h2>
          {isLoading ? (
            <div className="flex justify-center p-8">
              <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
            </div>
          ) : (
            <Card>
              <CardContent className="p-0">
                <div className="rounded-md border">
                  <table className="w-full caption-bottom text-sm">
                    <thead className="[&_tr]:border-b">
                      <tr className="border-b transition-colors hover:bg-muted/50">
                        <th className="h-12 px-4 text-left align-middle font-medium">Time</th>
                        <th className="h-12 px-4 text-left align-middle font-medium">Client IP</th>
                        <th className="h-12 px-4 text-left align-middle font-medium">Destination</th>
                        <th className="h-12 px-4 text-left align-middle font-medium">Method</th>
                        <th className="h-12 px-4 text-left align-middle font-medium">Status</th>
                      </tr>
                    </thead>
                    <tbody className="[&_tr:last-child]:border-0">
                      {logs.length > 0 ? (
                        logs.map((log) => (
                          <tr key={log.id} className="border-b transition-colors hover:bg-muted/50">
                            <td className="p-4 align-middle">
                              {new Date(log.timestamp).toLocaleString()}
                            </td>
                            <td className="p-4 align-middle">{log.clientIp}</td>
                            <td className="p-4 align-middle">{log.destination}</td>
                            <td className="p-4 align-middle">{log.method || "-"}</td>
                            <td className="p-4 align-middle">
                              <span className={`inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-semibold ${
                                log.status === "allowed" 
                                  ? "bg-green-100 text-green-800" 
                                  : "bg-red-100 text-red-800"
                              }`}>
                                {log.status}
                              </span>
                            </td>
                          </tr>
                        ))
                      ) : (
                        <tr>
                          <td colSpan={5} className="h-24 text-center">
                            No logs found
                          </td>
                        </tr>
                      )}
                    </tbody>
                  </table>
                </div>
              </CardContent>
            </Card>
          )}
        </div>
      </div>
    </Layout>
  );
}
