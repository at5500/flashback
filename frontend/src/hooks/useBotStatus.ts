import { useState, useEffect } from 'react';
import { useQuery } from '@tanstack/react-query';
import { settingsApi } from '@/api';

type BotStatus = 'disconnected' | 'connecting' | 'connected' | 'error';

export function useBotStatus() {
  const [status, setStatus] = useState<BotStatus>('disconnected');

  // Poll for initial status
  const { data } = useQuery({
    queryKey: ['bot-status'],
    queryFn: () => settingsApi.getBotStatus(),
    refetchInterval: 5000, // Poll every 5 seconds
  });

  // Listen for real-time updates via WebSocket
  // TODO: Add bot.status event type to WebSocket events
  // useWebSocketEvent('bot.status', (event: any) => {
  //   if (event.status) {
  //     setStatus(event.status as BotStatus);
  //   }
  // });

  // Update status when API data changes
  useEffect(() => {
    if (data?.status) {
      setStatus(data.status as BotStatus);
    }
  }, [data]);

  return {
    status,
    isConnected: status === 'connected',
    isConnecting: status === 'connecting',
    isDisconnected: status === 'disconnected',
    isError: status === 'error',
  };
}