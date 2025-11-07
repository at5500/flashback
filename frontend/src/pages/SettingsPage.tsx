import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useUpdateSettings, useCurrentUser } from '@/hooks';
import { useTheme } from '@/contexts/ThemeContext';
import { useTranslation } from '@/lib/i18n';
import { AppLayout } from '@/components/layout/AppLayout';
import notificationService from '@/services/notificationService';
import soundService from '@/services/soundService';

export function SettingsPage() {
  const navigate = useNavigate();
  const { theme } = useTheme();
  const { language, t } = useTranslation();
  const { data: user } = useCurrentUser();
  const updateSettingsMutation = useUpdateSettings();
  const [saveSuccess, setSaveSuccess] = useState(false);

  // Notification settings - initialize with defaults
  const [notificationsEnabled, setNotificationsEnabled] = useState(true);
  const [notificationSoundEnabled, setNotificationSoundEnabled] = useState(true);
  const [telegramUserId, setTelegramUserId] = useState('');

  // Update local state when user data loads or changes
  useEffect(() => {
    if (user?.settings) {
      setNotificationsEnabled(user.settings.notifications_enabled ?? true);
      setNotificationSoundEnabled(user.settings.notification_sound_enabled ?? true);
      setTelegramUserId(user.settings.telegram_notifications_user_id ?? '');
    }
  }, [user?.id, user?.settings?.notifications_enabled, user?.settings?.notification_sound_enabled, user?.settings?.telegram_notifications_user_id]);

  // Handle theme change
  const handleThemeChange = async (newTheme: 'light' | 'dark') => {
    setSaveSuccess(false);

    try {
      // Save to server - this will update auth store and trigger ThemeContext useEffect
      await updateSettingsMutation.mutateAsync({ theme: newTheme });
      setSaveSuccess(true);
      setTimeout(() => setSaveSuccess(false), 3000);
    } catch (error) {
      console.error('Failed to update theme:', error);
    }
  };

  // Handle notification settings change
  const handleNotificationsChange = async (enabled: boolean) => {
    setSaveSuccess(false);
    setNotificationsEnabled(enabled);

    // Request permission if enabling notifications
    if (enabled && notificationService.isSupported()) {
      const granted = await notificationService.requestPermission();
      if (!granted) {
        setNotificationsEnabled(false);
        return;
      }
    }

    try {
      await updateSettingsMutation.mutateAsync({ notifications_enabled: enabled });
      setSaveSuccess(true);
      setTimeout(() => setSaveSuccess(false), 3000);
    } catch (error) {
      console.error('Failed to update notification settings:', error);
      setNotificationsEnabled(!enabled);
    }
  };

  const handleSoundChange = async (enabled: boolean) => {
    setSaveSuccess(false);
    setNotificationSoundEnabled(enabled);

    // Test sound if enabling
    if (enabled) {
      await soundService.test();
    }

    try {
      await updateSettingsMutation.mutateAsync({ notification_sound_enabled: enabled });
      setSaveSuccess(true);
      setTimeout(() => setSaveSuccess(false), 3000);
    } catch (error) {
      console.error('Failed to update sound settings:', error);
      setNotificationSoundEnabled(!enabled);
    }
  };

  const handleTelegramUserIdSave = async () => {
    setSaveSuccess(false);

    try {
      // Send empty string to explicitly clear the field when empty
      await updateSettingsMutation.mutateAsync({
        telegram_notifications_user_id: telegramUserId.trim() || '',
      });
      setSaveSuccess(true);
      setTimeout(() => setSaveSuccess(false), 3000);
    } catch (error) {
      console.error('Failed to update Telegram User ID:', error);
    }
  };

  // Handle language change
  const handleLanguageChange = async (newLanguage: 'ru' | 'en') => {
    setSaveSuccess(false);

    try {
      // Save to server - this will update auth store and trigger I18nContext useEffect
      await updateSettingsMutation.mutateAsync({ language: newLanguage });
      setSaveSuccess(true);
      setTimeout(() => setSaveSuccess(false), 3000);
    } catch (error) {
      console.error('Failed to update language:', error);
    }
  };

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
          <span className="text-sm font-medium">{t.common.back_to_conversations}</span>
        </button>

        {/* Header */}
        <div className="mb-6">
          <h1 className="text-2xl font-bold text-gray-900 dark:text-white transition-colors">{t.settings.title}</h1>
          <p className="text-sm text-gray-600 dark:text-gray-400 mt-1 transition-colors">
            {t.settings.subtitle}
          </p>
        </div>

        <div className="max-w-2xl">
            {/* Settings Card */}
            <div className="bg-white dark:bg-gray-800 rounded-lg shadow border border-gray-200 dark:border-gray-700 transition-colors">
              <div className="px-6 py-4 border-b border-gray-200 dark:border-gray-700">
                <div className="flex items-center gap-2">
                  <svg className="w-5 h-5 text-blue-600 dark:text-blue-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.065 2.572c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.572 1.065c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.065-2.572c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065z" />
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
                  </svg>
                  <h2 className="text-lg font-semibold text-gray-900 dark:text-white transition-colors">{t.settings.appearance}</h2>
                </div>
              </div>

              <div className="p-6">
                {saveSuccess && (
                  <div className="mb-4 p-3 bg-green-50 dark:bg-green-900/20 border border-green-200 dark:border-green-800 rounded-lg text-green-700 dark:text-green-400 text-sm transition-colors">
                    {t.settings.save_success}
                  </div>
                )}

                <div className="space-y-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-3 transition-colors">
                      {t.settings.theme_label}
                    </label>
                    <div className="grid grid-cols-2 gap-4">
                      {/* Light Theme Option */}
                      <button
                        onClick={() => handleThemeChange('light')}
                        disabled={updateSettingsMutation.isPending}
                        className={`relative p-4 rounded-lg border-2 transition-all ${
                          theme === 'light'
                            ? 'border-blue-500 bg-blue-50 dark:bg-blue-900/20'
                            : 'border-gray-200 dark:border-gray-600 hover:border-gray-300 dark:hover:border-gray-500'
                        } ${updateSettingsMutation.isPending ? 'opacity-50 cursor-not-allowed' : 'cursor-pointer'}`}
                      >
                        <div className="flex items-center gap-3">
                          <div className="w-12 h-12 rounded-lg bg-white border border-gray-200 flex items-center justify-center">
                            <svg className="w-6 h-6 text-yellow-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 3v1m0 16v1m9-9h-1M4 12H3m15.364 6.364l-.707-.707M6.343 6.343l-.707-.707m12.728 0l-.707.707M6.343 17.657l-.707.707M16 12a4 4 0 11-8 0 4 4 0 018 0z" />
                            </svg>
                          </div>
                          <div className="text-left">
                            <div className="font-medium text-gray-900 dark:text-white transition-colors">{t.settings.theme_light}</div>
                            <div className="text-sm text-gray-500 dark:text-gray-400 transition-colors">{t.settings.theme_light_hint}</div>
                          </div>
                        </div>
                        {theme === 'light' && (
                          <div className="absolute top-2 right-2">
                            <svg className="w-5 h-5 text-blue-500" fill="currentColor" viewBox="0 0 20 20">
                              <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" />
                            </svg>
                          </div>
                        )}
                      </button>

                      {/* Dark Theme Option */}
                      <button
                        onClick={() => handleThemeChange('dark')}
                        disabled={updateSettingsMutation.isPending}
                        className={`relative p-4 rounded-lg border-2 transition-all ${
                          theme === 'dark'
                            ? 'border-blue-500 bg-blue-50 dark:bg-blue-900/20'
                            : 'border-gray-200 dark:border-gray-600 hover:border-gray-300 dark:hover:border-gray-500'
                        } ${updateSettingsMutation.isPending ? 'opacity-50 cursor-not-allowed' : 'cursor-pointer'}`}
                      >
                        <div className="flex items-center gap-3">
                          <div className="w-12 h-12 rounded-lg bg-gray-800 dark:bg-gray-700 border border-gray-700 dark:border-gray-600 flex items-center justify-center transition-colors">
                            <svg className="w-6 h-6 text-blue-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M20.354 15.354A9 9 0 018.646 3.646 9.003 9.003 0 0012 21a9.003 9.003 0 008.354-5.646z" />
                            </svg>
                          </div>
                          <div className="text-left">
                            <div className="font-medium text-gray-900 dark:text-white transition-colors">{t.settings.theme_dark}</div>
                            <div className="text-sm text-gray-500 dark:text-gray-400 transition-colors">{t.settings.theme_dark_hint}</div>
                          </div>
                        </div>
                        {theme === 'dark' && (
                          <div className="absolute top-2 right-2">
                            <svg className="w-5 h-5 text-blue-500" fill="currentColor" viewBox="0 0 20 20">
                              <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" />
                            </svg>
                          </div>
                        )}
                      </button>
                    </div>
                    <p className="text-xs text-gray-500 dark:text-gray-400 mt-2 transition-colors">
                      {t.settings.theme_hint}
                    </p>
                  </div>

                  {/* Language Section */}
                  <div className="pt-4 border-t border-gray-200 dark:border-gray-700">
                    <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-3 transition-colors">
                      {t.settings.language_label}
                    </label>
                    <div className="grid grid-cols-2 gap-4">
                      {/* Russian Language Option */}
                      <button
                        onClick={() => handleLanguageChange('ru')}
                        disabled={updateSettingsMutation.isPending}
                        className={`relative p-4 rounded-lg border-2 transition-all ${
                          language === 'ru'
                            ? 'border-blue-500 bg-blue-50 dark:bg-blue-900/20'
                            : 'border-gray-200 dark:border-gray-600 hover:border-gray-300 dark:hover:border-gray-500'
                        } ${updateSettingsMutation.isPending ? 'opacity-50 cursor-not-allowed' : 'cursor-pointer'}`}
                      >
                        <div className="flex items-center gap-3">
                          <div className="w-12 h-12 rounded-lg overflow-hidden border border-gray-200 flex items-center justify-center">
                            {/* Russian Flag SVG */}
                            <svg viewBox="0 0 60 40" className="w-full h-full">
                              <rect width="60" height="40" fill="#fff"/>
                              <rect y="13.33" width="60" height="13.33" fill="#0039a6"/>
                              <rect y="26.66" width="60" height="13.34" fill="#d52b1e"/>
                            </svg>
                          </div>
                          <div className="text-left">
                            <div className="font-medium text-gray-900 dark:text-white transition-colors">{t.settings.language_russian}</div>
                            <div className="text-sm text-gray-500 dark:text-gray-400 transition-colors">{t.settings.language_russian_hint}</div>
                          </div>
                        </div>
                        {language === 'ru' && (
                          <div className="absolute top-2 right-2">
                            <svg className="w-5 h-5 text-blue-500" fill="currentColor" viewBox="0 0 20 20">
                              <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" />
                            </svg>
                          </div>
                        )}
                      </button>

                      {/* English Language Option */}
                      <button
                        onClick={() => handleLanguageChange('en')}
                        disabled={updateSettingsMutation.isPending}
                        className={`relative p-4 rounded-lg border-2 transition-all ${
                          language === 'en'
                            ? 'border-blue-500 bg-blue-50 dark:bg-blue-900/20'
                            : 'border-gray-200 dark:border-gray-600 hover:border-gray-300 dark:hover:border-gray-500'
                        } ${updateSettingsMutation.isPending ? 'opacity-50 cursor-not-allowed' : 'cursor-pointer'}`}
                      >
                        <div className="flex items-center gap-3">
                          <div className="w-12 h-12 rounded-lg overflow-hidden border border-gray-200 flex items-center justify-center">
                            {/* UK Flag SVG */}
                            <svg viewBox="0 0 60 30" className="w-full h-full">
                              <rect width="60" height="30" fill="#012169"/>
                              <path d="M0,0 L60,30 M60,0 L0,30" stroke="#fff" strokeWidth="6"/>
                              <path d="M0,0 L60,30 M60,0 L0,30" stroke="#C8102E" strokeWidth="4"/>
                              <path d="M30,0 V30 M0,15 H60" stroke="#fff" strokeWidth="10"/>
                              <path d="M30,0 V30 M0,15 H60" stroke="#C8102E" strokeWidth="6"/>
                            </svg>
                          </div>
                          <div className="text-left">
                            <div className="font-medium text-gray-900 dark:text-white transition-colors">{t.settings.language_english}</div>
                            <div className="text-sm text-gray-500 dark:text-gray-400 transition-colors">{t.settings.language_english_hint}</div>
                          </div>
                        </div>
                        {language === 'en' && (
                          <div className="absolute top-2 right-2">
                            <svg className="w-5 h-5 text-blue-500" fill="currentColor" viewBox="0 0 20 20">
                              <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" />
                            </svg>
                          </div>
                        )}
                      </button>
                    </div>
                    <p className="text-xs text-gray-500 dark:text-gray-400 mt-2 transition-colors">
                      {t.settings.language_hint}
                    </p>
                  </div>

                  {updateSettingsMutation.isPending && (
                    <div className="flex items-center gap-2 text-sm text-gray-600 dark:text-gray-400 transition-colors">
                      <div className="w-4 h-4 border-2 border-blue-500 border-t-transparent rounded-full animate-spin" />
                      <span>{t.settings.saving}</span>
                    </div>
                  )}
                </div>
              </div>
            </div>

            {/* Notifications Card */}
            <div className="bg-white dark:bg-gray-800 rounded-lg shadow border border-gray-200 dark:border-gray-700 transition-colors mt-6">
              <div className="px-6 py-4 border-b border-gray-200 dark:border-gray-700">
                <div className="flex items-center gap-2">
                  <svg className="w-5 h-5 text-blue-600 dark:text-blue-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 17h5l-1.405-1.405A2.032 2.032 0 0118 14.158V11a6.002 6.002 0 00-4-5.659V5a2 2 0 10-4 0v.341C7.67 6.165 6 8.388 6 11v3.159c0 .538-.214 1.055-.595 1.436L4 17h5m6 0v1a3 3 0 11-6 0v-1m6 0H9" />
                  </svg>
                  <h2 className="text-lg font-semibold text-gray-900 dark:text-white transition-colors">{t.settings.notifications}</h2>
                </div>
              </div>

              <div className="p-6">
                <div className="space-y-4">
                  {/* Browser Notifications Toggle */}
                  <div className="flex items-center justify-between p-4 bg-gray-50 dark:bg-gray-700/50 rounded-lg transition-colors">
                    <div className="flex-1">
                      <div className="flex items-center gap-2">
                        <h3 className="text-sm font-medium text-gray-900 dark:text-white">{t.settings.notifications_browser}</h3>
                        {!notificationService.isSupported() && (
                          <span className="text-xs px-2 py-0.5 bg-yellow-100 dark:bg-yellow-900/30 text-yellow-800 dark:text-yellow-200 rounded">
                            {t.settings.not_supported}
                          </span>
                        )}
                      </div>
                      <p className="text-xs text-gray-600 dark:text-gray-400 mt-1">
                        {t.settings.notifications_browser_hint}
                      </p>
                    </div>
                    <button
                      onClick={() => handleNotificationsChange(!notificationsEnabled)}
                      disabled={updateSettingsMutation.isPending || !notificationService.isSupported()}
                      className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2 dark:focus:ring-offset-gray-800 ${
                        notificationsEnabled ? 'bg-blue-600' : 'bg-gray-200 dark:bg-gray-600'
                      } ${updateSettingsMutation.isPending || !notificationService.isSupported() ? 'opacity-50 cursor-not-allowed' : 'cursor-pointer'}`}
                    >
                      <span
                        className={`inline-block h-4 w-4 transform rounded-full bg-white transition-transform ${
                          notificationsEnabled ? 'translate-x-6' : 'translate-x-1'
                        }`}
                      />
                    </button>
                  </div>

                  {/* Sound Toggle */}
                  <div className="flex items-center justify-between p-4 bg-gray-50 dark:bg-gray-700/50 rounded-lg transition-colors">
                    <div className="flex-1">
                      <h3 className="text-sm font-medium text-gray-900 dark:text-white">{t.settings.notifications_sound}</h3>
                      <p className="text-xs text-gray-600 dark:text-gray-400 mt-1">
                        {t.settings.notifications_sound_hint}
                      </p>
                    </div>
                    <button
                      onClick={() => handleSoundChange(!notificationSoundEnabled)}
                      disabled={updateSettingsMutation.isPending}
                      className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2 dark:focus:ring-offset-gray-800 ${
                        notificationSoundEnabled ? 'bg-blue-600' : 'bg-gray-200 dark:bg-gray-600'
                      } ${updateSettingsMutation.isPending ? 'opacity-50 cursor-not-allowed' : 'cursor-pointer'}`}
                    >
                      <span
                        className={`inline-block h-4 w-4 transform rounded-full bg-white transition-transform ${
                          notificationSoundEnabled ? 'translate-x-6' : 'translate-x-1'
                        }`}
                      />
                    </button>
                  </div>

                  {/* Telegram Notifications */}
                  <div className="p-4 bg-gray-50 dark:bg-gray-700/50 rounded-lg transition-colors">
                    <div className="flex items-center gap-2 mb-2">
                      <svg className="w-4 h-4 text-blue-500" fill="currentColor" viewBox="0 0 24 24">
                        <path d="M12 0C5.373 0 0 5.373 0 12s5.373 12 12 12 12-5.373 12-12S18.627 0 12 0zm5.894 8.221l-1.97 9.28c-.145.658-.537.818-1.084.508l-3-2.21-1.446 1.394c-.14.18-.357.295-.6.295-.002 0-.003 0-.005 0l.213-3.054 5.56-5.022c.24-.213-.054-.334-.373-.121l-6.869 4.326-2.96-.924c-.64-.203-.658-.64.135-.954l11.566-4.458c.538-.196 1.006.128.832.941z"/>
                      </svg>
                      <h3 className="text-sm font-medium text-gray-900 dark:text-white">{t.settings.notifications_telegram}</h3>
                    </div>
                    <p className="text-xs text-gray-600 dark:text-gray-400 mb-3">
                      {t.settings.notifications_telegram_hint}
                    </p>
                    <div className="flex gap-2">
                      <input
                        type="text"
                        value={telegramUserId}
                        onChange={(e) => setTelegramUserId(e.target.value)}
                        placeholder={t.settings.notifications_telegram_user_id_placeholder}
                        className="flex-1 px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-800 text-gray-900 dark:text-white text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 transition-colors"
                        disabled={updateSettingsMutation.isPending}
                      />
                      <button
                        onClick={handleTelegramUserIdSave}
                        disabled={updateSettingsMutation.isPending}
                        className="px-4 py-2 bg-blue-600 hover:bg-blue-700 disabled:bg-gray-400 text-white text-sm font-medium rounded-lg transition-colors focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2 dark:focus:ring-offset-gray-800"
                      >
                        {t.common.save}
                      </button>
                    </div>
                    <p className="text-xs text-gray-500 dark:text-gray-400 mt-2">
                      {t.settings.notifications_telegram_user_id_hint}
                    </p>
                  </div>

                  <p className="text-xs text-gray-500 dark:text-gray-400 mt-4">
                    {t.settings.notifications_permission_hint}
                  </p>
                </div>
              </div>
            </div>
          </div>
      </div>
    </AppLayout>
  );
}