
import { useState, useEffect } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { Check, Save, Terminal } from "lucide-react";
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

import { mockProxySettings, mockNginxStatus } from "@/utils/mockData";
import { testConfigWritable } from "@/utils/nginxUtils";
import { ProxySettings } from "@/types/proxy";

const nginxConfigSchema = z.object({
  nginxConfigPath: z.string().min(1, "Config path is required"),
});

const ldapSettingsSchema = z.object({
  serverUrl: z.string().min(1, "LDAP server URL is required"),
  bindDn: z.string().min(1, "Bind DN is required"),
  searchBase: z.string().min(1, "Search base is required"),
  searchFilter: z.string().min(1, "Search filter is required"),
});

const samlSettingsSchema = z.object({
  entityId: z.string().min(1, "Entity ID is required"),
  assertionConsumerService: z.string().min(1, "Assertion Consumer Service URL is required"),
  idpMetadataUrl: z.string().min(1, "IdP Metadata URL is required"),
});

export default function Settings() {
  const [settings, setSettings] = useState<ProxySettings>(mockProxySettings);
  const [nginxStatus, setNginxStatus] = useState(mockNginxStatus);
  const [configTestInProgress, setConfigTestInProgress] = useState(false);

  useEffect(() => {
    document.title = "Settings | Proxy Guard";
  }, []);

  const nginxConfigForm = useForm<z.infer<typeof nginxConfigSchema>>({
    resolver: zodResolver(nginxConfigSchema),
    defaultValues: {
      nginxConfigPath: settings.nginxConfigPath,
    },
  });

  const ldapForm = useForm<z.infer<typeof ldapSettingsSchema>>({
    resolver: zodResolver(ldapSettingsSchema),
    defaultValues: {
      serverUrl: settings.ldapSettings?.serverUrl || "",
      bindDn: settings.ldapSettings?.bindDn || "",
      searchBase: settings.ldapSettings?.searchBase || "",
      searchFilter: settings.ldapSettings?.searchFilter || "",
    },
  });

  const samlForm = useForm<z.infer<typeof samlSettingsSchema>>({
    resolver: zodResolver(samlSettingsSchema),
    defaultValues: {
      entityId: settings.samlSettings?.entityId || "",
      assertionConsumerService: settings.samlSettings?.assertionConsumerService || "",
      idpMetadataUrl: settings.samlSettings?.idpMetadataUrl || "",
    },
  });

  const onSaveNginxConfig = async (data: z.infer<typeof nginxConfigSchema>) => {
    try {
      setConfigTestInProgress(true);
      
      // Simulate API call to check if the config file is writable
      const isWritable = await testConfigWritable(data.nginxConfigPath);
      
      if (isWritable) {
        setSettings({
          ...settings,
          nginxConfigPath: data.nginxConfigPath,
        });
        
        setNginxStatus({
          ...nginxStatus,
          configWritable: true,
          lastModified: new Date().toISOString(),
        });
        
        toast.success("Nginx configuration path updated");
      } else {
        toast.error("Unable to write to the specified path", {
          description: "Please check file permissions and try again",
        });
      }
    } catch (error) {
      toast.error("Error testing path", {
        description: error instanceof Error ? error.message : "Unknown error occurred",
      });
    } finally {
      setConfigTestInProgress(false);
    }
  };

  const onSaveLdapSettings = (data: z.infer<typeof ldapSettingsSchema>) => {
    setSettings({
      ...settings,
      authType: "ldap",
      ldapSettings: {
        serverUrl: data.serverUrl,
        bindDn: data.bindDn,
        searchBase: data.searchBase,
        searchFilter: data.searchFilter,
      },
    });
    toast.success("LDAP settings updated");
  };

  const onSaveSamlSettings = (data: z.infer<typeof samlSettingsSchema>) => {
    setSettings({
      ...settings,
      authType: "saml",
      samlSettings: {
        entityId: data.entityId,
        assertionConsumerService: data.assertionConsumerService,
        idpMetadataUrl: data.idpMetadataUrl,
      },
    });
    toast.success("SAML settings updated");
  };

  const handleAuthTypeChange = (value: string) => {
    setSettings({
      ...settings,
      authType: value as "none" | "ldap" | "saml",
    });
    toast.success(`Authentication type changed to ${value}`);
  };

  const testNginxConfig = async () => {
    try {
      setConfigTestInProgress(true);
      
      // Simulate API call
      await new Promise(resolve => setTimeout(resolve, 1000));
      
      setNginxStatus({
        ...nginxStatus,
        lastConfigTest: {
          success: true,
          message: "Configuration test successful",
        },
        lastModified: new Date().toISOString(),
      });
      
      toast.success("Nginx configuration test passed");
    } catch (error) {
      toast.error("Configuration test failed", {
        description: error instanceof Error ? error.message : "Unknown error occurred",
      });
    } finally {
      setConfigTestInProgress(false);
    }
  };

  return (
    <Layout>
      <div className="flex flex-col gap-4">
        <h1 className="text-3xl font-bold tracking-tight">Settings</h1>
        
        <div className="grid gap-4">
          <Card>
            <CardHeader>
              <CardTitle>Nginx Configuration</CardTitle>
              <CardDescription>
                Configure the path to your nginx configuration file
              </CardDescription>
            </CardHeader>
            <Form {...nginxConfigForm}>
              <form onSubmit={nginxConfigForm.handleSubmit(onSaveNginxConfig)}>
                <CardContent className="space-y-4">
                  <FormField
                    control={nginxConfigForm.control}
                    name="nginxConfigPath"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Nginx Configuration File Path</FormLabel>
                        <FormControl>
                          <Input placeholder="/etc/nginx/nginx.conf" {...field} />
                        </FormControl>
                        <FormDescription>
                          Path to the nginx configuration file that will be modified
                        </FormDescription>
                        <FormMessage />
                      </FormItem>
                    )}
                  />

                  {nginxStatus.configWritable ? (
                    <Alert className="bg-green-50 border-green-200">
                      <Check className="h-4 w-4 text-green-500" />
                      <AlertTitle>Configuration file is writable</AlertTitle>
                      <AlertDescription>
                        The application has permission to modify the nginx configuration file.
                      </AlertDescription>
                    </Alert>
                  ) : (
                    <Alert className="bg-amber-50 border-amber-200">
                      <Terminal className="h-4 w-4 text-amber-500" />
                      <AlertTitle>Configuration status unknown</AlertTitle>
                      <AlertDescription>
                        Save the path to test if the configuration file is writable.
                      </AlertDescription>
                    </Alert>
                  )}
                </CardContent>
                <CardFooter className="flex justify-between">
                  <Button
                    type="button"
                    variant="outline"
                    onClick={testNginxConfig}
                    disabled={configTestInProgress}
                  >
                    Test Configuration
                  </Button>
                  <Button type="submit" disabled={configTestInProgress}>
                    <Save className="mr-2 h-4 w-4" />
                    Save Path
                  </Button>
                </CardFooter>
              </form>
            </Form>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>Authentication</CardTitle>
              <CardDescription>
                Configure authentication settings for the web interface
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="space-y-2">
                <FormLabel>Authentication Method</FormLabel>
                <Select 
                  value={settings.authType} 
                  onValueChange={handleAuthTypeChange}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Select authentication method" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="none">No Authentication</SelectItem>
                    <SelectItem value="ldap">LDAP</SelectItem>
                    <SelectItem value="saml">SAML</SelectItem>
                  </SelectContent>
                </Select>
                <p className="text-sm text-muted-foreground">
                  Choose the authentication method for the web interface
                </p>
              </div>

              {settings.authType !== "none" && (
                <Tabs defaultValue={settings.authType} className="mt-6">
                  <TabsList>
                    <TabsTrigger value="ldap">LDAP Settings</TabsTrigger>
                    <TabsTrigger value="saml">SAML Settings</TabsTrigger>
                  </TabsList>
                  <TabsContent value="ldap" className="mt-4 space-y-4">
                    <Form {...ldapForm}>
                      <form onSubmit={ldapForm.handleSubmit(onSaveLdapSettings)} className="space-y-4">
                        <FormField
                          control={ldapForm.control}
                          name="serverUrl"
                          render={({ field }) => (
                            <FormItem>
                              <FormLabel>LDAP Server URL</FormLabel>
                              <FormControl>
                                <Input placeholder="ldaps://ldap.example.com:636" {...field} />
                              </FormControl>
                              <FormDescription>
                                URL of the LDAP server (use ldaps:// for secure connections)
                              </FormDescription>
                              <FormMessage />
                            </FormItem>
                          )}
                        />
                        
                        <FormField
                          control={ldapForm.control}
                          name="bindDn"
                          render={({ field }) => (
                            <FormItem>
                              <FormLabel>Bind DN</FormLabel>
                              <FormControl>
                                <Input placeholder="cn=admin,dc=example,dc=com" {...field} />
                              </FormControl>
                              <FormDescription>
                                Distinguished Name used to bind to the LDAP server
                              </FormDescription>
                              <FormMessage />
                            </FormItem>
                          )}
                        />
                        
                        <FormField
                          control={ldapForm.control}
                          name="searchBase"
                          render={({ field }) => (
                            <FormItem>
                              <FormLabel>Search Base</FormLabel>
                              <FormControl>
                                <Input placeholder="ou=users,dc=example,dc=com" {...field} />
                              </FormControl>
                              <FormDescription>
                                Base DN for user search operations
                              </FormDescription>
                              <FormMessage />
                            </FormItem>
                          )}
                        />
                        
                        <FormField
                          control={ldapForm.control}
                          name="searchFilter"
                          render={({ field }) => (
                            <FormItem>
                              <FormLabel>Search Filter</FormLabel>
                              <FormControl>
                                <Input placeholder="(uid={{username}})" {...field} />
                              </FormControl>
                              <FormDescription>
                                Filter to locate the user record (use {{username}} as placeholder)
                              </FormDescription>
                              <FormMessage />
                            </FormItem>
                          )}
                        />
                        
                        <Button type="submit">
                          <Save className="mr-2 h-4 w-4" />
                          Save LDAP Settings
                        </Button>
                      </form>
                    </Form>
                  </TabsContent>
                  <TabsContent value="saml" className="mt-4 space-y-4">
                    <Form {...samlForm}>
                      <form onSubmit={samlForm.handleSubmit(onSaveSamlSettings)} className="space-y-4">
                        <FormField
                          control={samlForm.control}
                          name="entityId"
                          render={({ field }) => (
                            <FormItem>
                              <FormLabel>Entity ID</FormLabel>
                              <FormControl>
                                <Input placeholder="https://proxy-guard.example.com" {...field} />
                              </FormControl>
                              <FormDescription>
                                Unique identifier for this service provider
                              </FormDescription>
                              <FormMessage />
                            </FormItem>
                          )}
                        />
                        
                        <FormField
                          control={samlForm.control}
                          name="assertionConsumerService"
                          render={({ field }) => (
                            <FormItem>
                              <FormLabel>Assertion Consumer Service URL</FormLabel>
                              <FormControl>
                                <Input placeholder="https://proxy-guard.example.com/saml/acs" {...field} />
                              </FormControl>
                              <FormDescription>
                                URL where the IdP will send the SAML response
                              </FormDescription>
                              <FormMessage />
                            </FormItem>
                          )}
                        />
                        
                        <FormField
                          control={samlForm.control}
                          name="idpMetadataUrl"
                          render={({ field }) => (
                            <FormItem>
                              <FormLabel>IdP Metadata URL</FormLabel>
                              <FormControl>
                                <Input placeholder="https://idp.example.com/metadata" {...field} />
                              </FormControl>
                              <FormDescription>
                                URL where the identity provider's SAML metadata can be found
                              </FormDescription>
                              <FormMessage />
                            </FormItem>
                          )}
                        />
                        
                        <Button type="submit">
                          <Save className="mr-2 h-4 w-4" />
                          Save SAML Settings
                        </Button>
                      </form>
                    </Form>
                  </TabsContent>
                </Tabs>
              )}
            </CardContent>
          </Card>
        </div>
      </div>
    </Layout>
  );
}
