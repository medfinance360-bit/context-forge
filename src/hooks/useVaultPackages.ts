import { useQuery } from '@tanstack/react-query';
import { supabase } from '../integrations/supabase/client';
import { useAuth } from './useAuth';

export interface VaultPackageRow {
  id: string;
  user_id: string;
  raw_input: string;
  intent_json: unknown;
  package_json: unknown;
  validation_json: unknown;
  target_platform: string;
  task_type: string;
  created_at: string;
  folder_id: string | null;
  is_favorite: boolean;
}

export function useVaultPackages() {
  const { user } = useAuth();

  return useQuery({
    queryKey: ['vault-packages', user?.id],
    enabled: !!user,
    queryFn: async () => {
      if (!user) throw new Error('Não autenticado');
      const { data, error } = await supabase
        .from('context_packages')
        .select('*')
        .eq('user_id', user.id)
        .order('created_at', { ascending: false });

      if (error) throw error;
      return (data ?? []).map((r) => ({
        ...(r as VaultPackageRow),
        folder_id: (r as { folder_id?: string | null }).folder_id ?? null,
        is_favorite: Boolean((r as { is_favorite?: boolean }).is_favorite),
      }));
    },
  });
}
