import { useEffect } from 'react';
import type { Conversation } from '@/types';
import {
  useInfiniteMessages,
  useSendMessage,
  useMarkConversationAsRead,
  useTypingStatus,
  useWebSocketEvent,
} from '@/hooks';
import { ChatHeader } from './ChatHeader';
import { MessageList } from './MessageList';
import { MessageInput } from './MessageInput';
import { useTranslation } from '@/lib/i18n';

interface ChatWindowProps {
  conversation: Conversation;
  onBack?: () => void;
  showBackButton?: boolean;
}

export function ChatWindow({ conversation, onBack, showBackButton = false }: ChatWindowProps) {
  const { t } = useTranslation();
  const {
    data,
    fetchNextPage,
    hasNextPage,
    isFetchingNextPage,
  } = useInfiniteMessages(conversation.id);

  const sendMessageMutation = useSendMessage();
  const markConversationAsReadMutation = useMarkConversationAsRead();
  const { isTyping, userName: typingUserName } = useTypingStatus(conversation.id);

  // Flatten all messages from pages
  const allMessages = data?.pages.flatMap((page) => {
    return Array.isArray(page) ? page : page?.messages || [];
  }) ?? [];

  // Mark conversation as read when opened
  useEffect(() => {
    if (conversation.unread_count > 0) {
      markConversationAsReadMutation.mutate(conversation.id);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [conversation.id, conversation.unread_count]);

  // Mark as read when new message arrives while chat is open
  useWebSocketEvent('message_received', (event) => {
    if (event.conversation_id === conversation.id) {
      // Message arrived in currently open conversation - mark as read immediately
      markConversationAsReadMutation.mutate(conversation.id);
    }
  });

  // Handle send message
  const handleSendMessage = (content: string) => {
    sendMessageMutation.mutate({
      conversation_id: conversation.id,
      content,
    });
  };

  // Handle load more (scroll up)
  const handleLoadMore = () => {
    if (hasNextPage && !isFetchingNextPage) {
      fetchNextPage();
    }
  };

  return (
    <div className="flex flex-col h-full bg-white dark:bg-gray-900 transition-colors">
      {/* Header */}
      <ChatHeader
        conversation={conversation}
        onBack={onBack}
        showBackButton={showBackButton}
      />

      {/* Messages */}
      <MessageList
        messages={allMessages}
        isLoading={isFetchingNextPage}
        hasMore={hasNextPage}
        onLoadMore={handleLoadMore}
        isTyping={isTyping}
        typingUserName={typingUserName || conversation.telegram_user.first_name}
        user={conversation.telegram_user}
      />

      {/* Input */}
      <MessageInput
        onSendMessage={handleSendMessage}
        conversationId={conversation.id}
        disabled={conversation.status === 'closed' || sendMessageMutation.isPending}
        placeholder={
          conversation.status === 'closed'
            ? t.chat.closed_conversation
            : t.chat.type_message
        }
      />
    </div>
  );
}
