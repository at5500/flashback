import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useNavigate } from 'react-router-dom';
import { AppLayout } from '@/components/layout/AppLayout';
import { ConfirmDialog } from '@/components/common';
import { usersApi, settingsApi } from '@/api';
import { useAuthStore } from '@/store/auth';
import { useTranslation } from '@/lib/i18n';

interface UserFormData {
  email: string;
  name: string;
  password: string;
  is_operator: boolean;
  is_admin: boolean;
}

export function AdminPage() {
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const { t } = useTranslation();
  const currentUser = useAuthStore((state) => state.user);
  const [searchQuery, setSearchQuery] = useState('');
  const [isCreateModalOpen, setIsCreateModalOpen] = useState(false);
  const [deleteConfirmId, setDeleteConfirmId] = useState<string | null>(null);
  const [botToken, setBotToken] = useState('');
  const [settingsSaveSuccess, setSettingsSaveSuccess] = useState(false);

  // Fetch users
  const { data, isLoading } = useQuery({
    queryKey: ['users'],
    queryFn: () => usersApi.getAll(),
  });

  const users = data?.users || [];

  // Fetch settings
  const { data: settings } = useQuery({
    queryKey: ['settings'],
    queryFn: () => settingsApi.getSettings(),
  });

  // Fetch bot status
  const { data: botStatus } = useQuery({
    queryKey: ['bot-status'],
    queryFn: () => settingsApi.getBotStatus(),
    refetchInterval: 3000, // Poll every 3 seconds
  });

  // Mutations
  const createMutation = useMutation({
    mutationFn: usersApi.create,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['users'] });
      setIsCreateModalOpen(false);
    },
  });

  const deleteMutation = useMutation({
    mutationFn: usersApi.delete,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['users'] });
    },
  });

  const toggleActiveMutation = useMutation({
    mutationFn: usersApi.toggleActive,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['users'] });
    },
  });

  const toggleOperatorMutation = useMutation({
    mutationFn: usersApi.toggleOperator,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['users'] });
    },
  });

  const toggleAdminMutation = useMutation({
    mutationFn: usersApi.toggleAdmin,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['users'] });
    },
  });

  const updateSettingsMutation = useMutation({
    mutationFn: settingsApi.updateSettings,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['settings'] });
      queryClient.invalidateQueries({ queryKey: ['bot-status'] });
      setSettingsSaveSuccess(true);
      setTimeout(() => setSettingsSaveSuccess(false), 3000);
    },
    onError: (error: any) => {
      console.error('[SETTINGS_UPDATE_ERROR]', error);
      console.error('[SETTINGS_UPDATE_ERROR] Response:', error?.response);
      console.error('[SETTINGS_UPDATE_ERROR] Data:', error?.response?.data);
    },
  });

  // Filter users
  const filteredUsers = users.filter((user) =>
    searchQuery === '' ||
    user.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
    user.email.toLowerCase().includes(searchQuery.toLowerCase())
  );

  const handleDelete = () => {
    if (deleteConfirmId) {
      deleteMutation.mutate(deleteConfirmId);
      setDeleteConfirmId(null);
    }
  };

  const handleCreateUser = (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    const formData = new FormData(e.currentTarget);
    const data: UserFormData = {
      email: formData.get('email') as string,
      name: formData.get('name') as string,
      password: formData.get('password') as string,
      is_operator: formData.get('is_operator') === 'on',
      is_admin: formData.get('is_admin') === 'on',
    };
    createMutation.mutate(data);
  };

  const handleUpdateBotToken = () => {
    setSettingsSaveSuccess(false);
    updateSettingsMutation.mutate({
      telegram_bot_token: botToken || undefined,
    });
  };

  const getBotStatusColor = () => {
    switch (botStatus?.status) {
      case 'connected':
        return 'bg-green-100 dark:bg-green-900 text-green-800 dark:text-green-300';
      case 'connecting':
        return 'bg-yellow-100 dark:bg-yellow-900 text-yellow-800 dark:text-yellow-300';
      case 'error':
        return 'bg-red-100 dark:bg-red-900 text-red-800 dark:text-red-300';
      default:
        return 'bg-gray-100 dark:bg-gray-700 text-gray-800 dark:text-gray-300';
    }
  };

  const getBotStatusText = () => {
    switch (botStatus?.status) {
      case 'connected':
        return t.admin.bot_status.connected;
      case 'connecting':
        return t.admin.bot_status.connecting;
      case 'error':
        return t.admin.bot_status.error;
      default:
        return t.admin.bot_status.disconnected;
    }
  };

  // Check if current user is admin
  if (!currentUser?.is_admin) {
    return (
      <AppLayout>
        <div className="flex items-center justify-center h-screen">
          <div className="text-center">
            <h1 className="text-2xl font-bold text-gray-900 dark:text-white mb-2">Access Denied</h1>
            <p className="text-gray-600 dark:text-gray-400">You don't have permission to access this page.</p>
          </div>
        </div>
      </AppLayout>
    );
  }

  return (
    <AppLayout>
      <div className="w-full max-w-7xl mx-auto px-4 py-6 sm:px-6 lg:px-8">
        {/* Back button */}
        <button
          onClick={() => navigate('/')}
          className="flex items-center gap-2 text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-gray-200 mb-4 transition-colors"
        >
          <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
          </svg>
          <span className="text-sm font-medium">{t.conversations.title}</span>
        </button>

        {/* Header */}
        <div className="mb-6">
          <div className="flex items-center justify-between">
            <div>
              <h1 className="text-2xl font-bold text-gray-900 dark:text-white">{t.admin.title}</h1>
              <p className="mt-1 text-sm text-gray-600 dark:text-gray-400">
                {t.admin.subtitle}
              </p>
            </div>
          </div>
        </div>

        {/* System Settings Card */}
        <div className="mb-8 bg-white dark:bg-gray-800 rounded-lg shadow border border-gray-200 dark:border-gray-700 transition-colors">
          <div className="px-6 py-4 border-b border-gray-200 dark:border-gray-700">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <svg className="w-5 h-5 text-blue-600 dark:text-blue-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.065 2.572c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.572 1.065c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.065-2.572c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065z" />
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
                </svg>
                <h2 className="text-lg font-semibold text-gray-900 dark:text-white transition-colors">{t.admin.system_settings}</h2>
              </div>
              <span className={`px-2 py-1 text-xs leading-5 font-semibold rounded-full ${getBotStatusColor()}`}>
                {getBotStatusText()}
              </span>
            </div>
          </div>

          <div className="p-6">
            {settingsSaveSuccess && (
              <div className="mb-4 p-3 bg-green-50 dark:bg-green-900/20 border border-green-200 dark:border-green-800 rounded-lg text-green-700 dark:text-green-400 text-sm transition-colors">
                {t.admin.settings_saved}
              </div>
            )}

            {updateSettingsMutation.isError && (
              <div className="mb-4 p-3 bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-lg text-red-700 dark:text-red-400 text-sm transition-colors">
                {t.admin.settings_error}
              </div>
            )}

            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2 transition-colors">
                  {t.admin.bot_token}
                </label>
                <div className="flex gap-3">
                  <input
                    type="password"
                    value={botToken || settings?.telegram_bot_token || ''}
                    onChange={(e) => setBotToken(e.target.value)}
                    placeholder={t.admin.bot_token_placeholder}
                    className="flex-1 px-3 py-2 border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-700 text-gray-900 dark:text-white rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-colors"
                  />
                  <button
                    onClick={handleUpdateBotToken}
                    disabled={updateSettingsMutation.isPending}
                    className="px-4 py-2 bg-blue-600 dark:bg-blue-600 text-white rounded-lg hover:bg-blue-700 dark:hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors font-medium"
                  >
                    {updateSettingsMutation.isPending ? `${t.common.save}...` : t.common.save}
                  </button>
                </div>
                <p className="text-xs text-gray-500 dark:text-gray-400 mt-2 transition-colors">
                  {t.admin.bot_token_hint}
                </p>
              </div>
            </div>
          </div>
        </div>

        {/* User Management Section Header */}
        <div className="mb-4">
          <h2 className="text-xl font-semibold text-gray-900 dark:text-white">{t.admin.user_management}</h2>
          <p className="text-sm text-gray-600 dark:text-gray-400 mt-1">
            {t.admin.user_management_subtitle}
          </p>
        </div>

        {/* Toolbar */}
        <div className="mb-6 flex flex-col sm:flex-row gap-4">
          <div className="flex-1">
            <input
              type="search"
              placeholder={`${t.common.search}...`}
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full px-4 py-2 border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-700 text-gray-900 dark:text-white rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
            />
          </div>
          <button
            onClick={() => setIsCreateModalOpen(true)}
            className="px-4 py-2 bg-blue-600 dark:bg-blue-600 text-white rounded-lg hover:bg-blue-700 dark:hover:bg-blue-700 transition-colors"
          >
            {t.common.create}
          </button>
        </div>

        {/* Users Table */}
        {isLoading ? (
          <div className="text-center py-12">
            <div className="inline-block animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600 dark:border-blue-400"></div>
          </div>
        ) : (
          <div className="bg-white dark:bg-gray-800 shadow-md rounded-lg overflow-hidden transition-colors">
            <table className="min-w-full divide-y divide-gray-200 dark:divide-gray-700">
              <thead className="bg-gray-50 dark:bg-gray-700">
                <tr>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                    User
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                    Role
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                    Status
                  </th>
                  <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                    Actions
                  </th>
                </tr>
              </thead>
              <tbody className="bg-white dark:bg-gray-800 divide-y divide-gray-200 dark:divide-gray-700">
                {filteredUsers.map((user) => (
                  <tr key={user.id} className="hover:bg-gray-50 dark:hover:bg-gray-700 transition-colors">
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="flex items-center">
                        <div>
                          <div className="text-sm font-medium text-gray-900 dark:text-white">{user.name}</div>
                          <div className="text-sm text-gray-500 dark:text-gray-400">{user.email}</div>
                        </div>
                      </div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="flex gap-2">
                        {user.is_admin && (
                          <span className="px-2 inline-flex text-xs leading-5 font-semibold rounded-full bg-purple-100 dark:bg-purple-900 text-purple-800 dark:text-purple-300">
                            Admin
                          </span>
                        )}
                        {user.is_operator && (
                          <span className="px-2 inline-flex text-xs leading-5 font-semibold rounded-full bg-blue-100 dark:bg-blue-900 text-blue-800 dark:text-blue-300">
                            Operator
                          </span>
                        )}
                      </div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <span
                        className={`px-2 inline-flex text-xs leading-5 font-semibold rounded-full ${
                          user.is_active
                            ? 'bg-green-100 dark:bg-green-900 text-green-800 dark:text-green-300'
                            : 'bg-red-100 dark:bg-red-900 text-red-800 dark:text-red-300'
                        }`}
                      >
                        {user.is_active ? 'Active' : 'Inactive'}
                      </span>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-right text-sm">
                      <div className="flex justify-end">
                        <div className="inline-flex rounded-md shadow-sm" role="group">
                          <button
                            onClick={() => toggleActiveMutation.mutate(user.id)}
                            className="px-3 py-1.5 text-xs font-medium text-gray-700 dark:text-gray-300 bg-white dark:bg-gray-700 border border-gray-300 dark:border-gray-600 rounded-l-md hover:bg-gray-50 dark:hover:bg-gray-600 focus:z-10 focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                            title={user.is_active ? 'Deactivate' : 'Activate'}
                          >
                            {user.is_active ? 'Deactivate' : 'Activate'}
                          </button>
                          <button
                            onClick={() => toggleOperatorMutation.mutate(user.id)}
                            className="px-3 py-1.5 text-xs font-medium text-gray-700 dark:text-gray-300 bg-white dark:bg-gray-700 border-t border-b border-r border-gray-300 dark:border-gray-600 hover:bg-gray-50 dark:hover:bg-gray-600 focus:z-10 focus:ring-2 focus:ring-blue-500 focus:border-blue-500 disabled:opacity-50 disabled:cursor-not-allowed"
                            disabled={user.id === currentUser?.id}
                          >
                            {user.is_operator ? '− Operator' : '+ Operator'}
                          </button>
                          <button
                            onClick={() => toggleAdminMutation.mutate(user.id)}
                            className="px-3 py-1.5 text-xs font-medium text-gray-700 dark:text-gray-300 bg-white dark:bg-gray-700 border-t border-b border-r border-gray-300 dark:border-gray-600 hover:bg-gray-50 dark:hover:bg-gray-600 focus:z-10 focus:ring-2 focus:ring-blue-500 focus:border-blue-500 disabled:opacity-50 disabled:cursor-not-allowed"
                            disabled={user.id === currentUser?.id}
                          >
                            {user.is_admin ? '− Admin' : '+ Admin'}
                          </button>
                          <button
                            onClick={() => setDeleteConfirmId(user.id)}
                            className="px-3 py-1.5 text-xs font-medium text-white bg-red-600 dark:bg-red-700 border border-red-600 dark:border-red-700 rounded-r-md hover:bg-red-700 dark:hover:bg-red-800 focus:z-10 focus:ring-2 focus:ring-red-500 focus:border-red-500 disabled:opacity-50 disabled:cursor-not-allowed"
                            disabled={user.id === currentUser?.id}
                          >
                            Delete
                          </button>
                        </div>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}

        {/* Create User Modal */}
        {isCreateModalOpen && (
          <div className="fixed inset-0 bg-black bg-opacity-50 dark:bg-opacity-70 flex items-center justify-center z-50">
            <div className="bg-white dark:bg-gray-800 rounded-lg p-6 w-full max-w-md transition-colors">
              <h2 className="text-xl font-bold mb-4 text-gray-900 dark:text-white">{t.common.create}</h2>
              <form onSubmit={handleCreateUser}>
                <div className="space-y-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                      {t.common.email}
                    </label>
                    <input
                      type="email"
                      name="email"
                      required
                      className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-700 text-gray-900 dark:text-white rounded-lg focus:ring-2 focus:ring-blue-500"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                      {t.common.name}
                    </label>
                    <input
                      type="text"
                      name="name"
                      required
                      className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-700 text-gray-900 dark:text-white rounded-lg focus:ring-2 focus:ring-blue-500"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                      {t.common.password}
                    </label>
                    <input
                      type="password"
                      name="password"
                      required
                      className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-700 text-gray-900 dark:text-white rounded-lg focus:ring-2 focus:ring-blue-500"
                    />
                  </div>
                  <div className="flex items-center">
                    <input
                      type="checkbox"
                      name="is_operator"
                      id="is_operator"
                      className="h-4 w-4 text-blue-600 dark:text-blue-500 rounded"
                    />
                    <label htmlFor="is_operator" className="ml-2 text-sm text-gray-700 dark:text-gray-300">
                      {t.chat.operator}
                    </label>
                  </div>
                  <div className="flex items-center">
                    <input
                      type="checkbox"
                      name="is_admin"
                      id="is_admin"
                      className="h-4 w-4 text-blue-600 dark:text-blue-500 rounded"
                    />
                    <label htmlFor="is_admin" className="ml-2 text-sm text-gray-700 dark:text-gray-300">
                      {t.menu.admin}
                    </label>
                  </div>
                </div>
                <div className="mt-6 flex gap-3 justify-end">
                  <button
                    type="button"
                    onClick={() => setIsCreateModalOpen(false)}
                    className="px-4 py-2 text-gray-700 dark:text-gray-300 bg-white dark:bg-gray-700 border border-gray-300 dark:border-gray-600 rounded-lg hover:bg-gray-50 dark:hover:bg-gray-600 transition-colors"
                  >
                    {t.common.cancel}
                  </button>
                  <button
                    type="submit"
                    disabled={createMutation.isPending}
                    className="px-4 py-2 bg-blue-600 dark:bg-blue-600 text-white rounded-lg hover:bg-blue-700 dark:hover:bg-blue-700 disabled:opacity-50 transition-colors"
                  >
                    {createMutation.isPending ? `${t.common.create}...` : t.common.create}
                  </button>
                </div>
              </form>
            </div>
          </div>
        )}

        {/* Delete Confirmation Dialog */}
        <ConfirmDialog
          isOpen={deleteConfirmId !== null}
          title={t.conversations_actions.delete_confirm_title}
          message={t.conversations_actions.delete_confirm_message}
          confirmText={t.common.delete}
          cancelText={t.common.cancel}
          onConfirm={handleDelete}
          onCancel={() => setDeleteConfirmId(null)}
          isDangerous
        />
      </div>
    </AppLayout>
  );
}