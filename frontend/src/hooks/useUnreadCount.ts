import { useQuery } from '@tanstack/react-query';
import { conversationsApi } from '@/api/conversations';

/**
 * Hook to get total unread messages count across all conversations
 */
export function useUnreadCount() {
  const { data } = useQuery({
    queryKey: ['conversations', { status: undefined }],
    queryFn: () => conversationsApi.getAll({}),
    refetchInterval: 30000, // Refetch every 30 seconds
  });

  const unreadCount = data?.conversations?.reduce(
    (total: number, conv) => total + (conv.unread_count || 0),
    0
  ) || 0;

  return { unreadCount };
}
