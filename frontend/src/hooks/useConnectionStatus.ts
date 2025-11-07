import { useEffect, useState } from 'react';
import { wsClient } from '@/ws/client';
import { useWebSocketStore } from '@/store/websocket';

export function useConnectionStatus() {
  const isConnected = useWebSocketStore((state) => state.isConnected);
  const [reconnecting, setReconnecting] = useState(false);

  useEffect(() => {
    let reconnectTimer: NodeJS.Timeout;

    const handleConnection = (connected: boolean) => {
      if (!connected && isConnected) {
        // Just disconnected, show reconnecting state
        setReconnecting(true);
        reconnectTimer = setTimeout(() => {
          setReconnecting(false);
        }, 10000); // Stop showing "reconnecting" after 10 seconds
      } else if (connected) {
        // Successfully connected/reconnected
        setReconnecting(false);
      }
    };

    const unsubscribe = wsClient.onConnectionChange(handleConnection);

    return () => {
      unsubscribe();
      if (reconnectTimer) clearTimeout(reconnectTimer);
    };
  }, [isConnected]);

  return {
    isConnected,
    reconnecting,
    status: isConnected ? 'connected' : reconnecting ? 'reconnecting' : 'disconnected',
  };
}