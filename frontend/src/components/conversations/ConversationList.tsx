import React, { useEffect, useRef, useCallback, useState } from 'react';
import { FixedSizeList } from 'react-window';
import InfiniteLoader from 'react-window-infinite-loader';
import { useDrag } from '@use-gesture/react';
import type { Conversation, ConversationListQuery } from '@/types';
import { ConversationItem } from './ConversationItem';
import { SwipeableConversationItem } from './SwipeableConversationItem';
import { ConversationFilters } from './ConversationFilters';
import { ConfirmDialog } from '../common/ConfirmDialog';
import { useInfiniteConversations, useAssignConversation, useCloseConversation, useDeleteConversation } from '@/hooks';
import { useAuthStore } from '@/store/auth';
import { useTranslation } from '@/lib/i18n';

interface ConversationListProps {
  onConversationSelect?: (conversation: Conversation) => void;
  selectedConversationId?: string;
  users?: Array<{ id: string; name?: string; email: string }>;
  onConversationDelete?: (conversationId: string) => void;
  resetFilters?: number | boolean;
}

export function ConversationList({
  onConversationSelect,
  selectedConversationId,
  users,
  onConversationDelete,
  resetFilters = 0,
}: ConversationListProps) {
  const { t } = useTranslation();
  const listRef = useRef<FixedSizeList>(null);
  const containerRef = useRef<HTMLDivElement>(null);
  const [filters, setFilters] = useState<ConversationListQuery>({});
  const [isPulling, setIsPulling] = useState(false);
  const [pullDistance, setPullDistance] = useState(0);
  const [isMobile, setIsMobile] = useState(false);
  const [deleteConfirmId, setDeleteConfirmId] = useState<string | null>(null);

  const currentUser = useAuthStore((state) => state.user);
  const assignMutation = useAssignConversation();
  const closeMutation = useCloseConversation();
  const deleteMutation = useDeleteConversation();

  const {
    data,
    fetchNextPage,
    hasNextPage,
    isLoading,
    isFetchingNextPage,
    error,
    refetch,
  } = useInfiniteConversations(filters);

  // Reset filters when requested
  useEffect(() => {
    if (resetFilters) {
      setFilters({});
    }
  }, [resetFilters]);

  // Detect mobile device
  useEffect(() => {
    const checkMobile = () => {
      setIsMobile(window.innerWidth < 768);
    };
    checkMobile();
    window.addEventListener('resize', checkMobile);
    return () => window.removeEventListener('resize', checkMobile);
  }, []);

  // Flatten all pages into single array
  // Handle both response formats: array or object with conversations
  const allConversations = data?.pages.flatMap((page) => {
    return Array.isArray(page) ? page : page?.conversations || [];
  }) ?? [];
  const totalCount = data?.pages[0] && !Array.isArray(data.pages[0])
    ? data.pages[0].total
    : allConversations.length;

  // Pull to refresh gesture
  const bind = useDrag(
    ({ down, movement: [, my] }) => {
      // Only trigger on mobile and when pulling down
      if (!isMobile || my < 0) {
        setPullDistance(0);
        return;
      }

      // Check if we're at the top of the list
      const isAtTop = containerRef.current && containerRef.current.scrollTop === 0;

      if (down && isAtTop) {
        // Cap pull distance at 100px
        const distance = Math.min(my, 100);
        setPullDistance(distance);

        if (distance > 60) {
          setIsPulling(true);
        }
      } else {
        // Released
        if (isPulling || pullDistance > 60) {
          // Trigger refresh
          refetch();
          setTimeout(() => {
            setIsPulling(false);
            setPullDistance(0);
          }, 500);
        } else {
          setPullDistance(0);
        }
      }
    },
    { filterTaps: true, axis: 'y' }
  );

  // Handle swipe actions
  const handleAssign = useCallback(
    (conversationId: string) => {
      if (!currentUser) return;
      assignMutation.mutate({
        id: conversationId,
        userId: currentUser.id,
      });
    },
    [currentUser, assignMutation]
  );

  const handleClose = useCallback(
    (conversationId: string) => {
      closeMutation.mutate(conversationId);
    },
    [closeMutation]
  );

  const handleDelete = useCallback(
    (conversationId: string) => {
      setDeleteConfirmId(conversationId);
    },
    []
  );

  const confirmDelete = useCallback(() => {
    if (deleteConfirmId) {
      console.log('[ConversationList] Confirming delete for:', deleteConfirmId);
      const idToDelete = deleteConfirmId;
      deleteMutation.mutate(deleteConfirmId, {
        onSuccess: () => {
          // Notify parent component about deletion
          onConversationDelete?.(idToDelete);
        },
      });
      setDeleteConfirmId(null);
    }
  }, [deleteConfirmId, deleteMutation, onConversationDelete]);

  const cancelDelete = useCallback(() => {
    setDeleteConfirmId(null);
  }, []);

  // Check if item is loaded
  const isItemLoaded = (index: number) => {
    return index < allConversations.length;
  };

  // Load more items
  const loadMoreItems = useCallback(
    async (_startIndex: number, _stopIndex: number) => {
      if (!isFetchingNextPage && hasNextPage) {
        await fetchNextPage();
      }
    },
    [fetchNextPage, hasNextPage, isFetchingNextPage]
  );

  // Item count (add 1 for loading indicator if has more)
  const itemCount = hasNextPage ? allConversations.length + 1 : allConversations.length;

  // Row renderer
  const Row = ({ index, style }: { index: number; style: React.CSSProperties }) => {
    if (!isItemLoaded(index)) {
      return (
        <div style={style} className="flex items-center justify-center p-4">
          <div className="w-6 h-6 border-2 border-blue-500 border-t-transparent rounded-full animate-spin" />
        </div>
      );
    }

    const conversation = allConversations[index];
    const isActive = conversation.id === selectedConversationId;

    // Use SwipeableConversationItem on mobile, regular on desktop
    if (isMobile) {
      return (
        <div style={style}>
          <SwipeableConversationItem
            conversation={conversation}
            isActive={isActive}
            onClick={() => onConversationSelect?.(conversation)}
            onAssign={handleAssign}
            onClose={handleClose}
            onDelete={handleDelete}
          />
        </div>
      );
    }

    return (
      <div style={style}>
        <ConversationItem
          conversation={conversation}
          isActive={isActive}
          onClick={() => onConversationSelect?.(conversation)}
          onAssign={handleAssign}
          onClose={handleClose}
          onDelete={handleDelete}
        />
      </div>
    );
  };

  // Scroll to top when filters change
  useEffect(() => {
    listRef.current?.scrollToItem(0);
  }, [filters]);

  // Handle filters change
  const handleFiltersChange = (newFilters: ConversationListQuery) => {
    setFilters(newFilters);
  };

  // Calculate list height (viewport height - header - filters)
  const getListHeight = () => {
    if (typeof window !== 'undefined') {
      // Mobile: full height minus some offset for header
      if (window.innerWidth < 768) {
        return window.innerHeight - 160;
      }
      // Desktop: fixed height
      return 600;
    }
    return 600;
  };

  if (error) {
    return (
      <div className="flex flex-col h-full">
        <ConversationFilters onFiltersChange={handleFiltersChange} users={users} resetToAll={resetFilters} />
        <div className="flex-1 flex items-center justify-center p-8">
          <div className="text-center">
            <div className="text-red-500 dark:text-red-400 text-5xl mb-4">⚠️</div>
            <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-2 transition-colors">{t.conversations.load_error}</h3>
            <p className="text-gray-600 dark:text-gray-400 transition-colors">{t.conversations.load_error_hint}</p>
          </div>
        </div>
      </div>
    );
  }

  if (isLoading) {
    return (
      <div className="flex flex-col h-full">
        <ConversationFilters onFiltersChange={handleFiltersChange} users={users} resetToAll={resetFilters} />
        <div className="flex-1 flex items-center justify-center">
          <div className="w-8 h-8 border-4 border-blue-500 border-t-transparent rounded-full animate-spin" />
        </div>
      </div>
    );
  }

  if (allConversations.length === 0) {
    return (
      <div className="flex flex-col h-full">
        <ConversationFilters onFiltersChange={handleFiltersChange} users={users} resetToAll={resetFilters} />
        <div className="flex-1 flex items-center justify-center p-8">
          <div className="text-center">
            <div className="text-gray-400 dark:text-gray-600 text-6xl mb-4">💬</div>
            <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-2 transition-colors">{t.conversations.no_conversations}</h3>
            <p className="text-gray-600 dark:text-gray-400 transition-colors">
              {Object.keys(filters).length > 0
                ? t.conversations.no_conversations_filtered
                : t.conversations.no_conversations_hint}
            </p>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="flex flex-col h-full bg-white dark:bg-gray-800 transition-colors">
      <ConversationFilters onFiltersChange={handleFiltersChange} users={users} resetToAll={resetFilters} />

      <div className="flex-1 relative" {...(isMobile ? bind() : {})} ref={containerRef}>
        {/* Pull to refresh indicator */}
        {isMobile && pullDistance > 0 && (
          <div
            className="absolute top-0 left-0 right-0 flex items-center justify-center z-10 transition-opacity"
            style={{
              height: pullDistance,
              opacity: pullDistance / 60,
            }}
          >
            <div className={`transition-transform ${isPulling ? 'animate-spin' : ''}`}>
              {isPulling ? (
                <div className="w-6 h-6 border-2 border-blue-500 border-t-transparent rounded-full" />
              ) : (
                <span className="text-2xl">↓</span>
              )}
            </div>
          </div>
        )}

        <div style={{ marginTop: isMobile ? pullDistance : 0 }}>
          <InfiniteLoader
            isItemLoaded={isItemLoaded}
            itemCount={itemCount}
            loadMoreItems={loadMoreItems}
          >
            {({ onItemsRendered, ref }) => (
              <FixedSizeList
                ref={(list) => {
                  ref(list);
                  // @ts-ignore
                  listRef.current = list;
                }}
                height={getListHeight()}
                itemCount={itemCount}
                itemSize={96}
                width="100%"
                onItemsRendered={onItemsRendered}
                className="scrollbar-thin scrollbar-thumb-gray-300 scrollbar-track-gray-100"
              >
                {Row}
              </FixedSizeList>
            )}
          </InfiniteLoader>
        </div>
      </div>

      {/* Total count footer */}
      <div className="px-4 py-2 bg-gray-50 dark:bg-gray-700 border-t border-gray-200 dark:border-gray-600 text-xs text-gray-500 dark:text-gray-400 text-center transition-colors">
        {t.conversations.total_count}: {totalCount}
      </div>

      {/* Delete confirmation dialog */}
      <ConfirmDialog
        isOpen={deleteConfirmId !== null}
        title={t.conversations_actions.delete_confirm_title}
        message={t.conversations_actions.delete_confirm_message}
        confirmText={t.common.delete}
        cancelText={t.common.cancel}
        onConfirm={confirmDelete}
        onCancel={cancelDelete}
        isDangerous={true}
      />
    </div>
  );
}
