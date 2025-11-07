import { useState, useEffect, useCallback, useRef } from 'react';
import { useWebSocketEvent } from './useWebSocketEvent';

interface TypingStatus {
  isTyping: boolean;
  userName?: string;
}

/**
 * Hook for tracking typing status in a conversation
 */
export function useTypingStatus(conversationId: string): TypingStatus {
  const [typingStatus, setTypingStatus] = useState<TypingStatus>({
    isTyping: false,
  });
  const timeoutRef = useRef<NodeJS.Timeout>();

  // Clear typing status after timeout
  const clearTyping = useCallback(() => {
    setTypingStatus({ isTyping: false });
  }, []);

  // Handle user typing event
  useWebSocketEvent('user_typing', (event) => {
    if (event.conversation_id === conversationId) {
      setTypingStatus({
        isTyping: true,
        userName: undefined, // We don't have user name in the event
      });

      // Clear previous timeout
      if (timeoutRef.current) {
        clearTimeout(timeoutRef.current);
      }

      // Set timeout to clear typing status after 3 seconds
      timeoutRef.current = setTimeout(clearTyping, 3000);
    }
  });

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      if (timeoutRef.current) {
        clearTimeout(timeoutRef.current);
      }
    };
  }, []);

  return typingStatus;
}

/**
 * Hook for sending typing status
 */
export function useSendTypingStatus() {
  const lastSentRef = useRef<number>(0);
  const THROTTLE_MS = 2000; // Send typing status max once every 2 seconds

  const sendTyping = useCallback((conversationId: string) => {
    const now = Date.now();
    if (now - lastSentRef.current < THROTTLE_MS) {
      return;
    }

    lastSentRef.current = now;

    // TODO: Send typing event through WebSocket
    // This would require implementing a send method in the WebSocket client
    console.log('Typing in conversation:', conversationId);
  }, []);

  return { sendTyping };
}
