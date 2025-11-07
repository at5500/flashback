import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { currentUserApi, UpdateUserProfileRequest, ChangePasswordRequest, UpdateSettingsRequest } from '@/api/operators';
import { useAuthStore } from '@/store/auth';

/**
 * Hook for fetching current user profile
 */
export function useCurrentUser() {
  return useQuery({
    queryKey: ['users', 'me'],
    queryFn: () => currentUserApi.getCurrent(),
    staleTime: 300000, // 5 minutes
    retry: false, // Don't retry on error - let axios interceptor handle 401
  });
}

/**
 * Hook for fetching all users
 */
export function useUsers() {
  return useQuery({
    queryKey: ['users'],
    queryFn: () => currentUserApi.getAll(),
    staleTime: 60000, // 1 minute
  });
}

/**
 * Hook for fetching user statistics
 */
export function useUserStats() {
  return useQuery({
    queryKey: ['users', 'stats'],
    queryFn: () => currentUserApi.getStats(),
    refetchInterval: 60000, // Refetch every minute
  });
}

/**
 * Hook for updating user status
 */
export function useUpdateUserStatus() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (status: 'online' | 'away' | 'offline') =>
      currentUserApi.updateStatus(status),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['users'] });
    },
  });
}

/**
 * Hook for updating user profile
 */
export function useUpdateUserProfile() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (request: UpdateUserProfileRequest) =>
      currentUserApi.updateProfile(request),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['users', 'me'] });
    },
  });
}

/**
 * Hook for changing user password
 */
export function useChangePassword() {
  return useMutation({
    mutationFn: (request: ChangePasswordRequest) =>
      currentUserApi.changePassword(request),
  });
}

/**
 * Hook for updating user settings
 */
export function useUpdateSettings() {
  const queryClient = useQueryClient();
  const { token, setAuth } = useAuthStore();

  return useMutation({
    mutationFn: (request: UpdateSettingsRequest) =>
      currentUserApi.updateSettings(request),
    onSuccess: (updatedUser) => {
      console.log('[useCurrentUser] Settings updated successfully:', {
        hasSettings: !!updatedUser.settings,
        settingsLanguage: updatedUser.settings?.language,
        settingsObject: updatedUser.settings,
      });

      // Update auth store with the updated user data
      if (token) {
        console.log('[useCurrentUser] Calling setAuth with updated user');
        setAuth(token, updatedUser);
      }
      // Also invalidate React Query cache
      queryClient.invalidateQueries({ queryKey: ['users', 'me'] });
    },
  });
}