import { useState, useEffect, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { useConversations } from '@/hooks';
import { formatDistanceToNow } from 'date-fns';
import { ru, enUS } from 'date-fns/locale';
import { useTranslation } from '@/lib/i18n';

interface NotificationsDropdownProps {
  unreadCount: number;
}

export function NotificationsDropdown({ unreadCount }: NotificationsDropdownProps) {
  const { t, language } = useTranslation();
  const [isOpen, setIsOpen] = useState(false);
  const dropdownRef = useRef<HTMLDivElement>(null);
  const navigate = useNavigate();

  // Fetch conversations with unread messages
  const { data: conversationsData } = useConversations({});

  // Filter conversations with unread messages and take top 5
  const unreadConversations = conversationsData?.conversations
    ?.filter((conv) => conv.unread_count > 0)
    .slice(0, 5) || [];

  // Close dropdown when clicking outside
  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
        setIsOpen(false);
      }
    }

    if (isOpen) {
      document.addEventListener('mousedown', handleClickOutside);
      return () => document.removeEventListener('mousedown', handleClickOutside);
    }
  }, [isOpen]);

  const handleConversationClick = (e: React.MouseEvent, conversationId: string) => {
    e.stopPropagation();
    setIsOpen(false);
    navigate('/', { state: { selectedConversationId: conversationId, resetFilters: Date.now() } });
  };

  const handleViewAll = () => {
    setIsOpen(false);
    // Use timestamp to force re-render on each click
    navigate('/', { state: { resetFilters: Date.now() } });
  };

  return (
    <div className="relative" ref={dropdownRef}>
      {/* Bell Button */}
      <button
        onClick={() => setIsOpen(!isOpen)}
        className="relative p-2 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-700 transition-colors"
      >
        <svg
          className="w-6 h-6 text-gray-600 dark:text-gray-300"
          fill="none"
          stroke="currentColor"
          viewBox="0 0 24 24"
        >
          <path
            strokeLinecap="round"
            strokeLinejoin="round"
            strokeWidth={2}
            d="M15 17h5l-1.405-1.405A2.032 2.032 0 0118 14.158V11a6.002 6.002 0 00-4-5.659V5a2 2 0 10-4 0v.341C7.67 6.165 6 8.388 6 11v3.159c0 .538-.214 1.055-.595 1.436L4 17h5m6 0v1a3 3 0 11-6 0v-1m6 0H9"
          />
        </svg>
        {unreadCount > 0 && (
          <span className="absolute -top-1 -right-1 bg-red-500 text-white text-xs font-bold rounded-full w-5 h-5 flex items-center justify-center">
            {unreadCount > 99 ? '99+' : unreadCount}
          </span>
        )}
      </button>

      {/* Dropdown */}
      {isOpen && (
        <div className="absolute right-0 mt-2 w-96 bg-white dark:bg-gray-800 rounded-lg shadow-lg border border-gray-200 dark:border-gray-700 z-50">
          {/* Header */}
          <div className="px-4 py-3 border-b border-gray-200 dark:border-gray-700">
            <h3 className="text-sm font-semibold text-gray-900 dark:text-white">
              {t.notifications.title}
              {unreadCount > 0 && (
                <span className="ml-2 text-xs text-gray-500 dark:text-gray-400">
                  ({unreadCount} {t.notifications.unread_count})
                </span>
              )}
            </h3>
          </div>

          {/* Conversations List */}
          <div className="max-h-96 overflow-y-auto">
            {unreadConversations.length === 0 ? (
              <div className="px-4 py-8 text-center text-sm text-gray-500 dark:text-gray-400">
                {t.notifications.no_unread}
              </div>
            ) : (
              unreadConversations.map((conv) => (
                <button
                  key={conv.id}
                  onClick={(e) => handleConversationClick(e, conv.id)}
                  className="w-full px-4 py-3 hover:bg-gray-50 dark:hover:bg-gray-700 transition-colors border-b border-gray-100 dark:border-gray-700 last:border-b-0 text-left"
                >
                  <div className="flex items-start gap-3">
                    {/* Avatar */}
                    <div className="flex-shrink-0 w-10 h-10 rounded-full bg-blue-500 dark:bg-blue-600 flex items-center justify-center text-white font-semibold">
                      {conv.telegram_user.first_name[0].toUpperCase()}
                    </div>

                    {/* Content */}
                    <div className="flex-1 min-w-0">
                      <div className="flex items-baseline justify-between gap-2">
                        <p className="text-sm font-medium text-gray-900 dark:text-white truncate">
                          {conv.telegram_user.first_name}{' '}
                          {conv.telegram_user.last_name}
                        </p>
                        {conv.last_message_at && (
                          <span className="text-xs text-gray-500 dark:text-gray-400 flex-shrink-0">
                            {formatDistanceToNow(new Date(conv.last_message_at), {
                              addSuffix: true,
                              locale: language === 'ru' ? ru : enUS,
                            })}
                          </span>
                        )}
                      </div>
                      {conv.telegram_user.username && (
                        <p className="text-xs text-gray-500 dark:text-gray-400">
                          @{conv.telegram_user.username}
                        </p>
                      )}
                      {/* Unread Badge */}
                      <div className="mt-1 flex items-center gap-2">
                        <span className="inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium bg-red-100 text-red-800 dark:bg-red-900 dark:text-red-200">
                          {conv.unread_count}{' '}
                          {conv.unread_count === 1
                            ? t.notifications.new_message_one
                            : conv.unread_count < 5
                            ? t.notifications.new_message_few
                            : t.notifications.new_message_many}
                        </span>
                      </div>
                    </div>
                  </div>
                </button>
              ))
            )}
          </div>

          {/* Footer */}
          <div className="px-4 py-3 border-t border-gray-200 dark:border-gray-700">
            <button
              onClick={handleViewAll}
              className="w-full text-sm text-blue-600 dark:text-blue-400 hover:text-blue-700 dark:hover:text-blue-300 font-medium"
            >
              {t.notifications.view_all} →
            </button>
          </div>
        </div>
      )}
    </div>
  );
}