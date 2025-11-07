import { createContext, useContext, useState, useEffect, ReactNode } from 'react';
import { useAuthStore } from '@/store/auth';

type Theme = 'light' | 'dark';

interface ThemeContextType {
  theme: Theme;
  setTheme: (theme: Theme) => void;
}

const ThemeContext = createContext<ThemeContextType | undefined>(undefined);

const THEME_STORAGE_KEY = 'flashback-theme';

// Helper to apply theme to DOM
function applyThemeToDOM(newTheme: Theme) {
  const root = document.documentElement;
  if (newTheme === 'dark') {
    root.classList.add('dark');
  } else {
    root.classList.remove('dark');
  }
}

// Helper to load theme from localStorage
function loadThemeFromStorage(): Theme {
  try {
    const stored = localStorage.getItem(THEME_STORAGE_KEY);
    if (stored === 'dark' || stored === 'light') {
      return stored;
    }
  } catch (e) {
    console.error('Failed to load theme from localStorage:', e);
  }
  return 'light'; // Default to light theme
}

// Helper to save theme to localStorage
function saveThemeToStorage(theme: Theme) {
  try {
    localStorage.setItem(THEME_STORAGE_KEY, theme);
  } catch (e) {
    console.error('Failed to save theme to localStorage:', e);
  }
}

// Helper to clear theme from localStorage (on logout)
export function clearThemeFromStorage() {
  try {
    localStorage.removeItem(THEME_STORAGE_KEY);
  } catch (e) {
    console.error('Failed to clear theme from localStorage:', e);
  }
}

export function ThemeProvider({ children }: { children: ReactNode }) {
  // Subscribe to specific user fields to ensure re-render on change
  const userId = useAuthStore((state) => state.user?.id);
  const userTheme = useAuthStore((state) => state.user?.settings?.theme);

  // Initialize theme from localStorage for fast initial render
  const [theme, setThemeState] = useState<Theme>(() => {
    const savedTheme = loadThemeFromStorage();
    applyThemeToDOM(savedTheme);
    return savedTheme;
  });

  // Sync theme from user settings when they change (e.g., on login or settings update)
  useEffect(() => {
    if (userTheme) {
      const newTheme = userTheme as Theme;
      setThemeState(newTheme);
      applyThemeToDOM(newTheme);
      saveThemeToStorage(newTheme);
    } else if (userId && !userTheme) {
      // User logged in but has no theme setting - use default and clear localStorage
      clearThemeFromStorage();
      setThemeState('light');
      applyThemeToDOM('light');
    }
  }, [userId, userTheme]);

  const setTheme = (newTheme: Theme) => {
    setThemeState(newTheme);
    applyThemeToDOM(newTheme);
    saveThemeToStorage(newTheme);
  };

  return (
    <ThemeContext.Provider value={{ theme, setTheme }}>
      {children}
    </ThemeContext.Provider>
  );
}

export function useTheme() {
  const context = useContext(ThemeContext);
  if (context === undefined) {
    throw new Error('useTheme must be used within a ThemeProvider');
  }
  return context;
}