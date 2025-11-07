import { useEffect, useRef, useState, useCallback } from 'react';
import { useDrag } from '@use-gesture/react';
import { MessageBubble } from './MessageBubble';
import { TypingIndicator } from './TypingIndicator';
import type { Message, TelegramUser } from '@/types';
import { useTranslation } from '@/lib/i18n';

interface MessageListProps {
  messages: Message[];
  isLoading?: boolean;
  hasMore?: boolean;
  onLoadMore?: () => void;
  isTyping?: boolean;
  typingUserName?: string;
  user?: TelegramUser;
}

export function MessageList({
  messages,
  isLoading,
  hasMore,
  onLoadMore,
  isTyping = false,
  typingUserName,
  user,
}: MessageListProps) {
  const { t } = useTranslation();
  const containerRef = useRef<HTMLDivElement>(null);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const [showScrollButton, setShowScrollButton] = useState(false);
  const [pullDistance, setPullDistance] = useState(0);
  const [isPulling, setIsPulling] = useState(false);
  const [isMobile, setIsMobile] = useState(false);
  const prevMessagesLengthRef = useRef(messages.length);

  // Detect mobile device
  useEffect(() => {
    const checkMobile = () => {
      setIsMobile(window.innerWidth < 768);
    };
    checkMobile();
    window.addEventListener('resize', checkMobile);
    return () => window.removeEventListener('resize', checkMobile);
  }, []);

  // Scroll to bottom
  const scrollToBottom = useCallback(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, []);

  // Auto-scroll to bottom when new messages arrive
  useEffect(() => {
    const hasNewMessages = messages.length > prevMessagesLengthRef.current;

    if (hasNewMessages) {
      // Small delay to ensure DOM is updated
      setTimeout(scrollToBottom, 100);
    }

    prevMessagesLengthRef.current = messages.length;
  }, [messages.length, scrollToBottom]);

  // Scroll to bottom on initial load
  useEffect(() => {
    if (messages.length > 0) {
      scrollToBottom();
    }
  }, []);

  // Pull to refresh gesture for loading more history
  const bind = useDrag(
    ({ down, movement: [, my] }) => {
      // Only trigger on mobile and when pulling down
      if (!isMobile || my < 0) {
        setPullDistance(0);
        return;
      }

      // Check if we're at the top of the list
      const container = containerRef.current;
      const isAtTop = container && container.scrollTop === 0;

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
          // Trigger load more
          if (hasMore && onLoadMore) {
            onLoadMore();
          }
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

  // Handle scroll to detect if at bottom and load more
  const handleScroll = (e: React.UIEvent<HTMLDivElement>) => {
    const container = e.currentTarget;
    const { scrollTop, scrollHeight, clientHeight } = container;

    const distanceFromBottom = scrollHeight - (scrollTop + clientHeight);
    const atBottom = distanceFromBottom < 100;

    setShowScrollButton(!atBottom);

    // Load more when scrolling to top
    if (scrollTop < 100 && hasMore && !isLoading && onLoadMore) {
      onLoadMore();
    }
  };

  if (messages.length === 0 && !isLoading) {
    return (
      <div className="flex-1 flex items-center justify-center p-8 bg-gray-50 dark:bg-gray-900 transition-colors">
        <div className="text-center">
          <div className="text-6xl mb-4 text-gray-300 dark:text-gray-600">💬</div>
          <p className="text-gray-600 dark:text-gray-300 transition-colors">{t.chat.no_messages}</p>
          <p className="text-sm text-gray-500 dark:text-gray-400 mt-1 transition-colors">{t.chat.no_messages_hint}</p>
        </div>
      </div>
    );
  }

  return (
    <div
      ref={containerRef}
      onScroll={handleScroll}
      {...(isMobile ? bind() : {})}
      className="flex-1 overflow-y-auto bg-gray-50 dark:bg-gray-900 px-4 relative transition-colors"
      style={{ height: '100%' }}
    >
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

      {/* Loading indicator at top */}
      {isLoading && hasMore && (
        <div className="sticky top-0 left-0 right-0 z-10 flex justify-center p-2">
          <div className="bg-white dark:bg-gray-800 rounded-full px-3 py-1 shadow-sm flex items-center gap-2 transition-colors">
            <div className="w-4 h-4 border-2 border-blue-500 border-t-transparent rounded-full animate-spin" />
            <span className="text-xs text-gray-600 dark:text-gray-300 transition-colors">{t.common.loading}</span>
          </div>
        </div>
      )}

      {/* Messages list */}
      <div className="py-4" style={{ marginTop: isMobile ? pullDistance : 0 }}>
        {messages.map((message, index) => {
          const prevMessage = index > 0 ? messages[index - 1] : null;

          // Show date separator
          const showDateSeparator =
            !prevMessage ||
            new Date(message.created_at).toDateString() !== new Date(prevMessage.created_at).toDateString();

          const messageDate = new Date(message.created_at).toLocaleDateString('ru-RU', {
            day: '2-digit',
            month: 'long',
            year: 'numeric',
          });

          return (
            <div key={message.id}>
              {/* Date separator */}
              {showDateSeparator && (
                <div className="flex items-center justify-center my-4">
                  <span className="px-3 py-1 bg-gray-100 dark:bg-gray-700 text-gray-600 dark:text-gray-300 text-xs rounded-full transition-colors">
                    {messageDate}
                  </span>
                </div>
              )}

              {/* Message bubble */}
              <MessageBubble message={message} showAvatar showSenderName={false} user={user} />
            </div>
          );
        })}

        {/* Typing indicator */}
        {isTyping && <TypingIndicator userName={typingUserName} />}

        {/* Scroll anchor */}
        <div ref={messagesEndRef} />
      </div>

      {/* Scroll to bottom button */}
      {showScrollButton && (
        <button
          onClick={scrollToBottom}
          className="
            sticky bottom-4 left-[calc(100%-4rem)] z-10
            w-12 h-12 bg-blue-600 dark:bg-blue-500 text-white rounded-full shadow-lg
            hover:bg-blue-700 dark:hover:bg-blue-600 transition-all transform hover:scale-110
            flex items-center justify-center
          "
        >
          <svg
            xmlns="http://www.w3.org/2000/svg"
            fill="none"
            viewBox="0 0 24 24"
            strokeWidth={2}
            stroke="currentColor"
            className="w-6 h-6"
          >
            <path strokeLinecap="round" strokeLinejoin="round" d="M19.5 13.5L12 21m0 0l-7.5-7.5M12 21V3" />
          </svg>
        </button>
      )}
    </div>
  );
}
