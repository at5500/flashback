import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useCurrentUser, useUserStats, useUpdateUserProfile, useChangePassword } from '@/hooks';
import { AppLayout } from '@/components/layout/AppLayout';
import { useTranslation } from '@/lib/i18n';

export function ProfilePage() {
  const { t } = useTranslation();
  const navigate = useNavigate();
  const { data: user, isLoading: userLoading } = useCurrentUser();
  const { data: stats, isLoading: statsLoading } = useUserStats();
  const updateProfileMutation = useUpdateUserProfile();
  const changePasswordMutation = useChangePassword();

  const [isEditingProfile, setIsEditingProfile] = useState(false);
  const [isChangingPassword, setIsChangingPassword] = useState(false);

  // Profile form state
  const [name, setName] = useState('');

  // Password form state
  const [currentPassword, setCurrentPassword] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [passwordError, setPasswordError] = useState('');
  const [passwordSuccess, setPasswordSuccess] = useState('');

  const isLoading = userLoading || statsLoading;

  // Initialize form when user data loads
  useEffect(() => {
    if (user) {
      setName(user.name || '');
    }
  }, [user]);

  // Handle profile update
  const handleSaveProfile = async () => {
    try {
      await updateProfileMutation.mutateAsync({ name: name.trim() || undefined });
      setIsEditingProfile(false);
    } catch (error) {
      console.error('Failed to update profile:', error);
    }
  };

  // Handle password change
  const handleChangePassword = async () => {
    setPasswordError('');
    setPasswordSuccess('');

    // Validation
    if (!currentPassword || !newPassword || !confirmPassword) {
      setPasswordError(t.profile.error_all_fields);
      return;
    }

    if (newPassword.length < 6) {
      setPasswordError(t.profile.error_password_length);
      return;
    }

    if (newPassword !== confirmPassword) {
      setPasswordError(t.profile.passwords_no_match);
      return;
    }

    try {
      await changePasswordMutation.mutateAsync({
        current_password: currentPassword,
        new_password: newPassword,
      });
      setPasswordSuccess(t.profile.password_changed);
      setCurrentPassword('');
      setNewPassword('');
      setConfirmPassword('');
      setTimeout(() => {
        setIsChangingPassword(false);
        setPasswordSuccess('');
      }, 2000);
    } catch (error: any) {
      setPasswordError(error.response?.data?.error || t.profile.error_change_password);
    }
  };

  return (
    <AppLayout>
      <div className="w-full max-w-7xl mx-auto px-4 py-6 sm:px-6 lg:px-8">
        {/* Back button */}
        <button
          onClick={() => navigate('/')}
          className="flex items-center gap-2 text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-white mb-4 transition-colors"
        >
          <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
          </svg>
          <span className="text-sm font-medium">{t.common.back_to_conversations}</span>
        </button>

        {/* Header */}
        <div className="mb-6">
          <h1 className="text-2xl font-bold text-gray-900 dark:text-white">{t.profile.title}</h1>
          <p className="text-sm text-gray-600 dark:text-gray-400 mt-1">
            {t.profile.subtitle}
          </p>
        </div>

        {isLoading ? (
          <div className="flex items-center justify-center py-12">
            <div className="w-8 h-8 border-4 border-blue-500 border-t-transparent rounded-full animate-spin" />
          </div>
        ) : (
          <div className="grid gap-6 lg:grid-cols-3">
            {/* Left Column - Profile Info */}
            <div className="lg:col-span-2 space-y-6">
              {/* Profile Card */}
              <div className="bg-white dark:bg-gray-800 rounded-lg shadow border border-gray-200 dark:border-gray-700 transition-colors">
                <div className="px-6 py-4 border-b border-gray-200 dark:border-gray-700 flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <svg className="w-5 h-5 text-blue-600 dark:text-blue-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
                    </svg>
                    <h2 className="text-lg font-semibold text-gray-900 dark:text-white">{t.profile.personal_info}</h2>
                  </div>
                  <button
                    onClick={() => {
                      if (isEditingProfile) {
                        setName(user?.name || '');
                      }
                      setIsEditingProfile(!isEditingProfile);
                    }}
                    className="text-sm text-blue-600 dark:text-blue-400 hover:text-blue-700 dark:hover:text-blue-300 font-medium"
                  >
                    {isEditingProfile ? t.common.cancel : t.profile.edit}
                  </button>
                </div>
                <div className="p-6">
                  {/* Avatar */}
                  <div className="flex items-center gap-4 mb-6">
                    <div className="w-20 h-20 rounded-full bg-blue-500 dark:bg-blue-600 text-white flex items-center justify-center text-2xl font-semibold">
                      {user?.email?.[0].toUpperCase() || 'O'}
                    </div>
                    <div>
                      <h3 className="text-lg font-semibold text-gray-900 dark:text-white">
                        {user?.name || t.profile.no_name}
                      </h3>
                      <p className="text-sm text-gray-500 dark:text-gray-400">{user?.email}</p>
                      <span className="inline-block mt-1 px-2 py-1 bg-blue-100 dark:bg-blue-900 text-blue-700 dark:text-blue-300 text-xs rounded">
                        {t.common.operator}
                      </span>
                    </div>
                  </div>

                  {/* Profile Form */}
                  <div className="space-y-4">
                    <div>
                      <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                        {t.common.email}
                      </label>
                      <input
                        type="email"
                        value={user?.email || ''}
                        disabled
                        className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-gray-50 dark:bg-gray-700 text-gray-500 dark:text-gray-400 cursor-not-allowed"
                      />
                      <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">{t.profile.email_hint}</p>
                    </div>

                    <div>
                      <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                        {t.common.name}
                      </label>
                      <input
                        type="text"
                        value={name}
                        onChange={(e) => setName(e.target.value)}
                        disabled={!isEditingProfile}
                        className={`w-full px-3 py-2 border rounded-lg ${
                          isEditingProfile
                            ? 'border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-blue-500'
                            : 'border-gray-300 dark:border-gray-600 bg-gray-50 dark:bg-gray-700 text-gray-500 dark:text-gray-400 cursor-not-allowed'
                        }`}
                        placeholder={t.profile.name_placeholder}
                      />
                    </div>


                    <div>
                      <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                        {t.profile.account_created}
                      </label>
                      <input
                        type="text"
                        value={
                          user?.created_at
                            ? new Date(user.created_at).toLocaleString('ru-RU')
                            : ''
                        }
                        disabled
                        className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-gray-50 dark:bg-gray-700 text-gray-500 dark:text-gray-400 cursor-not-allowed"
                      />
                    </div>

                    {isEditingProfile && (
                      <div className="flex gap-3 pt-2">
                        <button
                          onClick={handleSaveProfile}
                          disabled={updateProfileMutation.isPending}
                          className="px-4 py-2 bg-blue-600 dark:bg-blue-600 text-white rounded-lg hover:bg-blue-700 dark:hover:bg-blue-700 transition-colors disabled:opacity-50"
                        >
                          {updateProfileMutation.isPending ? `${t.common.save}...` : t.profile.save_changes}
                        </button>
                        <button
                          onClick={() => {
                            setName(user?.name || '');
                            setIsEditingProfile(false);
                          }}
                          className="px-4 py-2 bg-white dark:bg-gray-700 border border-gray-300 dark:border-gray-600 text-gray-700 dark:text-gray-300 rounded-lg hover:bg-gray-50 dark:hover:bg-gray-600 transition-colors"
                        >
                          {t.common.cancel}
                        </button>
                      </div>
                    )}
                  </div>
                </div>
              </div>

              {/* Password Change Card */}
              <div className="bg-white dark:bg-gray-800 rounded-lg shadow border border-gray-200 dark:border-gray-700 transition-colors">
                <div className="px-6 py-4 border-b border-gray-200 dark:border-gray-700 flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <svg className="w-5 h-5 text-blue-600 dark:text-blue-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z" />
                    </svg>
                    <h2 className="text-lg font-semibold text-gray-900 dark:text-white">{t.profile.security}</h2>
                  </div>
                </div>
                <div className="p-6">
                  {!isChangingPassword ? (
                    <button
                      onClick={() => setIsChangingPassword(true)}
                      className="px-4 py-2 bg-white dark:bg-gray-700 border border-gray-300 dark:border-gray-600 text-gray-700 dark:text-gray-300 rounded-lg hover:bg-gray-50 dark:hover:bg-gray-600 transition-colors"
                    >
                      {t.profile.change_password}
                    </button>
                  ) : (
                    <div className="space-y-4">
                      {passwordError && (
                        <div className="p-3 bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-lg text-red-700 dark:text-red-400 text-sm">
                          {passwordError}
                        </div>
                      )}
                      {passwordSuccess && (
                        <div className="p-3 bg-green-50 dark:bg-green-900/20 border border-green-200 dark:border-green-800 rounded-lg text-green-700 dark:text-green-400 text-sm">
                          {passwordSuccess}
                        </div>
                      )}
                      <div>
                        <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                          {t.profile.current_password}
                        </label>
                        <input
                          type="password"
                          value={currentPassword}
                          onChange={(e) => setCurrentPassword(e.target.value)}
                          className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-700 text-gray-900 dark:text-white rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                          placeholder={t.profile.current_password_placeholder}
                        />
                      </div>
                      <div>
                        <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                          {t.profile.new_password}
                        </label>
                        <input
                          type="password"
                          value={newPassword}
                          onChange={(e) => {
                            setNewPassword(e.target.value);
                            setPasswordError('');
                          }}
                          className={`w-full px-3 py-2 border rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:outline-none focus:ring-2 ${
                            newPassword && confirmPassword && newPassword !== confirmPassword
                              ? 'border-red-500 dark:border-red-600 focus:ring-red-500'
                              : 'border-gray-300 dark:border-gray-600 focus:ring-blue-500'
                          }`}
                          placeholder={t.profile.new_password_placeholder}
                        />
                      </div>
                      <div>
                        <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                          {t.profile.confirm_password}
                        </label>
                        <input
                          type="password"
                          value={confirmPassword}
                          onChange={(e) => {
                            setConfirmPassword(e.target.value);
                            setPasswordError('');
                          }}
                          className={`w-full px-3 py-2 border rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:outline-none focus:ring-2 ${
                            newPassword && confirmPassword && newPassword !== confirmPassword
                              ? 'border-red-500 dark:border-red-600 focus:ring-red-500'
                              : 'border-gray-300 dark:border-gray-600 focus:ring-blue-500'
                          }`}
                          placeholder={t.profile.confirm_password_placeholder}
                        />
                        {newPassword && confirmPassword && newPassword !== confirmPassword && (
                          <p className="text-xs text-red-600 dark:text-red-400 mt-1 flex items-center gap-1">
                            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                            </svg>
                            {t.profile.passwords_no_match}
                          </p>
                        )}
                      </div>
                      <div className="flex gap-3 pt-2">
                        <button
                          onClick={handleChangePassword}
                          disabled={changePasswordMutation.isPending}
                          className="px-4 py-2 bg-blue-600 dark:bg-blue-600 text-white rounded-lg hover:bg-blue-700 dark:hover:bg-blue-700 transition-colors disabled:opacity-50"
                        >
                          {changePasswordMutation.isPending ? t.profile.changing : t.profile.change_password}
                        </button>
                        <button
                          onClick={() => {
                            setIsChangingPassword(false);
                            setCurrentPassword('');
                            setNewPassword('');
                            setConfirmPassword('');
                            setPasswordError('');
                            setPasswordSuccess('');
                          }}
                          className="px-4 py-2 bg-white dark:bg-gray-700 border border-gray-300 dark:border-gray-600 text-gray-700 dark:text-gray-300 rounded-lg hover:bg-gray-50 dark:hover:bg-gray-600 transition-colors"
                        >
                          {t.common.cancel}
                        </button>
                      </div>
                    </div>
                  )}
                </div>
              </div>
            </div>

            {/* Right Column - Statistics */}
            <div className="lg:col-span-1">
              <div className="bg-white dark:bg-gray-800 rounded-lg shadow border border-gray-200 dark:border-gray-700 transition-colors">
                <div className="px-6 py-4 border-b border-gray-200 dark:border-gray-700">
                  <h2 className="text-lg font-semibold text-gray-900 dark:text-white">{t.profile.stats}</h2>
                </div>
                <div className="p-6 space-y-4">
                  <div>
                    <p className="text-sm text-gray-600 dark:text-gray-400 mb-1">{t.profile.stats_total}</p>
                    <p className="text-2xl font-bold text-gray-900 dark:text-white">
                      {stats?.total_conversations || 0}
                    </p>
                  </div>
                  <div>
                    <p className="text-sm text-gray-600 dark:text-gray-400 mb-1">{t.profile.stats_active}</p>
                    <p className="text-2xl font-bold text-blue-600 dark:text-blue-400">
                      {stats?.active_conversations || 0}
                    </p>
                  </div>
                  <div>
                    <p className="text-sm text-gray-600 dark:text-gray-400 mb-1">{t.profile.stats_closed}</p>
                    <p className="text-2xl font-bold text-green-600 dark:text-green-400">
                      {stats?.closed_conversations || 0}
                    </p>
                  </div>
                  <div className="border-t border-gray-200 dark:border-gray-700 pt-4">
                    <p className="text-sm text-gray-600 dark:text-gray-400 mb-1">{t.profile.stats_messages}</p>
                    <p className="text-2xl font-bold text-gray-900 dark:text-white">
                      {stats?.total_messages_sent || 0}
                    </p>
                  </div>
                  {stats?.average_response_time_seconds && (
                    <div className="border-t border-gray-200 dark:border-gray-700 pt-4">
                      <p className="text-sm text-gray-600 dark:text-gray-400 mb-1">{t.profile.stats_avg_time}</p>
                      <p className="text-2xl font-bold text-gray-900 dark:text-white">
                        {Math.round(stats.average_response_time_seconds / 60)} {t.common.minutes}
                      </p>
                    </div>
                  )}
                </div>
              </div>
            </div>
          </div>
        )}
      </div>
    </AppLayout>
  );
}