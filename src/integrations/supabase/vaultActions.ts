import { supabase } from './client';

export async function createVaultFolder(name: string): Promise<{ id: string }> {
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) throw new Error('Não autenticado');

  const trimmed = name.trim();
  if (!trimmed) throw new Error('Nome da pasta inválido.');

  const { data, error } = await supabase
    .from('vault_folders')
    .insert({ user_id: user.id, name: trimmed })
    .select('id')
    .single();

  if (error) throw new Error(error.message);
  if (!data?.id) throw new Error('Pasta não criada.');
  return { id: data.id as string };
}

export async function movePackageToFolder(
  packageId: string,
  folderId: string | null,
): Promise<void> {
  const { error } = await supabase
    .from('context_packages')
    .update({ folder_id: folderId })
    .eq('id', packageId);

  if (error) throw new Error(error.message);
}

export async function setPackageFavorite(
  packageId: string,
  isFavorite: boolean,
): Promise<void> {
  const { error } = await supabase
    .from('context_packages')
    .update({ is_favorite: isFavorite })
    .eq('id', packageId);

  if (error) throw new Error(error.message);
}
