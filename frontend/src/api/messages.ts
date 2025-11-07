import apiClient from './client';
import type { Message, MessageEdit, MessageListQuery, SearchMessagesQuery, SendMessageRequest } from '@/types';

interface MessageListResponse {
  messages: Message[];
  total: number;
}

export const messagesApi = {
  // Get messages for a conversation with pagination
  getAll: async (params: MessageListQuery): Promise<MessageListResponse> => {
    const { data } = await apiClient.get<MessageListResponse>('/messages', { params });
    return data;
  },

  // Send a message
  send: async (request: SendMessageRequest) => {
    const { data } = await apiClient.post<Message>('/messages/send', request);
    return data;
  },

  // Mark message as read
  markAsRead: async (id: string) => {
    const { data } = await apiClient.patch<Message>(`/messages/${id}/read`);
    return data;
  },

  // Edit a message
  edit: async (id: string, content: string, editReason?: string) => {
    const { data } = await apiClient.patch<Message>(`/messages/${id}/edit`, {
      content,
      edit_reason: editReason,
    });
    return data;
  },

  // Get message edit history
  getHistory: async (id: string) => {
    const { data } = await apiClient.get<MessageEdit[]>(`/messages/${id}/history`);
    return data;
  },

  // Search messages
  search: async (params: SearchMessagesQuery) => {
    const { data } = await apiClient.get<Message[]>('/messages/search', { params });
    return data;
  },
};
