import { useEffect, useCallback } from 'react';
import { wsClient } from '@/ws/client';
import type { WebSocketEvent } from '@/types';

type EventType = WebSocketEvent['type'];
type EventHandler<T extends EventType> = (
  event: Extract<WebSocketEvent, { type: T }>
) => void;

/**
 * Hook to subscribe to specific WebSocket event types
 *
 * @example
 * useWebSocketEvent('message_received', (event) => {
 *   console.log('New message:', event.content);
 * });
 */
export function useWebSocketEvent<T extends EventType>(
  eventType: T,
  handler: EventHandler<T>
) {
  const memoizedHandler = useCallback(handler, [handler]);

  useEffect(() => {
    const unsubscribe = wsClient.subscribe((event: WebSocketEvent) => {
      if (event.type === eventType) {
        memoizedHandler(event as Extract<WebSocketEvent, { type: T }>);
      }
    });

    return unsubscribe;
  }, [eventType, memoizedHandler]);
}

/**
 * Hook to subscribe to multiple WebSocket event types
 *
 * @example
 * useWebSocketEvents(['message_received', 'message_sent'], (event) => {
 *   console.log('Message event:', event);
 * });
 */
export function useWebSocketEvents(
  eventTypes: EventType[],
  handler: (event: WebSocketEvent) => void
) {
  const memoizedHandler = useCallback(handler, [handler]);

  useEffect(() => {
    const unsubscribe = wsClient.subscribe((event: WebSocketEvent) => {
      if (eventTypes.includes(event.type)) {
        memoizedHandler(event);
      }
    });

    return unsubscribe;
  }, [eventTypes, memoizedHandler]);
}