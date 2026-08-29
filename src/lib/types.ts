export type PromptColor = 'none' | 'blue' | 'green' | 'yellow' | 'red' | 'purple';

export interface Prompt {
  id: string;
  user_id: string;
  title: string;
  content: string;
  tags: string[];
  color: PromptColor;
  folder_id: string | null;
  is_favorite: boolean;
  created_at: string;
  updated_at: string;
}

export interface Folder {
  id: string;
  user_id: string;
  name: string;
  created_at: string;
  updated_at: string;
}

export type InsertPrompt = Omit<Prompt, 'id' | 'user_id' | 'created_at' | 'updated_at' | 'is_favorite'> & { is_favorite?: boolean };
export type UpdatePrompt = Partial<InsertPrompt>;
