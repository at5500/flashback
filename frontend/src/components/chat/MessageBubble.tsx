import { memo } from 'react';
import type { Message, TelegramUser } from '@/types';
import { useTranslation } from '@/lib/i18n';

interface MessageBubbleProps {
  message: Message;
  showAvatar?: boolean;
  showSenderName?: boolean;
  user?: TelegramUser;
}

function MessageBubbleComponent({ message, showAvatar = true, showSenderName = false, user }: MessageBubbleProps) {
  const { t } = useTranslation();
  const { from_user, content, created_at, read } = message;

  // Format time
  const formatTime = (dateString: string) => {
    const date = new Date(dateString);
    return date.toLocaleTimeString('ru-RU', { hour: '2-digit', minute: '2-digit' });
  };

  // Get initials
  const getInitials = () => {
    if (from_user) {
      return 'OP';
    }
    if (user) {
      const first = user.first_name?.[0] || '';
      const last = user.last_name?.[0] || '';
      return (first + last).toUpperCase() || 'U';
    }
    return 'U';
  };

  // Get photo URL (use proxy endpoint if photo exists)
  const getPhotoUrl = () => {
    if (user?.photo_url) {
      return `/api/telegram-photo/${user.id}`;
    }
    return null;
  };

  // Render avatar with image or fallback to initials
  const renderAvatar = () => {
    const initials = getInitials();
    const bgColor = from_user ? 'bg-blue-600 dark:bg-blue-500' : 'bg-gray-400 dark:bg-gray-600';
    const photoUrl = getPhotoUrl();

    // Show image for user if available
    if (photoUrl && !from_user) {
      return (
        <div className="flex-shrink-0 w-8 h-8 rounded-full overflow-hidden bg-gray-200 dark:bg-gray-700">
          <img
            src={photoUrl}
            alt={user?.first_name || 'User'}
            className="w-full h-full object-cover"
            onError={(e) => {
              // Fallback to initials if image fails to load
              const target = e.currentTarget;
              target.style.display = 'none';
              const parent = target.parentElement;
              if (parent) {
                parent.innerHTML = `<div class="w-full h-full ${bgColor} flex items-center justify-center text-white text-xs font-semibold">${initials}</div>`;
              }
            }}
          />
        </div>
      );
    }

    // Default initials display
    return (
      <div className={`flex-shrink-0 w-8 h-8 rounded-full ${bgColor} flex items-center justify-center text-white text-xs font-semibold`}>
        {initials}
      </div>
    );
  };

  return (
    <div className={`flex items-end gap-2 mb-3 ${from_user ? 'justify-end' : 'justify-start'}`}>
      {/* Avatar - left side for user messages */}
      {!from_user && showAvatar && renderAvatar()}

      {/* Message content */}
      <div
        className={`
          flex flex-col max-w-[75%] sm:max-w-[60%]
          ${from_user ? 'items-end' : 'items-start'}
        `}
      >
        {/* Sender name (optional) */}
        {showSenderName && from_user && (
          <span className="text-xs text-gray-500 dark:text-gray-400 mb-1 px-2 transition-colors">{t.chat.operator}</span>
        )}

        {/* Message bubble */}
        <div
          className={`
            rounded-2xl px-4 py-2 break-words
            ${
              from_user
                ? 'bg-blue-600 dark:bg-blue-500 text-white rounded-br-none'
                : 'bg-gray-100 dark:bg-gray-700 text-gray-900 dark:text-gray-100 rounded-bl-none'
            }
          `}
        >
          <p className="text-sm whitespace-pre-wrap">{content}</p>
        </div>

        {/* Time and read status */}
        <div className="flex items-center gap-1 mt-1 px-2">
          <span className="text-xs text-gray-500 dark:text-gray-400 transition-colors">{formatTime(created_at)}</span>

          {from_user && (
            <span className="text-xs">
              {read ? (
                <span className="text-blue-500 dark:text-blue-400">✓✓</span>
              ) : (
                <span className="text-gray-400 dark:text-gray-500">✓</span>
              )}
            </span>
          )}
        </div>
      </div>

      {/* Avatar - right side for operator messages */}
      {from_user && showAvatar && renderAvatar()}
    </div>
  );
}

export const MessageBubble = memo(MessageBubbleComponent);
