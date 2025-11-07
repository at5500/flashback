import { create } from 'zustand';
import type { User } from '@/types';
import { clearThemeFromStorage } from '@/contexts/ThemeContext';
import { clearLanguageFromStorage } from '@/lib/i18n/I18nContext';

interface AuthState {
  token: string | null;
  user: User | null;
  isAuthenticated: boolean;
  setAuth: (token: string, user: User) => void;
  clearAuth: () => void;
  // Backward compatibility
  operator: User | null;
}

// Helper functions for localStorage
const saveToLocalStorage = (token: string, user: User) => {
  localStorage.setItem('auth_token', token);
  localStorage.setItem('auth_user', JSON.stringify(user));
};

const loadFromLocalStorage = (): { token: string; user: User } | null => {
  const token = localStorage.getItem('auth_token');
  const userStr = localStorage.getItem('auth_user');

  if (token && userStr) {
    try {
      const user = JSON.parse(userStr);
      return { token, user };
    } catch (e) {
      console.error('[AUTH STORE] Failed to parse stored user:', e);
      return null;
    }
  }
  return null;
};

const clearLocalStorage = () => {
  localStorage.removeItem('auth_token');
  localStorage.removeItem('auth_user');
  // Clean up old persist storage if it exists
  localStorage.removeItem('flashback-auth');
  localStorage.removeItem('echo-auth');
};

export const useAuthStore = create<AuthState>()((set, get) => ({
  token: null,
  user: null,
  isAuthenticated: false,

  // Backward compatibility getter
  get operator() {
    return get().user;
  },

  setAuth: (token, user) => {
    console.log('[AUTH STORE] setAuth called:', {
      hasToken: !!token,
      tokenPreview: token ? `${token.substring(0, 20)}...` : null,
      userEmail: user.email,
    });

    // Clear previous user's settings from localStorage before setting new auth
    clearThemeFromStorage();
    clearLanguageFromStorage();

    // Save to localStorage
    saveToLocalStorage(token, user);

    // Update Zustand state - this will trigger useEffect in ThemeContext and I18nContext
    set({ token, user, isAuthenticated: true });

    console.log('[AUTH STORE] Auth saved to localStorage');
  },

  clearAuth: () => {
    console.log('[AUTH STORE] clearAuth called');

    // Clear localStorage for auth
    clearLocalStorage();

    // Clear user-specific settings from localStorage
    clearThemeFromStorage();
    clearLanguageFromStorage();

    // Clear Zustand state
    set({ token: null, user: null, isAuthenticated: false });

    console.log('[AUTH STORE] Auth and settings cleared from localStorage');
  },
}));

// Initialize auth state from localStorage on app start
if (typeof window !== 'undefined') {
  const stored = loadFromLocalStorage();

  if (stored) {
    console.log('[AUTH STORE] Restoring auth from localStorage:', {
      hasToken: !!stored.token,
      userEmail: stored.user.email,
      hasSettings: !!stored.user.settings,
      settingsLanguage: stored.user.settings?.language,
      settingsObject: stored.user.settings,
    });

    useAuthStore.setState({
      token: stored.token,
      user: stored.user,
      isAuthenticated: true,
    });

    console.log('[AUTH STORE] State after restoration:', {
      hasUser: !!useAuthStore.getState().user,
      userSettings: useAuthStore.getState().user?.settings,
    });
  } else {
    console.log('[AUTH STORE] No stored auth found');
  }
}
