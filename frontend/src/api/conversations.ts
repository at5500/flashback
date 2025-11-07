import apiClient from './client';
import type { Conversation, ConversationListQuery } from '@/types';

interface ConversationListResponse {
  conversations: Conversation[];
  total: number;
}

export const conversationsApi = {
  // Get all conversations with optional filters
  getAll: async (params?: ConversationListQuery): Promise<ConversationListResponse> => {
    const { data } = await apiClient.get<ConversationListResponse>('/conversations', { params });
    return data;
  },

  // Get single conversation by ID
  getById: async (id: string) => {
    const { data } = await apiClient.get<Conversation>(`/conversations/${id}`);
    return data;
  },

  // Assign conversation to user
  assign: async (id: string, userId: string) => {
    const { data } = await apiClient.patch<Conversation>(`/conversations/${id}/assign`, {
      user_id: userId,
    });
    return data;
  },

  // Update conversation status
  updateStatus: async (id: string, status: 'waiting' | 'active' | 'closed') => {
    const { data} = await apiClient.patch<Conversation>(`/conversations/${id}/status`, {
      status,
    });
    return data;
  },

  // Close conversation
  close: async (id: string) => {
    const { data } = await apiClient.patch<Conversation>(`/conversations/${id}/close`);
    return data;
  },

  // Mark conversation as read
  markAsRead: async (id: string) => {
    const { data } = await apiClient.patch<Conversation>(`/conversations/${id}/mark-read`);
    return data;
  },

  // Delete conversation
  delete: async (id: string) => {
    console.log('[conversationsApi] Sending DELETE request for:', id);
    try {
      const { data } = await apiClient.delete(`/conversations/${id}`);
      console.log('[conversationsApi] DELETE response:', data);
      return data;
    } catch (error) {
      console.error('[conversationsApi] DELETE error:', error);
      throw error;
    }
  },

  // Export conversation
  export: async (id: string, format: 'json' | 'csv' | 'txt' = 'json') => {
    const { data } = await apiClient.get(`/conversations/${id}/export`, {
      params: { format },
      responseType: format === 'json' ? 'json' : 'text',
    });
    return data;
  },
};
