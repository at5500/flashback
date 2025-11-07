import apiClient from './client';

export interface SystemSettings {
  telegram_bot_token?: string;
}

export interface BotStatus {
  status: 'disconnected' | 'connecting' | 'connected' | 'error';
}

export const settingsApi = {
  getSettings: async (): Promise<SystemSettings> => {
    const response = await apiClient.get('/admin/settings');
    return response.data;
  },

  updateSettings: async (settings: SystemSettings): Promise<SystemSettings> => {
    const response = await apiClient.put('/admin/settings', settings);
    return response.data;
  },

  getBotStatus: async (): Promise<BotStatus> => {
    const response = await apiClient.get('/bot/status');
    return response.data;
  },
};