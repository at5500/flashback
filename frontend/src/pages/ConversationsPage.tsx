import { useState, useEffect } from 'react';
import { useLocation } from 'react-router-dom';
import { useWebSocket, useConversations } from '@/hooks';
import { AppLayout, MobileNavigation } from '@/components/layout';
import { ConversationList } from '@/components/conversations';
import { ChatWindow } from '@/components/chat';
import type { Conversation } from '@/types';
import { useTranslation } from '@/lib/i18n';

export default function ConversationsPage() {
  const { t } = useTranslation();
  const [selectedConversation, setSelectedConversation] = useState<Conversation | null>(null);
  const location = useLocation();
  const { data: conversationsData } = useConversations({});

  // Connect to WebSocket
  useWebSocket();

  // Auto-select conversation from location state
  useEffect(() => {
    const state = location.state as { selectedConversationId?: string; resetFilters?: boolean } | null;
    if (state?.selectedConversationId && conversationsData?.conversations) {
      const conversation = conversationsData.conversations.find(
        (conv) => conv.id === state.selectedConversationId
      );
      if (conversation) {
        setSelectedConversation(conversation);
        console.log('[ConversationsPage] Auto-selected conversation from notification:', conversation.id);
      }
    }
  }, [location.state, conversationsData]);

  // Get resetFilters flag from location state
  const state = location.state as { resetFilters?: number | boolean } | null;
  const resetFilters = state?.resetFilters ?? 0;

  const handleConversationSelect = (conversation: Conversation) => {
    setSelectedConversation(conversation);
    console.log('Selected conversation:', conversation);
  };

  const handleCloseMobileChat = () => {
    setSelectedConversation(null);
  };

  const handleConversationDelete = (conversationId: string) => {
    // If the deleted conversation is currently selected, clear selection
    if (selectedConversation?.id === conversationId) {
      setSelectedConversation(null);
    }
  };

  return (
    <AppLayout>
      <div className="flex-1 flex flex-col lg:flex-row max-w-7xl mx-auto w-full overflow-hidden">
        {/* Conversations List - Always visible on desktop, hidden when chat open on mobile */}
        <div className="w-full lg:w-96 border-r border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800 flex flex-col lg:flex transition-colors">
          <ConversationList
            onConversationSelect={handleConversationSelect}
            selectedConversationId={selectedConversation?.id}
            users={[]} // TODO: Load users list
            onConversationDelete={handleConversationDelete}
            resetFilters={resetFilters}
          />
        </div>

        {/* Chat Area - Desktop only */}
        <div className="flex-1 bg-white dark:bg-gray-900 hidden lg:flex transition-colors">
          {selectedConversation ? (
            <ChatWindow conversation={selectedConversation} />
          ) : (
            <div className="flex-1 flex items-center justify-center">
              <div className="text-center p-8">
                <div className="text-6xl mb-4 text-gray-300 dark:text-gray-600">💬</div>
                <h2 className="text-xl font-semibold text-gray-600 dark:text-gray-300 mb-2 transition-colors">
                  {t.conversations.select_conversation}
                </h2>
                <p className="text-gray-500 dark:text-gray-400 transition-colors">
                  {t.conversations.select_conversation_hint}
                </p>
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Mobile: Selected Conversation Overlay with transitions and gestures */}
      <MobileNavigation
        show={!!selectedConversation}
        onClose={handleCloseMobileChat}
        enableSwipe={true}
      >
        {selectedConversation && (
          <ChatWindow
            conversation={selectedConversation}
            onBack={handleCloseMobileChat}
            showBackButton={true}
          />
        )}
      </MobileNavigation>
    </AppLayout>
  );
}
