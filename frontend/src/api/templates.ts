import apiClient from './client';
import type { MessageTemplate, CreateTemplateRequest, UpdateTemplateRequest } from '@/types';

export const templatesApi = {
  // Get all templates
  getAll: async () => {
    const { data } = await apiClient.get<MessageTemplate[]>('/templates');
    return data;
  },

  // Get template by ID
  getById: async (id: string) => {
    const { data } = await apiClient.get<MessageTemplate>(`/templates/${id}`);
    return data;
  },

  // Create a new template
  create: async (request: CreateTemplateRequest) => {
    const { data } = await apiClient.post<MessageTemplate>('/templates', request);
    return data;
  },

  // Update a template
  update: async (id: string, request: UpdateTemplateRequest) => {
    const { data } = await apiClient.patch<MessageTemplate>(`/templates/${id}`, request);
    return data;
  },

  // Delete a template
  delete: async (id: string) => {
    await apiClient.delete(`/templates/${id}`);
  },

  // Increment usage count
  incrementUsage: async (id: string) => {
    const { data } = await apiClient.post<MessageTemplate>(`/templates/${id}/use`);
    return data;
  },
};
