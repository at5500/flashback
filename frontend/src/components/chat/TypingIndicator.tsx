import { useTranslation } from '@/lib/i18n';

interface TypingIndicatorProps {
  userName?: string;
}

export function TypingIndicator({ userName }: TypingIndicatorProps) {
  const { t } = useTranslation();

  return (
    <div className="flex items-center gap-2 px-4 py-2">
      <div className="flex items-center gap-1 bg-gray-200 dark:bg-gray-700 rounded-full px-3 py-2 transition-colors">
        <div className="flex gap-1">
          <div className="w-2 h-2 bg-gray-500 dark:bg-gray-400 rounded-full animate-bounce" style={{ animationDelay: '0ms' }} />
          <div className="w-2 h-2 bg-gray-500 dark:bg-gray-400 rounded-full animate-bounce" style={{ animationDelay: '150ms' }} />
          <div className="w-2 h-2 bg-gray-500 dark:bg-gray-400 rounded-full animate-bounce" style={{ animationDelay: '300ms' }} />
        </div>
      </div>
      <span className="text-xs text-gray-500 dark:text-gray-400 transition-colors">
        {userName} {t.chat.typing}
      </span>
    </div>
  );
}
