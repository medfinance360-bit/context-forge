import type { Prompt, InsertPrompt, UpdatePrompt } from '../../lib/types';
import { supabase } from './client';

export async function fetchPrompts(folderId?: string | null, favoritesOnly = false): Promise<Prompt[]> {
  let q = supabase
    .from('prompts')
    .select('*')
    .order('created_at', { ascending: false });

  if (favoritesOnly) {
    q = q.eq('is_favorite', true);
  } else if (folderId === null) {
    q = q.is('folder_id', null);
  } else if (folderId) {
    q = q.eq('folder_id', folderId);
  }

  const { data, error } = await q;
  if (error) throw error;
  return (data ?? []) as Prompt[];
}

export async function fetchAllPrompts(): Promise<Prompt[]> {
  const { data, error } = await supabase
    .from('prompts')
    .select('*')
    .order('created_at', { ascending: false });
  if (error) throw error;
  return (data ?? []) as Prompt[];
}

export async function insertPrompt(payload: InsertPrompt): Promise<Prompt> {
  const { data, error } = await supabase
    .from('prompts')
    .insert(payload)
    .select()
    .single();
  if (error) throw error;
  return data as Prompt;
}

export async function updatePrompt(id: string, payload: UpdatePrompt): Promise<Prompt> {
  const { data, error } = await supabase
    .from('prompts')
    .update(payload)
    .eq('id', id)
    .select()
    .single();
  if (error) throw error;
  return data as Prompt;
}

export async function deletePrompt(id: string): Promise<void> {
  const { error } = await supabase.from('prompts').delete().eq('id', id);
  if (error) throw error;
}

export async function toggleFavorite(id: string, isFavorite: boolean): Promise<void> {
  const { error } = await supabase
    .from('prompts')
    .update({ is_favorite: isFavorite })
    .eq('id', id);
  if (error) throw error;
}
