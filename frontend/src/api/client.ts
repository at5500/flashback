import axios, { type AxiosInstance, type InternalAxiosRequestConfig } from 'axios';
import { useAuthStore } from '@/store/auth';
import { clearThemeFromStorage } from '@/contexts/ThemeContext';
import { clearLanguageFromStorage } from '@/lib/i18n/I18nContext';

// Create axios instance
const apiClient: AxiosInstance = axios.create({
  baseURL: '/api',
  headers: {
    'Content-Type': 'application/json',
  },
});

// Request interceptor to add auth token
apiClient.interceptors.request.use(
  (config: InternalAxiosRequestConfig) => {
    const token = localStorage.getItem('auth_token');
    console.log('[API CLIENT] Request interceptor:', {
      url: config.url,
      hasToken: !!token,
      token: token ? `${token.substring(0, 20)}...` : null,
    });
    if (token && config.headers) {
      config.headers.Authorization = `Bearer ${token}`;
    }
    return config;
  },
  (error) => {
    console.error('[API CLIENT] Request error:', error);
    return Promise.reject(error);
  }
);

// Response interceptor to handle errors
apiClient.interceptors.response.use(
  (response) => {
    console.log('[API CLIENT] Response:', {
      url: response.config.url,
      status: response.status,
    });
    return response;
  },
  (error) => {
    console.error('[API CLIENT] Response error:', {
      url: error.config?.url,
      status: error.response?.status,
      message: error.message,
    });

    if (error.response?.status === 401) {
      console.warn('[API CLIENT] 401 Unauthorized - clearing auth and redirecting to login');
      // Clear auth state (this also clears localStorage)
      // IMPORTANT: This prevents the infinite redirect loop when page reloads
      // by synchronizing both zustand store and localStorage
      useAuthStore.getState().clearAuth();

      // Clear user-specific settings from localStorage
      clearThemeFromStorage();
      clearLanguageFromStorage();

      // Only redirect if not already on login page
      if (!window.location.pathname.includes('/login')) {
        console.log('[API CLIENT] Redirecting to /login');
        window.location.href = '/login';
      }
    }
    return Promise.reject(error);
  }
);

export default apiClient;
