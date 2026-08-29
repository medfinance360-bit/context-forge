import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { toast } from 'sonner';
import { fetchFolders, insertFolder, updateFolder, deleteFolder } from '../integrations/supabase/folders';

export function useFolders() {
  return useQuery({
    queryKey: ['folders'],
    queryFn: fetchFolders,
  });
}

export function useInsertFolder() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (name: string) => insertFolder(name),
    onSuccess: () => void qc.invalidateQueries({ queryKey: ['folders'] }),
    onError: (e) => toast.error(e instanceof Error ? e.message : 'Erro ao criar pasta.'),
  });
}

export function useUpdateFolder() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ id, name }: { id: string; name: string }) => updateFolder(id, name),
    onSuccess: () => void qc.invalidateQueries({ queryKey: ['folders'] }),
    onError: (e) => toast.error(e instanceof Error ? e.message : 'Erro ao renomear pasta.'),
  });
}

export function useDeleteFolder() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (id: string) => deleteFolder(id),
    onSuccess: () => {
      void qc.invalidateQueries({ queryKey: ['folders'] });
      void qc.invalidateQueries({ queryKey: ['prompts'] });
      toast.success('Pasta excluída.');
    },
    onError: (e) => toast.error(e instanceof Error ? e.message : 'Erro ao excluir pasta.'),
  });
}
