
import { useState, useEffect } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { Check, Save, Terminal, Shield } from "lucide-react";
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
  useLdaps: z.boolean().optional(),
  ldapPort: z.string().optional(),
});

const samlSettingsSchema = z.object({
  entityId: z.string().min(1, "Entity ID is required"),
  assertionConsumerService: z.string().min(1, "Assertion Consumer Service URL is required"),
  idpMetadataUrl: z.string().min(1, "IdP Metadata URL is required"),
});

const clientAuthSchema = z.object({
  requireAuth: z.boolean(),
  authMethod: z.enum(["none", "ldap", "basic"]),
  realm: z.string().optional(),
  ldapUrl: z.string().optional(),
  ldapBindDn: z.string().optional(),
  ldapSearchBase: z.string().optional(),
  ldapSearchFilter: z.string().optional(),
  ldapPort: z.string().optional(),
  useLdaps: z.boolean().optional(),
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
      useLdaps: settings.ldapSettings?.useLdaps || false,
      ldapPort: settings.ldapSettings?.ldapPort || "389",
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

  const clientAuthForm = useForm<z.infer<typeof clientAuthSchema>>({
    resolver: zodResolver(clientAuthSchema),
    defaultValues: {
      requireAuth: settings.clientAuth?.requireAuth || false,
      authMethod: settings.clientAuth?.authMethod || "none",
      realm: settings.clientAuth?.realm || "Proxy Guard",
      ldapUrl: settings.clientAuth?.ldapUrl || "",
      ldapBindDn: settings.clientAuth?.ldapBindDn || "",
      ldapSearchBase: settings.clientAuth?.ldapSearchBase || "",
      ldapSearchFilter: settings.clientAuth?.ldapSearchFilter || "",
      ldapPort: settings.clientAuth?.ldapPort || "389",
      useLdaps: settings.clientAuth?.useLdaps || false,
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
        useLdaps: data.useLdaps,
        ldapPort: data.ldapPort,
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

  const onSaveClientAuth = (data: z.infer<typeof clientAuthSchema>) => {
    setSettings({
      ...settings,
      clientAuth: {
        requireAuth: data.requireAuth,
        authMethod: data.authMethod,
        realm: data.realm,
        ldapUrl: data.ldapUrl,
        ldapBindDn: data.ldapBindDn,
        ldapSearchBase: data.ldapSearchBase,
        ldapSearchFilter: data.ldapSearchFilter,
        ldapPort: data.ldapPort,
        useLdaps: data.useLdaps,
      },
    });
    toast.success("Client authentication settings updated");
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

  // Watch the client auth method to show/hide fields conditionally
  const clientAuthMethod = clientAuthForm.watch("authMethod");
  const requireClientAuth = clientAuthForm.watch("requireAuth");

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
                                <Input placeholder="ldap.example.com" {...field} />
                              </FormControl>
                              <FormDescription>
                                URL of the LDAP server (without protocol prefix)
                              </FormDescription>
                              <FormMessage />
                            </FormItem>
                          )}
                        />
                        
                        <div className="flex items-center gap-4">
                          <FormField
                            control={ldapForm.control}
                            name="useLdaps"
                            render={({ field }) => (
                              <FormItem className="flex flex-row items-center space-x-3 space-y-0">
                                <FormControl>
                                  <Switch
                                    checked={field.value}
                                    onCheckedChange={field.onChange}
                                  />
                                </FormControl>
                                <div>
                                  <FormLabel>Use LDAPS (Secure LDAP)</FormLabel>
                                  <FormDescription>
                                    Enable to use LDAP over SSL/TLS
                                  </FormDescription>
                                </div>
                              </FormItem>
                            )}
                          />
                          
                          <FormField
                            control={ldapForm.control}
                            name="ldapPort"
                            render={({ field }) => (
                              <FormItem className="w-32">
                                <FormLabel>LDAP Port</FormLabel>
                                <FormControl>
                                  <Input 
                                    placeholder={ldapForm.watch("useLdaps") ? "636" : "389"} 
                                    {...field} 
                                  />
                                </FormControl>
                              </FormItem>
                            )}
                          />
                        </div>
                        
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
                                <Input placeholder="(uid=&#123;&#123;username&#125;&#125;)" {...field} />
                              </FormControl>
                              <FormDescription>
                                Filter to locate the user record (use &#123;&#123;username&#125;&#125; as placeholder)
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

          <Card>
            <CardHeader>
              <CardTitle>Client Authentication</CardTitle>
              <CardDescription>
                Configure authentication requirements for clients connecting to the proxy
              </CardDescription>
            </CardHeader>
            <CardContent>
              <Form {...clientAuthForm}>
                <form onSubmit={clientAuthForm.handleSubmit(onSaveClientAuth)} className="space-y-6">
                  <FormField
                    control={clientAuthForm.control}
                    name="requireAuth"
                    render={({ field }) => (
                      <FormItem className="flex flex-row items-start space-x-3 space-y-0 rounded-md border p-4">
                        <FormControl>
                          <Switch
                            checked={field.value}
                            onCheckedChange={field.onChange}
                          />
                        </FormControl>
                        <div className="space-y-1 leading-none">
                          <FormLabel>
                            Require Authentication for Proxy Access
                          </FormLabel>
                          <FormDescription>
                            When enabled, clients will need to authenticate before using the proxy
                          </FormDescription>
                        </div>
                      </FormItem>
                    )}
                  />

                  {requireClientAuth && (
                    <>
                      <FormField
                        control={clientAuthForm.control}
                        name="authMethod"
                        render={({ field }) => (
                          <FormItem className="space-y-3">
                            <FormLabel>Authentication Method</FormLabel>
                            <FormControl>
                              <RadioGroup
                                onValueChange={field.onChange}
                                defaultValue={field.value}
                                className="flex flex-col space-y-1"
                              >
                                <FormItem className="flex items-center space-x-3 space-y-0">
                                  <FormControl>
                                    <RadioGroupItem value="basic" />
                                  </FormControl>
                                  <FormLabel className="font-normal">
                                    Basic Authentication (username/password)
                                  </FormLabel>
                                </FormItem>
                                <FormItem className="flex items-center space-x-3 space-y-0">
                                  <FormControl>
                                    <RadioGroupItem value="ldap" />
                                  </FormControl>
                                  <FormLabel className="font-normal">
                                    LDAP Authentication
                                  </FormLabel>
                                </FormItem>
                              </RadioGroup>
                            </FormControl>
                            <FormDescription>
                              Choose how clients will authenticate to use the proxy
                            </FormDescription>
                            <FormMessage />
                          </FormItem>
                        )}
                      />

                      <FormField
                        control={clientAuthForm.control}
                        name="realm"
                        render={({ field }) => (
                          <FormItem>
                            <FormLabel>Authentication Realm</FormLabel>
                            <FormControl>
                              <Input 
                                placeholder="Proxy Guard" 
                                {...field} 
                              />
                            </FormControl>
                            <FormDescription>
                              Realm name shown in authentication prompt
                            </FormDescription>
                            <FormMessage />
                          </FormItem>
                        )}
                      />

                      {clientAuthMethod === "ldap" && (
                        <>
                          <FormField
                            control={clientAuthForm.control}
                            name="ldapUrl"
                            render={({ field }) => (
                              <FormItem>
                                <FormLabel>LDAP Server</FormLabel>
                                <FormControl>
                                  <Input 
                                    placeholder="ldap.example.com" 
                                    {...field} 
                                  />
                                </FormControl>
                                <FormDescription>
                                  LDAP server for client authentication (without protocol prefix)
                                </FormDescription>
                                <FormMessage />
                              </FormItem>
                            )}
                          />

                          <div className="flex items-center gap-4">
                            <FormField
                              control={clientAuthForm.control}
                              name="useLdaps"
                              render={({ field }) => (
                                <FormItem className="flex flex-row items-center space-x-3 space-y-0">
                                  <FormControl>
                                    <Switch
                                      checked={field.value}
                                      onCheckedChange={field.onChange}
                                    />
                                  </FormControl>
                                  <div>
                                    <FormLabel>Use LDAPS (Secure LDAP)</FormLabel>
                                    <FormDescription>
                                      Enable to use LDAP over SSL/TLS
                                    </FormDescription>
                                  </div>
                                </FormItem>
                              )}
                            />
                            
                            <FormField
                              control={clientAuthForm.control}
                              name="ldapPort"
                              render={({ field }) => (
                                <FormItem className="w-32">
                                  <FormLabel>LDAP Port</FormLabel>
                                  <FormControl>
                                    <Input 
                                      placeholder={clientAuthForm.watch("useLdaps") ? "636" : "389"} 
                                      {...field} 
                                    />
                                  </FormControl>
                                </FormItem>
                              )}
                            />
                          </div>

                          <FormField
                            control={clientAuthForm.control}
                            name="ldapBindDn"
                            render={({ field }) => (
                              <FormItem>
                                <FormLabel>LDAP Bind DN</FormLabel>
                                <FormControl>
                                  <Input 
                                    placeholder="cn=proxyuser,dc=example,dc=com" 
                                    {...field} 
                                  />
                                </FormControl>
                                <FormDescription>
                                  Service account for LDAP authentication
                                </FormDescription>
                                <FormMessage />
                              </FormItem>
                            )}
                          />

                          <FormField
                            control={clientAuthForm.control}
                            name="ldapSearchBase"
                            render={({ field }) => (
                              <FormItem>
                                <FormLabel>LDAP Search Base</FormLabel>
                                <FormControl>
                                  <Input 
                                    placeholder="ou=users,dc=example,dc=com" 
                                    {...field} 
                                  />
                                </FormControl>
                                <FormDescription>
                                  Base DN for user search operations
                                </FormDescription>
                                <FormMessage />
                              </FormItem>
                            )}
                          />

                          <FormField
                            control={clientAuthForm.control}
                            name="ldapSearchFilter"
                            render={({ field }) => (
                              <FormItem>
                                <FormLabel>LDAP Search Filter</FormLabel>
                                <FormControl>
                                  <Input 
                                    placeholder="(uid=&#123;&#123;username&#125;&#125;)" 
                                    {...field} 
                                  />
                                </FormControl>
                                <FormDescription>
                                  Filter to locate the user record (use &#123;&#123;username&#125;&#125; as placeholder)
                                </FormDescription>
                                <FormMessage />
                              </FormItem>
                            )}
                          />
                        </>
                      )}

                      <Alert className="bg-amber-50 border-amber-200">
                        <Shield className="h-4 w-4 text-amber-500" />
                        <AlertTitle>Important Security Notice</AlertTitle>
                        <AlertDescription>
                          When client authentication is enabled, you should use TLS/SSL for the proxy connection to prevent credential interception.
                        </AlertDescription>
                      </Alert>
                    </>
                  )}

                  <Button type="submit">
                    <Save className="mr-2 h-4 w-4" />
                    Save Client Authentication Settings
                  </Button>
                </form>
              </Form>
            </CardContent>
          </Card>
        </div>
      </div>
    </Layout>
  );
}
