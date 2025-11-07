import { memo, useState } from 'react';
import type { Conversation } from '@/types';
import { useTranslation } from '@/lib/i18n';

interface ConversationItemProps {
  conversation: Conversation;
  isActive?: boolean;
  onClick?: () => void;
  onAssign?: (conversationId: string) => void;
  onClose?: (conversationId: string) => void;
  onDelete?: (conversationId: string) => void;
}

function ConversationItemComponent({
  conversation,
  isActive,
  onClick,
  onAssign,
  onClose,
  onDelete
}: ConversationItemProps) {
  const { t } = useTranslation();
  const [showActions, setShowActions] = useState(false);
  const { telegram_user, last_message_at, unread_count, status, user_id } = conversation;

  // Format last message time
  const formatTime = (dateString?: string) => {
    if (!dateString) return '';

    const date = new Date(dateString);
    const now = new Date();
    const diffInHours = (now.getTime() - date.getTime()) / (1000 * 60 * 60);

    if (diffInHours < 24) {
      // Show time for today
      return date.toLocaleTimeString('ru-RU', { hour: '2-digit', minute: '2-digit' });
    } else if (diffInHours < 48) {
      // Show "yesterday" for yesterday
      return t.common.yesterday;
    } else {
      // Show date for older messages
      return date.toLocaleDateString('ru-RU', { day: '2-digit', month: '2-digit' });
    }
  };

  // Status badge color
  const getStatusColor = () => {
    switch (status) {
      case 'waiting':
        return 'bg-yellow-100 dark:bg-yellow-900/30 text-yellow-800 dark:text-yellow-400';
      case 'active':
        return 'bg-green-100 dark:bg-green-900/30 text-green-800 dark:text-green-400';
      case 'closed':
        return 'bg-gray-100 dark:bg-gray-700 text-gray-800 dark:text-gray-300';
      default:
        return 'bg-gray-100 dark:bg-gray-700 text-gray-800 dark:text-gray-300';
    }
  };

  // Status label
  const getStatusLabel = () => {
    switch (status) {
      case 'waiting':
        return t.conversations_status.waiting;
      case 'active':
        return t.conversations_status.active;
      case 'closed':
        return t.conversations_status.closed;
      default:
        return status;
    }
  };

  // Get user display name
  const displayName = telegram_user.first_name +
    (telegram_user.last_name ? ` ${telegram_user.last_name}` : '');

  // Get initials for avatar
  const getInitials = () => {
    const firstInitial = telegram_user.first_name?.[0] || '';
    const lastInitial = telegram_user.last_name?.[0] || '';
    return (firstInitial + lastInitial).toUpperCase();
  };

  // Get photo URL (use proxy endpoint if photo exists)
  const getPhotoUrl = () => {
    if (telegram_user.photo_url) {
      // Use backend proxy endpoint to avoid CORS issues
      return `${import.meta.env.VITE_API_URL || 'http://localhost:8080/api'}/telegram-photo/${telegram_user.id}`;
    }
    return null;
  };

  const handleActionClick = (e: React.MouseEvent, action: () => void) => {
    e.stopPropagation(); // Prevent conversation selection
    action();
  };

  return (
    <div
      onClick={onClick}
      onMouseEnter={() => setShowActions(true)}
      onMouseLeave={() => setShowActions(false)}
      className={`
        relative flex items-start gap-3 p-4 cursor-pointer transition-colors
        border-b border-gray-100 dark:border-gray-700
        hover:bg-gray-50 dark:hover:bg-gray-700
        ${isActive ? 'bg-blue-50 dark:bg-blue-900/20 border-l-4 border-l-blue-500' : ''}
        md:p-4
        active:bg-gray-100 dark:active:bg-gray-600
      `}
    >
      {/* Avatar */}
      <div className="flex-shrink-0">
        {getPhotoUrl() ? (
          <img
            src={getPhotoUrl()!}
            alt={displayName}
            className="w-12 h-12 md:w-14 md:h-14 rounded-full object-cover"
            onError={(e) => {
              // If image fails to load, hide it and show initials
              e.currentTarget.style.display = 'none';
            }}
          />
        ) : (
          <div
            className={`
              w-12 h-12 rounded-full flex items-center justify-center text-white font-semibold
              ${isActive ? 'bg-blue-500' : 'bg-gray-400'}
              md:w-14 md:h-14
            `}
          >
            {getInitials()}
          </div>
        )}
      </div>

      {/* Content */}
      <div className="flex-1 min-w-0">
        {/* Name and Time */}
        <div className="flex items-start justify-between gap-2 mb-1">
          <div className="flex-1 min-w-0">
            <h3 className="font-semibold text-gray-900 dark:text-white truncate text-sm md:text-base transition-colors">
              {displayName}
            </h3>
            {telegram_user.username && (
              <p className="text-xs text-gray-500 dark:text-gray-400 truncate transition-colors">@{telegram_user.username}</p>
            )}
          </div>
          <span className="text-xs text-gray-500 dark:text-gray-400 flex-shrink-0 transition-colors">
            {formatTime(last_message_at)}
          </span>
        </div>

        {/* Status and Unread Badge */}
        <div className="flex items-center gap-2 mt-2">
          <span
            className={`
              inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium
              ${getStatusColor()}
            `}
          >
            {getStatusLabel()}
          </span>

          {unread_count > 0 && (
            <span className="inline-flex items-center justify-center min-w-[20px] h-5 px-1.5 bg-blue-600 text-white text-xs font-bold rounded-full">
              {unread_count > 99 ? '99+' : unread_count}
            </span>
          )}
        </div>
      </div>

      {/* Action buttons (visible on hover for desktop) */}
      {showActions && (
        <div className="hidden md:flex absolute right-4 top-1/2 -translate-y-1/2 gap-2">
          {/* Show assign button only for unassigned conversations that aren't closed */}
          {status !== 'closed' && !user_id && onAssign && (
            <button
              onClick={(e) => handleActionClick(e, () => onAssign(conversation.id))}
              className="p-2 bg-blue-500 hover:bg-blue-600 text-white rounded-lg shadow-lg transition-colors"
              title={t.conversations_actions.assign_self_title}
            >
              <svg
                xmlns="http://www.w3.org/2000/svg"
                fill="none"
                viewBox="0 0 24 24"
                strokeWidth={2}
                stroke="currentColor"
                className="w-4 h-4"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  d="M15.75 6a3.75 3.75 0 11-7.5 0 3.75 3.75 0 017.5 0zM4.501 20.118a7.5 7.5 0 0114.998 0A17.933 17.933 0 0112 21.75c-2.676 0-5.216-.584-7.499-1.632z"
                />
              </svg>
            </button>
          )}

          {/* Show close button for assigned conversations that aren't closed */}
          {status !== 'closed' && user_id && onClose && (
            <button
              onClick={(e) => handleActionClick(e, () => onClose(conversation.id))}
              className="p-2 bg-red-500 hover:bg-red-600 text-white rounded-lg shadow-lg transition-colors"
              title={t.conversations_actions.close_conversation_title}
            >
              <svg
                xmlns="http://www.w3.org/2000/svg"
                fill="none"
                viewBox="0 0 24 24"
                strokeWidth={2}
                stroke="currentColor"
                className="w-4 h-4"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  d="M6 18L18 6M6 6l12 12"
                />
              </svg>
            </button>
          )}

          {/* Show delete button for closed conversations */}
          {status === 'closed' && onDelete && (
            <button
              onClick={(e) => handleActionClick(e, () => onDelete(conversation.id))}
              className="p-2 bg-red-500 hover:bg-red-600 text-white rounded-lg shadow-lg transition-colors"
              title={t.conversations_actions.delete_conversation_title}
            >
              <svg
                xmlns="http://www.w3.org/2000/svg"
                fill="none"
                viewBox="0 0 24 24"
                strokeWidth={2}
                stroke="currentColor"
                className="w-4 h-4"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  d="M14.74 9l-.346 9m-4.788 0L9.26 9m9.968-3.21c.342.052.682.107 1.022.166m-1.022-.165L18.16 19.673a2.25 2.25 0 01-2.244 2.077H8.084a2.25 2.25 0 01-2.244-2.077L4.772 5.79m14.456 0a48.108 48.108 0 00-3.478-.397m-12 .562c.34-.059.68-.114 1.022-.165m0 0a48.11 48.11 0 013.478-.397m7.5 0v-.916c0-1.18-.91-2.164-2.09-2.201a51.964 51.964 0 00-3.32 0c-1.18.037-2.09 1.022-2.09 2.201v.916m7.5 0a48.667 48.667 0 00-7.5 0"
                />
              </svg>
            </button>
          )}
        </div>
      )}
    </div>
  );
}

// Memoize to prevent unnecessary re-renders
export const ConversationItem = memo(ConversationItemComponent);
