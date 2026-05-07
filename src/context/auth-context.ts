import { createContext } from 'react';
import type { User } from '@supabase/supabase-js';

export interface AuthState {
  user: User | null;
  loading: boolean;
  refreshSession: () => Promise<void>;
}

export const AuthContext = createContext<AuthState | null>(null);
