import { useQuery, useMutation, useQueryClient, useInfiniteQuery } from '@tanstack/react-query';
import { messagesApi } from '@/api/messages';
import type { MessageListQuery, SendMessageRequest } from '@/types';

/**
 * Hook for fetching messages with infinite scroll (load more history)
 */
export function useInfiniteMessages(conversationId: string) {
  const limit = 50;

  return useInfiniteQuery({
    queryKey: ['messages', conversationId],
    queryFn: ({ pageParam = 0 }) =>
      messagesApi.getAll({
        conversation_id: conversationId,
        offset: pageParam,
        limit,
      }),
    getNextPageParam: (lastPage, allPages) => {
      // Handle both response formats
      const messages = Array.isArray(lastPage) ? lastPage : lastPage?.messages || [];
      const total = Array.isArray(lastPage) ? Infinity : lastPage?.total || 0;

      const loadedCount = allPages.reduce((sum, page) => {
        const pageMessages = Array.isArray(page) ? page : page?.messages || [];
        return sum + pageMessages.length;
      }, 0);

      // If we got less than limit, we've reached the end
      if (messages.length < limit) return undefined;

      // Otherwise, continue if loaded < total
      return loadedCount < total ? loadedCount : undefined;
    },
    initialPageParam: 0,
    enabled: !!conversationId,
    staleTime: 10000, // Consider fresh for 10 seconds
  });
}

/**
 * Hook for fetching messages (simple version)
 */
export function useMessages(params: MessageListQuery) {
  return useQuery({
    queryKey: ['messages', params],
    queryFn: () => messagesApi.getAll(params),
    enabled: !!params.conversation_id,
    staleTime: 10000,
  });
}

/**
 * Hook for sending a message
 */
export function useSendMessage() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (request: SendMessageRequest) => messagesApi.send(request),

    // Optimistic update
    onMutate: async (request) => {
      const queryKey = ['messages', request.conversation_id];

      // Cancel any outgoing refetches
      await queryClient.cancelQueries({ queryKey });

      // Snapshot the previous value
      const previousMessages = queryClient.getQueryData(queryKey);

      // Optimistically add the new message
      const optimisticMessage = {
        id: `temp-${Date.now()}`,
        conversation_id: request.conversation_id,
        from_user: true,
        content: request.content,
        read: false,
        created_at: new Date().toISOString(),
      };

      queryClient.setQueriesData({ queryKey }, (old: any) => {
        if (!old) return old;

        // Handle infinite query
        if (old.pages) {
          return {
            ...old,
            pages: old.pages.map((page: any, index: number) => {
              // Add to the last page (most recent messages at the end)
              if (index === old.pages.length - 1) {
                const messages = Array.isArray(page) ? page : page?.messages || [];
                return Array.isArray(page)
                  ? [...messages, optimisticMessage]
                  : { ...page, messages: [...messages, optimisticMessage] };
              }
              return page;
            }),
          };
        }

        // Handle regular response
        if (Array.isArray(old)) {
          return [...old, optimisticMessage];
        }

        if (old.messages) {
          return { ...old, messages: [...old.messages, optimisticMessage] };
        }

        return old;
      });

      return { previousMessages };
    },

    // On error, roll back
    onError: (_err, request, context) => {
      if (context?.previousMessages) {
        queryClient.setQueryData(['messages', request.conversation_id], context.previousMessages);
      }
    },

    // Always refetch after error or success
    onSettled: (_data, _error, request) => {
      queryClient.invalidateQueries({ queryKey: ['messages', request.conversation_id] });
      queryClient.invalidateQueries({ queryKey: ['conversations'] });
    },
  });
}

/**
 * Hook for marking message as read
 */
export function useMarkMessageAsRead() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (id: string) => messagesApi.markAsRead(id),

    onSuccess: () => {
      // Invalidate messages and conversations
      queryClient.invalidateQueries({ queryKey: ['messages'] });
      queryClient.invalidateQueries({ queryKey: ['conversations'] });
    },
  });
}

/**
 * Hook for editing a message
 */
export function useEditMessage() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({ id, content, editReason }: { id: string; content: string; editReason?: string }) =>
      messagesApi.edit(id, content, editReason),

    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['messages'] });
    },
  });
}

/**
 * Hook for searching messages
 */
export function useSearchMessages(query: string, conversationId?: string) {
  return useQuery({
    queryKey: ['messages', 'search', query, conversationId],
    queryFn: () =>
      messagesApi.search({
        query,
        conversation_id: conversationId,
        limit: 50,
      }),
    enabled: query.length > 0,
    staleTime: 30000,
  });
}
