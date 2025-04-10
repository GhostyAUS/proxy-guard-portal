
import { useState, useEffect, useCallback } from 'react';
import { NginxStatus } from '@/types/proxy';
import axios from 'axios';

const API_BASE_URL = import.meta.env.VITE_API_BASE_URL || "/api";

export function useNginxStatus() {
  const [status, setStatus] = useState<NginxStatus | null>(null);
  const [loading, setLoading] = useState<boolean>(true);
  const [error, setError] = useState<Error | null>(null);

  const fetchStatus = useCallback(async () => {
    setLoading(true);
    setError(null);
    
    try {
      const response = await axios.get(`${API_BASE_URL}/nginx/status`);
      setStatus(response.data);
    } catch (err) {
      setError(err instanceof Error ? err : new Error('Failed to fetch NGINX status'));
      console.error('Error fetching NGINX status:', err);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchStatus();
    
    // Refresh status every 30 seconds
    const interval = setInterval(fetchStatus, 30000);
    return () => clearInterval(interval);
  }, [fetchStatus]);

  const restartNginx = useCallback(async () => {
    setLoading(true);
    
    try {
      await axios.post(`${API_BASE_URL}/nginx/restart`);
      await fetchStatus(); // Refresh status after restart
      return true;
    } catch (err) {
      setError(err instanceof Error ? err : new Error('Failed to restart NGINX'));
      console.error('Error restarting NGINX:', err);
      return false;
    } finally {
      setLoading(false);
    }
  }, [fetchStatus]);

  // Create a return object format that matches what the components expect
  return {
    data: status,
    isLoading: loading,
    error,
    fetchStatus,
    restartNginx,
    refetch: fetchStatus
  };
}
