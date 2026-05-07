import { useQuery } from '@tanstack/react-query';
import { supabase } from '../integrations/supabase/client';
import { useAuth } from './useAuth';

export interface VaultFolderRow {
  id: string;
  user_id: string;
  name: string;
  created_at: string;
}

export function useVaultFolders() {
  const { user } = useAuth();

  return useQuery({
    queryKey: ['vault-folders', user?.id],
    enabled: !!user,
    queryFn: async () => {
      if (!user) throw new Error('Não autenticado');
      const { data, error } = await supabase
        .from('vault_folders')
        .select('*')
        .eq('user_id', user.id)
        .order('created_at', { ascending: false });

      if (error) throw error;
      return (data ?? []) as VaultFolderRow[];
    },
  });
}
