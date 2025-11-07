import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { templatesApi } from '@/api/templates';
import type { CreateTemplateRequest, UpdateTemplateRequest } from '@/types';

/**
 * Hook for fetching all templates
 */
export function useTemplates() {
  return useQuery({
    queryKey: ['templates'],
    queryFn: () => templatesApi.getAll(),
    staleTime: 60000, // 1 minute
  });
}

/**
 * Hook for fetching a single template
 */
export function useTemplate(id: string) {
  return useQuery({
    queryKey: ['templates', id],
    queryFn: () => templatesApi.getById(id),
    enabled: !!id,
  });
}

/**
 * Hook for creating a template
 */
export function useCreateTemplate() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (request: CreateTemplateRequest) => templatesApi.create(request),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['templates'] });
    },
  });
}

/**
 * Hook for updating a template
 */
export function useUpdateTemplate() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({ id, request }: { id: string; request: UpdateTemplateRequest }) =>
      templatesApi.update(id, request),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['templates'] });
    },
  });
}

/**
 * Hook for deleting a template
 */
export function useDeleteTemplate() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (id: string) => templatesApi.delete(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['templates'] });
    },
  });
}

/**
 * Hook for incrementing template usage
 */
export function useIncrementTemplateUsage() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (id: string) => templatesApi.incrementUsage(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['templates'] });
    },
  });
}
