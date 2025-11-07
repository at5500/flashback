import apiClient from './client';
import type { LoginRequest, LoginResponse, User } from '@/types';

export const authApi = {
  // Login
  login: async (credentials: LoginRequest) => {
    const { data } = await apiClient.post<LoginResponse>('/auth/login', credentials);
    // Token storage is handled by auth store's setAuth() method
    return data;
  },

  // Get current user
  me: async () => {
    const { data } = await apiClient.get<User>('/auth/me');
    return data;
  },

  // Logout (cleanup is handled by clearAuth() in store)
  logout: () => {
    // Token cleanup is now handled by clearAuth() in the auth store
    // This method is kept for API consistency
  },
};
