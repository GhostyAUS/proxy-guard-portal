
import { useQuery } from '@tanstack/react-query';
import { fetchProxySettings } from '@/services/apiService';
import { ProxySettings } from '@/types/proxy';

export function useProxySettings() {
  return useQuery<ProxySettings>({
    queryKey: ['proxySettings'],
    queryFn: fetchProxySettings,
  });
}
