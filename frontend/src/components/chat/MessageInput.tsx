import { useState, useRef, useEffect, KeyboardEvent } from 'react';
import { TemplateSelector } from './TemplateSelector';
import { useSendTypingStatus } from '@/hooks';
import { useTranslation } from '@/lib/i18n';

interface MessageInputProps {
  onSendMessage: (content: string) => void;
  disabled?: boolean;
  placeholder?: string;
  conversationId?: string;
}

export function MessageInput({
  onSendMessage,
  disabled = false,
  placeholder,
  conversationId,
}: MessageInputProps) {
  const { t } = useTranslation();
  const [content, setContent] = useState('');
  const [showTemplates, setShowTemplates] = useState(false);
  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const { sendTyping } = useSendTypingStatus();

  // Auto-resize textarea
  useEffect(() => {
    const textarea = textareaRef.current;
    if (!textarea) return;

    textarea.style.height = 'auto';
    textarea.style.height = `${Math.min(textarea.scrollHeight, 200)}px`;
  }, [content]);

  // Handle send
  const handleSend = () => {
    const trimmed = content.trim();
    if (!trimmed || disabled) return;

    onSendMessage(trimmed);
    setContent('');

    // Reset textarea height
    if (textareaRef.current) {
      textareaRef.current.style.height = 'auto';
    }
  };

  // Handle key press (Ctrl+Enter to send)
  const handleKeyDown = (e: KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key === 'Enter' && (e.ctrlKey || e.metaKey)) {
      e.preventDefault();
      handleSend();
    }
  };

  // Handle content change and send typing status
  const handleContentChange = (newContent: string) => {
    setContent(newContent);

    // Send typing indicator when user starts typing
    if (newContent.length > 0 && conversationId) {
      sendTyping(conversationId);
    }
  };

  // Handle template selection
  const handleSelectTemplate = (templateContent: string) => {
    setContent(templateContent);
    // Focus textarea after template selection
    setTimeout(() => textareaRef.current?.focus(), 0);
  };

  return (
    <div className="border-t border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800 p-4 relative sticky bottom-0 z-10 transition-colors">
      {/* Template Selector Popover */}
      <TemplateSelector
        isOpen={showTemplates}
        onClose={() => setShowTemplates(false)}
        onSelectTemplate={handleSelectTemplate}
      />

      <div className="flex items-end gap-2">
        {/* Textarea */}
        <div className="flex-1 relative">
          <textarea
            ref={textareaRef}
            value={content}
            onChange={(e) => handleContentChange(e.target.value)}
            onKeyDown={handleKeyDown}
            placeholder={placeholder || t.chat.type_message}
            disabled={disabled}
            rows={1}
            className="
              w-full px-4 py-2 pr-12 text-sm border border-gray-300 dark:border-gray-600 rounded-lg resize-none
              focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent
              disabled:bg-gray-100 dark:disabled:bg-gray-700 disabled:cursor-not-allowed
              placeholder-gray-400 dark:placeholder-gray-500
              bg-white dark:bg-gray-700 text-gray-900 dark:text-white transition-colors
            "
            style={{ maxHeight: '200px', minHeight: '40px' }}
          />

          {/* Templates button */}
          <button
            type="button"
            disabled={disabled}
            onClick={() => setShowTemplates(!showTemplates)}
            className="
              absolute right-2 bottom-2 p-1.5 text-gray-400 dark:text-gray-500 hover:text-gray-600 dark:hover:text-gray-300
              disabled:opacity-50 disabled:cursor-not-allowed
              transition-colors rounded
            "
            title={t.templates.title}
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
                d="M19.5 14.25v-2.625a3.375 3.375 0 00-3.375-3.375h-1.5A1.125 1.125 0 0113.5 7.125v-1.5a3.375 3.375 0 00-3.375-3.375H8.25m0 12.75h7.5m-7.5 3H12M10.5 2.25H5.625c-.621 0-1.125.504-1.125 1.125v17.25c0 .621.504 1.125 1.125 1.125h12.75c.621 0 1.125-.504 1.125-1.125V11.25a9 9 0 00-9-9z"
              />
            </svg>
          </button>
        </div>

        {/* Send button */}
        <button
          onClick={handleSend}
          disabled={!content.trim() || disabled}
          className="
            flex-shrink-0 px-4 py-2 bg-blue-600 dark:bg-blue-500 text-white rounded-lg font-medium
            hover:bg-blue-700 dark:hover:bg-blue-600 disabled:bg-gray-300 dark:disabled:bg-gray-600 disabled:cursor-not-allowed
            transition-colors min-h-[40px]
            text-sm sm:text-base
          "
        >
          {t.chat.send}
        </button>
      </div>

      {/* Hint */}
      <p className="text-xs text-gray-500 dark:text-gray-400 mt-2 transition-colors">
        {t.chat.send_hint}
      </p>
    </div>
  );
}
