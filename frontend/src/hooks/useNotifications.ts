/**
 * Hook for managing notifications based on WebSocket events and user settings
 */

import { useEffect } from 'react';
import { useQueryClient } from '@tanstack/react-query';
import { useWebSocketEvent } from './useWebSocketEvent';
import { useCurrentUser } from './useCurrentUser';
import notificationService from '@/services/notificationService';
import soundService from '@/services/soundService';

export function useNotifications() {
  const { data: user } = useCurrentUser();
  const queryClient = useQueryClient();

  const notificationsEnabled = user?.settings?.notifications_enabled ?? true;
  const soundEnabled = user?.settings?.notification_sound_enabled ?? true;

  // Listen for message_received events
  useWebSocketEvent('message_received', async (event) => {
    // Invalidate the specific query used by useUnreadCount
    await queryClient.invalidateQueries({
      queryKey: ['conversations', { status: undefined }],
      refetchType: 'active'
    });

    // Don't show notifications if both are disabled
    if (!notificationsEnabled && !soundEnabled) {
      return;
    }

    // Get sender name from the event
    const senderName = event.telegram_user_name || 'User';

    // Get message preview (truncate long messages)
    const messagePreview =
      event.content.length > 50
        ? event.content.substring(0, 50) + '...'
        : event.content;

    // Show browser notification if enabled
    if (notificationsEnabled) {
      try {
        await notificationService.showMessageNotification(
          senderName,
          messagePreview,
          event.conversation_id
        );
      } catch (error) {
        console.error('Failed to show notification:', error);
      }
    }

    // Play notification sound if enabled
    if (soundEnabled) {
      try {
        await soundService.play();
      } catch (error) {
        // Silently ignore sound errors (may be blocked by browser)
        console.debug('Sound playback failed:', error);
      }
    }
  });

  // Request notification permission on mount if notifications are enabled
  useEffect(() => {
    if (notificationsEnabled && notificationService.isSupported()) {
      notificationService.requestPermission();
    }
  }, [notificationsEnabled]);

  return {
    notificationsEnabled,
    soundEnabled,
  };
}