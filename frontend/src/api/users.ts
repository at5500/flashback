import apiClient from './client';
import type { User } from '@/types';

export interface CreateUserRequest {
  email: string;
  name: string;
  password: string;
  is_operator: boolean;
  is_admin: boolean;
}

export interface UpdateUserRequest {
  name?: string;
  email?: string;
  is_operator?: boolean;
  is_admin?: boolean;
  is_active?: boolean;
}

export interface UserListResponse {
  users: User[];
  total: number;
}

export const usersApi = {
  // Get all users (admin only)
  getAll: async () => {
    const { data } = await apiClient.get<UserListResponse>('/admin/users');
    return data;
  },

  // Create new user (admin only)
  create: async (request: CreateUserRequest) => {
    const { data } = await apiClient.post<User>('/admin/users', request);
    return data;
  },

  // Update user (admin only)
  update: async (id: string, request: UpdateUserRequest) => {
    const { data } = await apiClient.patch<User>(`/admin/users/${id}`, request);
    return data;
  },

  // Delete user (admin only)
  delete: async (id: string) => {
    const { data } = await apiClient.delete(`/admin/users/${id}`);
    return data;
  },

  // Toggle user active status (admin only)
  toggleActive: async (id: string) => {
    const { data } = await apiClient.patch<User>(`/admin/users/${id}/toggle-active`);
    return data;
  },

  // Toggle operator privileges (admin only)
  toggleOperator: async (id: string) => {
    const { data } = await apiClient.patch<User>(`/admin/users/${id}/toggle-operator`);
    return data;
  },

  // Toggle admin privileges (admin only)
  toggleAdmin: async (id: string) => {
    const { data} = await apiClient.patch<User>(`/admin/users/${id}/toggle-admin`);
    return data;
  },
};