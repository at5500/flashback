import { useState } from 'react';
import type { Conversation } from '@/types';
import { useAssignConversation, useCloseConversation } from '@/hooks';
import { useAuthStore } from '@/store/auth';
import { useTranslation } from '@/lib/i18n';

interface ChatHeaderProps {
  conversation: Conversation;
  onBack?: () => void;
  showBackButton?: boolean;
}

export function ChatHeader({ conversation, onBack, showBackButton = false }: ChatHeaderProps) {
  const { t } = useTranslation();
  const [showActions, setShowActions] = useState(false);
  const [imageError, setImageError] = useState(false);
  const currentUser = useAuthStore((state) => state.user);
  const assignMutation = useAssignConversation();
  const closeMutation = useCloseConversation();

  const { telegram_user, status, user_id } = conversation;

  const displayName =
    telegram_user.first_name + (telegram_user.last_name ? ` ${telegram_user.last_name}` : '');

  const getInitials = () => {
    const firstInitial = telegram_user.first_name?.[0] || '';
    const lastInitial = telegram_user.last_name?.[0] || '';
    return (firstInitial + lastInitial).toUpperCase();
  };

  // Get photo URL (use proxy endpoint if photo exists)
  const getPhotoUrl = () => {
    if (telegram_user.photo_url) {
      return `${import.meta.env.VITE_API_URL || 'http://localhost:8080/api'}/telegram-photo/${telegram_user.id}`;
    }
    return null;
  };

  const handleAssignToMe = () => {
    if (!currentUser) return;
    assignMutation.mutate({
      id: conversation.id,
      userId: currentUser.id,
    });
    setShowActions(false);
  };

  const handleClose = () => {
    closeMutation.mutate(conversation.id);
    setShowActions(false);
  };

  const isAssignedToMe = user_id === currentUser?.id;

  return (
    <div className="bg-white dark:bg-gray-800 border-b border-gray-200 dark:border-gray-700 px-4 py-3 flex items-center gap-3 relative transition-colors">
      {/* Back button (mobile) */}
      {showBackButton && onBack && (
        <button
          onClick={onBack}
          className="lg:hidden flex-shrink-0 p-1 text-blue-600 dark:text-blue-400 hover:text-blue-700 dark:hover:text-blue-300 font-medium"
        >
          ← {t.common.back}
        </button>
      )}

      {/* Avatar */}
      <div className="flex-shrink-0">
        {getPhotoUrl() && !imageError ? (
          <img
            src={getPhotoUrl()!}
            alt={displayName}
            className="w-10 h-10 rounded-full object-cover"
            onError={() => setImageError(true)}
          />
        ) : (
          <div className="w-10 h-10 rounded-full bg-gray-400 dark:bg-gray-600 flex items-center justify-center text-white font-semibold">
            {getInitials()}
          </div>
        )}
      </div>

      {/* User info */}
      <div className="flex-1 min-w-0">
        <h2 className="font-semibold text-gray-900 dark:text-white truncate transition-colors">{displayName}</h2>
        {telegram_user.username && (
          <p className="text-xs text-gray-500 dark:text-gray-400 truncate transition-colors">@{telegram_user.username}</p>
        )}
      </div>

      {/* Status badge */}
      <div className="flex-shrink-0">
        <span
          className={`
            inline-flex items-center px-2 py-1 rounded-full text-xs font-medium
            ${status === 'waiting' && 'bg-yellow-100 dark:bg-yellow-900/30 text-yellow-800 dark:text-yellow-400'}
            ${status === 'active' && 'bg-green-100 dark:bg-green-900/30 text-green-800 dark:text-green-400'}
            ${status === 'closed' && 'bg-gray-100 dark:bg-gray-700 text-gray-800 dark:text-gray-300'}
          `}
        >
          {status === 'waiting' && t.conversations_status.waiting}
          {status === 'active' && t.conversations_status.active}
          {status === 'closed' && t.conversations_status.closed}
        </span>
      </div>

      {/* Actions dropdown */}
      <div className="relative">
        <button
          onClick={() => setShowActions(!showActions)}
          className="flex-shrink-0 p-2 text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-gray-200 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-700 transition-colors"
        >
          <svg
            xmlns="http://www.w3.org/2000/svg"
            fill="none"
            viewBox="0 0 24 24"
            strokeWidth={1.5}
            stroke="currentColor"
            className="w-5 h-5"
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              d="M12 6.75a.75.75 0 110-1.5.75.75 0 010 1.5zM12 12.75a.75.75 0 110-1.5.75.75 0 010 1.5zM12 18.75a.75.75 0 110-1.5.75.75 0 010 1.5z"
            />
          </svg>
        </button>

        {/* Dropdown menu */}
        {showActions && (
          <>
            {/* Backdrop */}
            <div
              className="fixed inset-0 z-10"
              onClick={() => setShowActions(false)}
            />

            {/* Menu */}
            <div className="absolute right-0 top-full mt-1 w-48 bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-lg shadow-lg z-20 py-1 transition-colors">
              {!isAssignedToMe && status !== 'closed' && (
                <button
                  onClick={handleAssignToMe}
                  className="w-full px-4 py-2 text-left text-sm text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-700 transition-colors"
                >
                  👤 {t.conversations_actions.assign_self}
                </button>
              )}

              {status !== 'closed' && (
                <button
                  onClick={handleClose}
                  className="w-full px-4 py-2 text-left text-sm text-red-600 dark:text-red-400 hover:bg-gray-100 dark:hover:bg-gray-700 transition-colors"
                >
                  ✕ {t.conversations_actions.close_conversation}
                </button>
              )}

              {/* Placeholder for other actions */}
              <button
                disabled
                className="w-full px-4 py-2 text-left text-sm text-gray-400 dark:text-gray-600 cursor-not-allowed"
              >
                🚫 {t.conversations_actions.block_coming_soon}
              </button>
            </div>
          </>
        )}
      </div>
    </div>
  );
}
