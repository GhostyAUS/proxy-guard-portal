
/**
 * Utility functions for environment detection and configuration
 */

/**
 * Determines if the application is running in a single container environment
 */
export const isSingleContainerMode = (): boolean => {
  // Check if we're in a browser
  if (typeof window === 'undefined') {
    return false;
  }
  
  // Check for environment variable
  const isSingle = import.meta.env.VITE_SINGLE_CONTAINER === 'true';
  
  // Check for direct file system access (inferred from API responses)
  const hasDirectAccess = localStorage.getItem('direct_file_access') === 'true';
  
  return isSingle || hasDirectAccess;
};

/**
 * Gets the base configuration path for Nginx
 */
export const getNginxConfigPath = (): string => {
  return import.meta.env.VITE_NGINX_CONFIG_PATH || '/etc/nginx/nginx.conf';
};

/**
 * Detects if the current user has write access to Nginx configuration
 */
export const detectFileAccess = async (): Promise<boolean> => {
  try {
    // Check if we have direct file system access via API
    const response = await fetch('/api/debug/paths');
    const data = await response.json();
    
    // Store the result for future reference
    const hasAccess = data.configWritable === true;
    localStorage.setItem('direct_file_access', hasAccess ? 'true' : 'false');
    
    return hasAccess;
  } catch (error) {
    console.error('Error detecting file access:', error);
    return false;
  }
};

/**
 * Gets the runtime environment information
 */
export const getRuntimeInfo = async (): Promise<Record<string, any>> => {
  try {
    const response = await fetch('/api/health');
    return await response.json();
  } catch (error) {
    console.error('Error getting runtime info:', error);
    return {
      status: 'error',
      error: String(error)
    };
  }
};
