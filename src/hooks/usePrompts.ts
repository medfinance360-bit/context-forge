import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { toast } from 'sonner';
import type { InsertPrompt, UpdatePrompt } from '../lib/types';
import {
  fetchPrompts,
  fetchAllPrompts,
  insertPrompt,
  updatePrompt,
  deletePrompt,
  toggleFavorite,
} from '../integrations/supabase/prompts';

export function usePrompts(folderId?: string | null, favoritesOnly = false) {
  return useQuery({
    queryKey: ['prompts', folderId, favoritesOnly],
    queryFn: () => fetchPrompts(folderId, favoritesOnly),
  });
}

export function useAllPrompts() {
  return useQuery({
    queryKey: ['prompts-all'],
    queryFn: fetchAllPrompts,
  });
}

export function useInsertPrompt() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (payload: InsertPrompt) => insertPrompt(payload),
    onSuccess: () => {
      void qc.invalidateQueries({ queryKey: ['prompts'] });
      void qc.invalidateQueries({ queryKey: ['prompts-all'] });
    },
    onError: (e) => toast.error(e instanceof Error ? e.message : 'Erro ao salvar.'),
  });
}

export function useUpdatePrompt() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ id, payload }: { id: string; payload: UpdatePrompt }) =>
      updatePrompt(id, payload),
    onSuccess: () => {
      void qc.invalidateQueries({ queryKey: ['prompts'] });
      void qc.invalidateQueries({ queryKey: ['prompts-all'] });
    },
    onError: (e) => toast.error(e instanceof Error ? e.message : 'Erro ao atualizar.'),
  });
}

export function useDeletePrompt() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (id: string) => deletePrompt(id),
    onSuccess: () => {
      void qc.invalidateQueries({ queryKey: ['prompts'] });
      void qc.invalidateQueries({ queryKey: ['prompts-all'] });
      toast.success('Prompt excluído.');
    },
    onError: (e) => toast.error(e instanceof Error ? e.message : 'Erro ao excluir.'),
  });
}

export function useToggleFavorite() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ id, isFavorite }: { id: string; isFavorite: boolean }) =>
      toggleFavorite(id, isFavorite),
    onSuccess: () => {
      void qc.invalidateQueries({ queryKey: ['prompts'] });
      void qc.invalidateQueries({ queryKey: ['prompts-all'] });
    },
  });
}
