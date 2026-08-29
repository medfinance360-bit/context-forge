import type { Folder } from '../../lib/types';
import { supabase } from './client';

export async function fetchFolders(): Promise<Folder[]> {
  const { data, error } = await supabase
    .from('folders')
    .select('*')
    .order('created_at', { ascending: true });
  if (error) throw error;
  return (data ?? []) as Folder[];
}

export async function insertFolder(name: string): Promise<Folder> {
  const { data: { user } } = await supabase.auth.getUser();
  const { data, error } = await supabase
    .from('folders')
    .insert({ name, user_id: user?.id })
    .select()
    .single();
  if (error) throw error;
  return data as Folder;
}

export async function updateFolder(id: string, name: string): Promise<Folder> {
  const { data, error } = await supabase
    .from('folders')
    .update({ name })
    .eq('id', id)
    .select()
    .single();
  if (error) throw error;
  return data as Folder;
}

export async function deleteFolder(id: string): Promise<void> {
  const { error } = await supabase.from('folders').delete().eq('id', id);
  if (error) throw error;
}
