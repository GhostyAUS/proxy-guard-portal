
import { useState, useEffect } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { Check, FileText, Save, Terminal, Shield } from "lucide-react";
import { toast } from "sonner";

import { Layout } from "@/components/layout/Layout";
import { Button } from "@/components/ui/button";
import { 
  Form, 
  FormControl, 
  FormDescription, 
  FormField, 
  FormItem, 
  FormLabel, 
  FormMessage 
} from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { 
  Card, 
  CardContent, 
  CardDescription, 
  CardFooter, 
  CardHeader, 
  CardTitle 
} from "@/components/ui/card";
import { 
  Select, 
  SelectContent, 
  SelectItem, 
  SelectTrigger, 
  SelectValue 
} from "@/components/ui/select";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Switch } from "@/components/ui/switch";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { Skeleton } from "@/components/ui/skeleton";

import { testConfigWritable } from "@/utils/nginxUtils";
import { ProxySettings } from "@/types/proxy";
import { useProxySettings } from "@/hooks/useProxySettings";
import { useNginxStatus } from "@/hooks/useNginxStatus";

export default function Settings() {
  const { data: proxySettings, isLoading: isLoadingSettings, refetch: refetchSettings } = useProxySettings();
  const { data: nginxStatus, isLoading: isLoadingStatus, refetch: refetchStatus } = useNginxStatus();
  const [settings, setSettings] = useState<ProxySettings | null>(null);
  const [configTestInProgress, setConfigTestInProgress] = useState(false);

  useEffect(() => {
    document.title = "Settings | Proxy Guard";
  }, []);

  useEffect(() => {
    if (proxySettings && !settings) {
      setSettings(proxySettings);
    }
  }, [proxySettings, settings]);

  // Add a return statement with the JSX content for the Settings component
  return (
    <Layout>
      <div className="space-y-6">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Settings</h1>
          <p className="text-muted-foreground">
            Configure your proxy server settings
          </p>
        </div>
        
        <Tabs defaultValue="general" className="space-y-4">
          <TabsList>
            <TabsTrigger value="general">General</TabsTrigger>
            <TabsTrigger value="http">HTTP Settings</TabsTrigger>
            <TabsTrigger value="https">HTTPS Settings</TabsTrigger>
          </TabsList>
          
          <TabsContent value="general" className="space-y-4">
            <Card>
              <CardHeader>
                <CardTitle>Server Status</CardTitle>
                <CardDescription>View the current status of the NGINX server</CardDescription>
              </CardHeader>
              <CardContent>
                {isLoadingStatus ? (
                  <div className="space-y-2">
                    <Skeleton className="h-4 w-full" />
                    <Skeleton className="h-4 w-3/4" />
                  </div>
                ) : (
                  <div className="space-y-2">
                    <div className="flex items-center gap-2">
                      <div className={`h-3 w-3 rounded-full ${nginxStatus?.isRunning ? 'bg-green-500' : 'bg-red-500'}`}></div>
                      <span>NGINX: {nginxStatus?.isRunning ? 'Running' : 'Stopped'}</span>
                    </div>
                    <div className="text-sm text-muted-foreground">
                      Version: {nginxStatus?.version || 'Unknown'}
                    </div>
                  </div>
                )}
              </CardContent>
            </Card>
            
            {/* More cards and settings would go here */}
          </TabsContent>
          
          <TabsContent value="http" className="space-y-4">
            <Card>
              <CardHeader>
                <CardTitle>HTTP Proxy Settings</CardTitle>
                <CardDescription>Configure HTTP proxy settings</CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                {isLoadingSettings ? (
                  <div className="space-y-2">
                    <Skeleton className="h-4 w-full" />
                    <Skeleton className="h-4 w-3/4" />
                  </div>
                ) : (
                  <div className="grid gap-4">
                    <div className="grid grid-cols-2 gap-4">
                      <div className="space-y-2">
                        <label className="text-sm font-medium">HTTP Port</label>
                        <Input type="number" value={settings?.httpPort || 8080} readOnly />
                      </div>
                      <div className="space-y-2">
                        <label className="text-sm font-medium">Max Upload Size</label>
                        <Input type="text" value={settings?.maxUploadSize || '100M'} readOnly />
                      </div>
                    </div>
                  </div>
                )}
              </CardContent>
            </Card>
          </TabsContent>
          
          <TabsContent value="https" className="space-y-4">
            <Card>
              <CardHeader>
                <CardTitle>HTTPS Proxy Settings</CardTitle>
                <CardDescription>Configure HTTPS proxy settings</CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                {isLoadingSettings ? (
                  <div className="space-y-2">
                    <Skeleton className="h-4 w-full" />
                    <Skeleton className="h-4 w-3/4" />
                  </div>
                ) : (
                  <div className="grid gap-4">
                    <div className="grid grid-cols-2 gap-4">
                      <div className="space-y-2">
                        <label className="text-sm font-medium">HTTPS Port</label>
                        <Input type="number" value={settings?.httpsPort || 8443} readOnly />
                      </div>
                      <div className="space-y-2">
                        <label className="text-sm font-medium">SSL Certificate Path</label>
                        <Input type="text" value={settings?.sslCertPath || '/etc/nginx/ssl/cert.pem'} readOnly />
                      </div>
                    </div>
                  </div>
                )}
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>
      </div>
    </Layout>
  );
}
