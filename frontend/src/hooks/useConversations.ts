import { useQuery, useMutation, useQueryClient, useInfiniteQuery } from '@tanstack/react-query';
import { conversationsApi } from '@/api/conversations';
import type { ConversationListQuery } from '@/types';

/**
 * Hook for fetching conversations with filters and pagination
 */
export function useConversations(params?: ConversationListQuery) {
  return useQuery({
    queryKey: ['conversations', params],
    queryFn: () => conversationsApi.getAll(params),
    staleTime: 30000, // Consider data fresh for 30 seconds
  });
}

/**
 * Hook for infinite scroll conversations list
 */
export function useInfiniteConversations(baseParams?: Omit<ConversationListQuery, 'offset' | 'limit'>) {
  const limit = 20;

  return useInfiniteQuery({
    queryKey: ['conversations', 'infinite', baseParams],
    queryFn: ({ pageParam = 0 }) =>
      conversationsApi.getAll({
        ...baseParams,
        offset: pageParam,
        limit,
      }),
    getNextPageParam: (lastPage, allPages) => {
      // Handle both response formats: array or object with conversations
      const conversations = Array.isArray(lastPage) ? lastPage : lastPage?.conversations || [];
      const total = Array.isArray(lastPage) ? Infinity : lastPage?.total || 0;

      const loadedCount = allPages.reduce((sum, page) => {
        const pageConversations = Array.isArray(page) ? page : page?.conversations || [];
        return sum + pageConversations.length;
      }, 0);

      // If we got less than limit, we've reached the end
      if (conversations.length < limit) return undefined;

      // Otherwise, continue if loaded < total
      return loadedCount < total ? loadedCount : undefined;
    },
    initialPageParam: 0,
    staleTime: 0, // Always consider data stale - rely on WebSocket invalidations
    refetchOnWindowFocus: true, // Refetch when window gains focus
    refetchOnReconnect: true, // Refetch when reconnecting
    refetchInterval: false, // Don't use polling, rely on WebSocket events
  });
}

/**
 * Hook for fetching single conversation
 */
export function useConversation(id: string) {
  return useQuery({
    queryKey: ['conversations', id],
    queryFn: () => conversationsApi.getById(id),
    enabled: !!id,
  });
}

/**
 * Hook for assigning conversation to operator
 */
export function useAssignConversation() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({ id, userId }: { id: string; userId: string }) =>
      conversationsApi.assign(id, userId),

    // Optimistic update
    onMutate: async ({ id, userId }) => {
      // Cancel any outgoing refetches
      await queryClient.cancelQueries({ queryKey: ['conversations'] });

      // Snapshot the previous value
      const previousConversations = queryClient.getQueryData(['conversations']);

      // Optimistically update to the new value
      queryClient.setQueriesData({ queryKey: ['conversations'] }, (old: any) => {
        if (!old) return old;

        if (old.conversations) {
          // Handle paginated response
          return {
            ...old,
            conversations: old.conversations.map((conv: any) =>
              conv.id === id ? { ...conv, user_id: userId } : conv
            ),
          };
        }

        return old;
      });

      // Update single conversation query if it exists
      queryClient.setQueryData(['conversations', id], (old: any) =>
        old ? { ...old, user_id: userId } : old
      );

      return { previousConversations };
    },

    // On error, roll back to the previous value
    onError: (_err, _variables, context) => {
      if (context?.previousConversations) {
        queryClient.setQueryData(['conversations'], context.previousConversations);
      }
    },

    // Always refetch after error or success
    onSettled: () => {
      queryClient.invalidateQueries({ queryKey: ['conversations'] });
    },
  });
}

/**
 * Hook for updating conversation status
 */
export function useUpdateConversationStatus() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({ id, status }: { id: string; status: 'waiting' | 'active' | 'closed' }) =>
      conversationsApi.updateStatus(id, status),

    // Optimistic update
    onMutate: async ({ id, status }) => {
      await queryClient.cancelQueries({ queryKey: ['conversations'] });

      const previousConversations = queryClient.getQueryData(['conversations']);

      queryClient.setQueriesData({ queryKey: ['conversations'] }, (old: any) => {
        if (!old) return old;

        if (old.conversations) {
          return {
            ...old,
            conversations: old.conversations.map((conv: any) =>
              conv.id === id ? { ...conv, status } : conv
            ),
          };
        }

        return old;
      });

      queryClient.setQueryData(['conversations', id], (old: any) =>
        old ? { ...old, status } : old
      );

      return { previousConversations };
    },

    onError: (_err, _variables, context) => {
      if (context?.previousConversations) {
        queryClient.setQueryData(['conversations'], context.previousConversations);
      }
    },

    onSettled: () => {
      queryClient.invalidateQueries({ queryKey: ['conversations'] });
    },
  });
}

/**
 * Hook for closing conversation
 */
export function useCloseConversation() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (id: string) => conversationsApi.close(id),

    onMutate: async (id) => {
      await queryClient.cancelQueries({ queryKey: ['conversations'] });

      const previousConversations = queryClient.getQueryData(['conversations']);

      queryClient.setQueriesData({ queryKey: ['conversations'] }, (old: any) => {
        if (!old) return old;

        if (old.conversations) {
          return {
            ...old,
            conversations: old.conversations.map((conv: any) =>
              conv.id === id ? { ...conv, status: 'closed' } : conv
            ),
          };
        }

        return old;
      });

      queryClient.setQueryData(['conversations', id], (old: any) =>
        old ? { ...old, status: 'closed' } : old
      );

      return { previousConversations };
    },

    onError: (_err, _variables, context) => {
      if (context?.previousConversations) {
        queryClient.setQueryData(['conversations'], context.previousConversations);
      }
    },

    onSettled: () => {
      queryClient.invalidateQueries({ queryKey: ['conversations'] });
    },
  });
}

/**
 * Hook for marking conversation as read
 */
export function useMarkConversationAsRead() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (id: string) => conversationsApi.markAsRead(id),

    onMutate: async (id) => {
      await queryClient.cancelQueries({ queryKey: ['conversations'] });

      const previousConversations = queryClient.getQueryData(['conversations']);

      queryClient.setQueriesData({ queryKey: ['conversations'] }, (old: any) => {
        if (!old) return old;

        if (old.conversations) {
          return {
            ...old,
            conversations: old.conversations.map((conv: any) =>
              conv.id === id ? { ...conv, unread_count: 0 } : conv
            ),
          };
        }

        return old;
      });

      queryClient.setQueryData(['conversations', id], (old: any) =>
        old ? { ...old, unread_count: 0 } : old
      );

      return { previousConversations };
    },

    onError: (_err, _variables, context) => {
      if (context?.previousConversations) {
        queryClient.setQueryData(['conversations'], context.previousConversations);
      }
    },

    onSettled: () => {
      queryClient.invalidateQueries({ queryKey: ['conversations'] });
    },
  });
}

/**
 * Hook for deleting conversation
 */
export function useDeleteConversation() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (id: string) => {
      console.log('[useDeleteConversation] Deleting conversation:', id);
      return conversationsApi.delete(id);
    },

    onSuccess: (data) => {
      console.log('[useDeleteConversation] Delete successful:', data);
      // Invalidate and refetch conversations list
      queryClient.invalidateQueries({ queryKey: ['conversations'] });
    },

    onError: (error) => {
      console.error('[useDeleteConversation] Delete failed:', error);
    },
  });
}
