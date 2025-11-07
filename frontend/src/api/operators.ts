import apiClient from './client';
import type { User, UserStats } from '@/types';

export interface UpdateUserProfileRequest {
  name?: string;
}

export interface ChangePasswordRequest {
  current_password: string;
  new_password: string;
}

export interface UpdateSettingsRequest {
  theme?: string;
  language?: string;
  notifications_enabled?: boolean;
  notification_sound_enabled?: boolean;
  telegram_notifications_user_id?: string;
}

export const currentUserApi = {
  // Get current user profile
  getCurrent: async () => {
    const { data } = await apiClient.get<User>('/users/me');
    return data;
  },

  // Get all users
  getAll: async () => {
    const { data } = await apiClient.get<User[]>('/users');
    return data;
  },

  // Get user statistics
  getStats: async () => {
    const { data } = await apiClient.get<UserStats>('/users/stats');
    return data;
  },

  // Update user status
  updateStatus: async (status: 'online' | 'away' | 'offline') => {
    const { data } = await apiClient.patch('/users/me/status', { status });
    return data;
  },

  // Update user profile
  updateProfile: async (request: UpdateUserProfileRequest) => {
    const { data } = await apiClient.patch<User>('/users/me', request);
    return data;
  },

  // Change password
  changePassword: async (request: ChangePasswordRequest) => {
    const { data } = await apiClient.post('/users/me/password', request);
    return data;
  },

  // Update user settings
  updateSettings: async (request: UpdateSettingsRequest) => {
    const { data } = await apiClient.patch<User>('/users/me/settings', request);
    return data;
  },
};
