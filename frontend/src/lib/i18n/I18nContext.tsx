import { createContext, useContext, ReactNode, useState, useEffect } from 'react';
import type { Language, Translations } from './types';
import { useAuthStore } from '@/store/auth';
import ruTranslations from '@locales/frontend/ru.json';
import enTranslations from '@locales/frontend/en.json';

interface I18nContextValue {
  language: Language;
  t: Translations;
  setLanguage: (lang: Language) => void;
}

const I18nContext = createContext<I18nContextValue | undefined>(undefined);

const translations: Record<Language, Translations> = {
  ru: ruTranslations as Translations,
  en: enTranslations as Translations,
};

const LANGUAGE_STORAGE_KEY = 'flashback-language';

// Helper to load language from localStorage
function loadLanguageFromStorage(): Language {
  try {
    const stored = localStorage.getItem(LANGUAGE_STORAGE_KEY);
    if (stored === 'ru' || stored === 'en') {
      return stored;
    }
  } catch (e) {
    console.error('[I18N] Failed to load language from localStorage:', e);
  }
  return 'ru'; // Default to Russian
}

// Helper to save language to localStorage
function saveLanguageToStorage(language: Language) {
  try {
    localStorage.setItem(LANGUAGE_STORAGE_KEY, language);
  } catch (e) {
    console.error('[I18N] Failed to save language to localStorage:', e);
  }
}

// Helper to clear language from localStorage (on logout)
export function clearLanguageFromStorage() {
  try {
    localStorage.removeItem(LANGUAGE_STORAGE_KEY);
  } catch (e) {
    console.error('[I18N] Failed to clear language from localStorage:', e);
  }
}

export function I18nProvider({ children }: { children: ReactNode }) {
  // Subscribe to specific user fields to ensure re-render on change
  const userId = useAuthStore((state) => state.user?.id);
  const userLanguage = useAuthStore((state) => state.user?.settings?.language);

  // Initialize language from localStorage for fast initial render
  const [language, setLanguageState] = useState<Language>(() => {
    const savedLanguage = loadLanguageFromStorage();
    return savedLanguage;
  });

  // Sync language from user settings when they change (e.g., on login or settings update)
  useEffect(() => {
    if (userLanguage) {
      const newLanguage = userLanguage as Language;
      setLanguageState(newLanguage);
      saveLanguageToStorage(newLanguage);
    } else if (userId && !userLanguage) {
      // User logged in but has no language setting - use default and clear localStorage
      clearLanguageFromStorage();
      setLanguageState('ru');
    }
  }, [userId, userLanguage]);

  const setLanguage = (lang: Language) => {
    setLanguageState(lang);
    saveLanguageToStorage(lang);
  };

  const value: I18nContextValue = {
    language,
    t: translations[language],
    setLanguage,
  };

  return <I18nContext.Provider value={value}>{children}</I18nContext.Provider>;
}

export function useTranslation() {
  const context = useContext(I18nContext);
  if (!context) {
    throw new Error('useTranslation must be used within I18nProvider');
  }
  return context;
}