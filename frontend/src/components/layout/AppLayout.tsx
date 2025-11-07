import { ReactNode } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useAuthStore } from '@/store/auth';
import { useConnectionStatus, useUnreadCount, useBotStatus } from '@/hooks';
import { Dropdown, DropdownItem, DropdownDivider } from '@/components/common';
import { NotificationsDropdown } from './NotificationsDropdown';
import { useTranslation } from '@/lib/i18n';
import { clearThemeFromStorage } from '@/contexts/ThemeContext';
import { clearLanguageFromStorage } from '@/lib/i18n/I18nContext';

interface AppLayoutProps {
  children: ReactNode;
}

export function AppLayout({ children }: AppLayoutProps) {
  const navigate = useNavigate();
  const { t } = useTranslation();
  const user = useAuthStore((state) => state.user);
  const clearAuth = useAuthStore((state) => state.clearAuth);
  const { isConnected, status } = useConnectionStatus();
  const { status: botStatus, isConnected: botIsConnected } = useBotStatus();
  const { unreadCount } = useUnreadCount();

  const handleLogout = () => {
    // Clear authentication
    clearAuth();

    // Clear user-specific settings from localStorage
    clearThemeFromStorage();
    clearLanguageFromStorage();

    // Navigate to login
    navigate('/login');
  };

  const handleProfile = () => {
    navigate('/profile');
  };

  const handleSettings = () => {
    navigate('/settings');
  };

  const handleTemplates = () => {
    navigate('/templates');
  };

  const handleAdmin = () => {
    navigate('/admin');
  };

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-900 flex flex-col transition-colors">
      {/* Header */}
      <header className="bg-white dark:bg-gray-800 shadow-sm border-b border-gray-200 dark:border-gray-700 flex-shrink-0 sticky top-0 z-40 transition-colors">
        <div className="max-w-7xl mx-auto px-4 py-3 sm:px-6 lg:px-8">
          <div className="flex justify-between items-center">
            {/* Left: Logo + Title + Status */}
            <div className="flex items-center gap-3">
              <Link to="/" className="flex items-center gap-3 hover:opacity-80 transition-opacity">
                <img
                  src="/assets/logo.png"
                  alt="FlashBack Logo"
                  className="w-8 h-8 sm:w-10 sm:h-10"
                />
                <h1 className="text-xl sm:text-2xl font-bold text-gray-900 dark:text-white transition-colors">
                  FlashBack
                </h1>
              </Link>

              {/* Connection Status Indicators */}
              <div className="flex items-center gap-4">
                {/* WebSocket Status */}
                <div className="flex items-center gap-2" title={`WebSocket: ${status}`}>
                  <svg className="w-4 h-4 text-gray-500 dark:text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 10V3L4 14h7v7l9-11h-7z" />
                  </svg>
                  <div
                    className={`w-2 h-2 rounded-full ${
                      isConnected
                        ? 'bg-green-500'
                        : status === 'reconnecting'
                        ? 'bg-yellow-500 animate-pulse'
                        : 'bg-red-500'
                    }`}
                  />
                  <span className="text-xs text-gray-500 dark:text-gray-400 hidden lg:inline transition-colors">
                    WS
                  </span>
                </div>

                {/* Telegram Bot Status */}
                <div className="flex items-center gap-2" title={`Telegram Bot: ${botStatus}`}>
                  <svg className="w-4 h-4 text-gray-500 dark:text-gray-400" fill="currentColor" viewBox="0 0 24 24">
                    <path d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm4.64 6.8c-.15 1.58-.8 5.42-1.13 7.19-.14.75-.42 1-.68 1.03-.58.05-1.02-.38-1.58-.75-.88-.58-1.38-.94-2.23-1.5-.99-.65-.35-1.01.22-1.59.15-.15 2.71-2.48 2.76-2.69a.2.2 0 00-.05-.18c-.06-.05-.14-.03-.21-.02-.09.02-1.49.95-4.22 2.79-.4.27-.76.41-1.08.4-.36-.01-1.04-.2-1.55-.37-.63-.2-1.12-.31-1.08-.66.02-.18.27-.36.74-.55 2.92-1.27 4.86-2.11 5.83-2.51 2.78-1.16 3.35-1.36 3.73-1.36.08 0 .27.02.39.12.1.08.13.19.14.27-.01.06.01.24 0 .38z"/>
                  </svg>
                  <div
                    className={`w-2 h-2 rounded-full ${
                      botIsConnected
                        ? 'bg-green-500'
                        : botStatus === 'connecting'
                        ? 'bg-yellow-500 animate-pulse'
                        : botStatus === 'error'
                        ? 'bg-red-500'
                        : 'bg-gray-400'
                    }`}
                  />
                  <span className="text-xs text-gray-500 dark:text-gray-400 hidden lg:inline transition-colors">
                    Bot
                  </span>
                </div>
              </div>
            </div>

            {/* Right: Notifications + Profile */}
            <div className="flex items-center gap-3">
              {/* Notifications Dropdown */}
              <NotificationsDropdown unreadCount={unreadCount} />

              {/* Profile Dropdown */}
              <Dropdown
                trigger={
                  <div className="flex items-center gap-2 p-2 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-700 transition-colors">
                    <div className="w-8 h-8 rounded-full bg-blue-500 dark:bg-blue-600 text-white flex items-center justify-center font-semibold text-sm">
                      {user?.email?.[0].toUpperCase() || 'U'}
                    </div>
                    <span className="text-sm text-gray-700 dark:text-gray-300 hidden md:inline max-w-[150px] truncate transition-colors">
                      {user?.email || 'User'}
                    </span>
                    <svg className="w-4 h-4 text-gray-500 dark:text-gray-400 hidden md:inline transition-colors" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                    </svg>
                  </div>
                }
              >
                <div className="px-4 py-3 border-b border-gray-200 dark:border-gray-700">
                  <p className="text-sm font-medium text-gray-900 dark:text-white">{user?.name || 'User'}</p>
                  <p className="text-xs text-gray-500 dark:text-gray-400 truncate">{user?.email}</p>
                </div>

                <DropdownItem
                  icon={
                    <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
                    </svg>
                  }
                  onClick={handleProfile}
                >
                  {t.menu.profile}
                </DropdownItem>

                <DropdownItem
                  icon={
                    <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.065 2.572c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.572 1.065c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.065-2.572c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065z" />
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
                    </svg>
                  }
                  onClick={handleSettings}
                >
                  {t.menu.settings}
                </DropdownItem>

                <DropdownItem
                  icon={
                    <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                    </svg>
                  }
                  onClick={handleTemplates}
                >
                  {t.menu.templates}
                </DropdownItem>

                {user?.is_admin && (
                  <DropdownItem
                    icon={
                      <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4.354a4 4 0 110 5.292M15 21H3v-1a6 6 0 0112 0v1zm0 0h6v-1a6 6 0 00-9-5.197M13 7a4 4 0 11-8 0 4 4 0 018 0z" />
                      </svg>
                    }
                    onClick={handleAdmin}
                  >
                    {t.menu.admin}
                  </DropdownItem>
                )}

                <DropdownDivider />

                <DropdownItem
                  icon={
                    <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 16l4-4m0 0l-4-4m4 4H7m6 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h4a3 3 0 013 3v1" />
                    </svg>
                  }
                  onClick={handleLogout}
                  danger
                >
                  {t.menu.logout}
                </DropdownItem>
              </Dropdown>
            </div>
          </div>
        </div>
      </header>

      {/* Main Content */}
      <main className="flex-1 flex flex-col overflow-hidden">
        {children}
      </main>
    </div>
  );
}
