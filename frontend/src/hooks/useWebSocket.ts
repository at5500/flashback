import { useEffect } from 'react';
import { useQueryClient } from '@tanstack/react-query';
import { wsClient } from '@/ws/client';
import { useWebSocketStore } from '@/store/websocket';
import { useAuthStore } from '@/store/auth';
import type { WebSocketEvent } from '@/types';

export function useWebSocket() {
  const token = useAuthStore((state) => state.token);
  const setConnected = useWebSocketStore((state) => state.setConnected);
  const addEvent = useWebSocketStore((state) => state.addEvent);
  const queryClient = useQueryClient();

  useEffect(() => {
    console.log('[useWebSocket] Effect running. Token present:', !!token);
    if (!token) {
      console.warn('[useWebSocket] No token available, skipping WebSocket connection');
      return;
    }

    console.log('[useWebSocket] Connecting to WebSocket with token');
    // Connect to WebSocket
    wsClient.connect(token);

    // Subscribe to connection status changes
    const unsubscribeConnection = wsClient.onConnectionChange((connected) => {
      setConnected(connected);
    });

    // Subscribe to WebSocket events
    const unsubscribeEvents = wsClient.subscribe((event: WebSocketEvent) => {
      console.log('[WebSocket Hook] Event received:', event.type);
      addEvent(event);

      // Invalidate React Query caches based on event type
      handleCacheInvalidation(event, queryClient);
    });

    return () => {
      unsubscribeConnection();
      unsubscribeEvents();
      wsClient.disconnect();
    };
  }, [token, setConnected, addEvent, queryClient]);
}

// Handle cache invalidation based on WebSocket events
// Simplified approach: just invalidate queries and let React Query refetch
function handleCacheInvalidation(event: WebSocketEvent, queryClient: any) {
  console.log('[WebSocket] Handling event:', event.type);

  switch (event.type) {
    case 'message_received':
    case 'message_sent':
      // Invalidate messages for this conversation
      queryClient.invalidateQueries({
        queryKey: ['messages', event.conversation_id],
      });

      // Invalidate conversations list (to update last_message_at and unread_count)
      queryClient.invalidateQueries({
        queryKey: ['conversations', 'infinite'],
      });
      break;

    case 'conversation_created':
    case 'conversation_status_changed':
    case 'conversation_assigned':
    case 'conversation_closed':
      // Just invalidate conversations list
      queryClient.invalidateQueries({
        queryKey: ['conversations', 'infinite'],
      });
      break;

    case 'message_read':
      // Invalidate both messages and conversations
      queryClient.invalidateQueries({
        queryKey: ['messages', event.conversation_id],
      });
      queryClient.invalidateQueries({
        queryKey: ['conversations', 'infinite'],
      });
      break;

    case 'user_online':
    case 'user_offline':
      queryClient.invalidateQueries({ queryKey: ['users'] });
      break;

    default:
      console.log('[WebSocket] Unhandled event type:', event.type);
  }
}