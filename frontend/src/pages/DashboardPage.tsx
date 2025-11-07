import { useAuthStore } from '@/store/auth';
import { useWebSocket, useConnectionStatus } from '@/hooks';
import { clearThemeFromStorage } from '@/contexts/ThemeContext';
import { clearLanguageFromStorage } from '@/lib/i18n/I18nContext';

export default function DashboardPage() {
  const operator = useAuthStore((state) => state.operator);
  const clearAuth = useAuthStore((state) => state.clearAuth);
  const { isConnected, status } = useConnectionStatus();

  // Connect to WebSocket
  useWebSocket();

  const handleLogout = () => {
    // Clear authentication
    clearAuth();

    // Clear user-specific settings from localStorage
    clearThemeFromStorage();
    clearLanguageFromStorage();

    window.location.href = '/login';
  };

  return (
    <div className="min-h-screen bg-gray-50">
      <header className="bg-white shadow">
        <div className="max-w-7xl mx-auto px-4 py-4 sm:px-6 lg:px-8 flex justify-between items-center">
          <div className="flex items-center gap-3">
            <h1 className="text-2xl font-bold">echo Dashboard</h1>
            {/* Connection Status Indicator */}
            <div className="flex items-center gap-2">
              <div
                className={`w-2 h-2 rounded-full ${
                  isConnected ? 'bg-green-500' : status === 'reconnecting' ? 'bg-yellow-500 animate-pulse' : 'bg-red-500'
                }`}
              />
              <span className="text-xs text-gray-500">
                {status === 'connected' ? 'Connected' : status === 'reconnecting' ? 'Reconnecting...' : 'Disconnected'}
              </span>
            </div>
          </div>
          <div className="flex items-center gap-4">
            <span className="text-sm text-gray-600">
              {operator?.email || 'Operator'}
            </span>
            <button
              onClick={handleLogout}
              className="px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700 transition-colors"
            >
              Logout
            </button>
          </div>
        </div>
      </header>

      <main className="max-w-7xl mx-auto px-4 py-8 sm:px-6 lg:px-8">
        <div className="bg-white rounded-lg shadow p-6">
          <h2 className="text-xl font-semibold mb-4">Welcome to echo!</h2>
          <p className="text-gray-600">
            This is a placeholder dashboard. The full UI will be implemented next.
          </p>
          <div className="mt-4 p-4 bg-green-50 border border-green-200 rounded-lg">
            <p className="text-sm text-green-800">
              ✓ Frontend structure created<br />
              ✓ API client configured<br />
              ✓ WebSocket connected with auto-reconnect<br />
              ✓ Authentication working<br />
              ✓ React Query cache invalidation on WS events
            </p>
          </div>
        </div>
      </main>
    </div>
  );
}