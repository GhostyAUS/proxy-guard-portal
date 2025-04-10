
import { useQuery } from '@tanstack/react-query';
import { fetchNginxStatus } from '@/services/apiService';
import { NginxStatus } from '@/types/proxy';

export function useNginxStatus() {
  return useQuery<NginxStatus>({
    queryKey: ['nginxStatus'],
    queryFn: fetchNginxStatus,
    refetchInterval: 30000, // Refetch every 30 seconds
  });
}
