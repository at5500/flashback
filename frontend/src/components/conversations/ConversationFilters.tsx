import { useState, useCallback, useEffect } from 'react';
import type { ConversationListQuery } from '@/types';
import { useTranslation } from '@/lib/i18n';

interface ConversationFiltersProps {
  onFiltersChange: (filters: ConversationListQuery) => void;
  users?: Array<{ id: string; name?: string; email: string }>;
  resetToAll?: number | boolean;
}

export function ConversationFilters({ onFiltersChange, users = [], resetToAll = 0 }: ConversationFiltersProps) {
  const { t } = useTranslation();
  const [activeTab, setActiveTab] = useState<'waiting' | 'active' | 'closed' | 'all'>('all');
  const [selectedUser, setSelectedUser] = useState<string>('all');
  const [searchQuery, setSearchQuery] = useState('');

  // Reset to "All" tab when requested
  useEffect(() => {
    if (resetToAll) {
      setActiveTab('all');
      setSelectedUser('all');
      setSearchQuery('');
    }
  }, [resetToAll]);

  // Update filters when any filter changes
  const updateFilters = useCallback(
    (
      status?: 'waiting' | 'active' | 'closed' | 'not_closed',
      userId?: string,
      search?: string
    ) => {
      const filters: ConversationListQuery = {};

      if (status && status !== 'not_closed') {
        filters.status = status;
      }
      // 'not_closed' is a special case - we don't send status filter
      // which means backend should exclude closed by default

      if (userId && userId !== 'all') {
        filters.user_id = userId;
      }

      if (search && search.trim()) {
        filters.search = search.trim();
      }

      onFiltersChange(filters);
    },
    [onFiltersChange]
  );

  // Handle tab change
  const handleTabChange = (tab: typeof activeTab) => {
    setActiveTab(tab);
    // For 'all' tab, use 'not_closed' to exclude closed conversations
    const status = tab === 'all' ? 'not_closed' : tab;
    updateFilters(status, selectedUser === 'all' ? undefined : selectedUser, searchQuery);
  };

  // Handle user filter change
  const handleUserChange = (userId: string) => {
    setSelectedUser(userId);
    const status = activeTab === 'all' ? 'not_closed' : activeTab;
    updateFilters(status, userId === 'all' ? undefined : userId, searchQuery);
  };

  // Handle search change
  const handleSearchChange = (query: string) => {
    setSearchQuery(query);
    const status = activeTab === 'all' ? 'not_closed' : activeTab;
    updateFilters(status, selectedUser === 'all' ? undefined : selectedUser, query);
  };

  return (
    <div className="bg-white dark:bg-gray-800 border-b border-gray-200 dark:border-gray-700 transition-colors">
      {/* Status Tabs */}
      <div className="flex overflow-x-auto scrollbar-hide">
        {(['all', 'waiting', 'active', 'closed'] as const).map((tab) => (
          <button
            key={tab}
            onClick={() => handleTabChange(tab)}
            className={`
              flex-1 min-w-[80px] px-4 py-3 text-sm font-medium transition-colors
              border-b-2 whitespace-nowrap
              ${
                activeTab === tab
                  ? 'border-blue-500 text-blue-600 dark:text-blue-400'
                  : 'border-transparent text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-gray-200 hover:border-gray-300 dark:hover:border-gray-600'
              }
            `}
          >
            {tab === 'all' && t.conversations_status.all}
            {tab === 'waiting' && t.conversations_status.waiting}
            {tab === 'active' && t.conversations_status.active}
            {tab === 'closed' && t.conversations_status.closed}
          </button>
        ))}
      </div>

      {/* Filters Row */}
      <div className="p-3 flex flex-col sm:flex-row gap-3">
        {/* Search Input */}
        <div className="flex-1">
          <input
            type="text"
            placeholder={t.conversations.search_placeholder}
            value={searchQuery}
            onChange={(e) => handleSearchChange(e.target.value)}
            className="
              w-full px-4 py-2 text-sm border border-gray-300 dark:border-gray-600 rounded-lg
              focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent
              placeholder-gray-400 dark:placeholder-gray-500
              bg-white dark:bg-gray-700 text-gray-900 dark:text-white transition-colors
            "
          />
        </div>

        {/* User Dropdown */}
        {users.length > 0 && (
          <div className="sm:w-48">
            <select
              value={selectedUser}
              onChange={(e) => handleUserChange(e.target.value)}
              className="
                w-full px-4 py-2 text-sm border border-gray-300 dark:border-gray-600 rounded-lg
                focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent
                bg-white dark:bg-gray-700 text-gray-900 dark:text-white cursor-pointer transition-colors
              "
            >
              <option value="all">{t.conversations_filters.all_users}</option>
              {users.map((user) => (
                <option key={user.id} value={user.id}>
                  {user.name || user.email}
                </option>
              ))}
            </select>
          </div>
        )}
      </div>
    </div>
  );
}
