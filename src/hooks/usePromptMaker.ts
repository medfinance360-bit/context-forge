import { useState, useCallback } from 'react';
import { supabase } from '../integrations/supabase/client';

export type PromptMakerStatus = 'idle' | 'loading' | 'done' | 'error';

export interface PromptMakerState {
  status: PromptMakerStatus;
  content: string;
  error: string | null;
}

function getEdgeFunctionUrl(name: string): string {
  const url = import.meta.env.VITE_SUPABASE_URL as string;
  return `${url}/functions/v1/${name}`;
}

async function getAuthHeader(): Promise<Record<string, string>> {
  const { data } = await supabase.auth.getSession();
  const token = data.session?.access_token;
  if (!token) throw new Error('Usuário não autenticado');
  return {
    Authorization: `Bearer ${token}`,
    apikey: import.meta.env.VITE_SUPABASE_ANON_KEY as string,
  };
}

export function usePromptMaker() {
  const [state, setState] = useState<PromptMakerState>({
    status: 'idle',
    content: '',
    error: null,
  });

  const generate = useCallback(async (userInput: string) => {
    setState({ status: 'loading', content: '', error: null });
    try {
      const headers = await getAuthHeader();
      const res = await fetch(getEdgeFunctionUrl('prompt-maker'), {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', ...headers },
        body: JSON.stringify({ user_input: userInput }),
      });

      if (!res.ok) {
        const err = await res.text();
        throw new Error(`prompt-maker: ${err}`);
      }

      const json = await res.json();
      const content: string = json.content ?? '';
      setState({ status: 'done', content, error: null });
      return content;
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Erro desconhecido';
      setState({ status: 'error', content: '', error: message });
      return null;
    }
  }, []);

  const reset = useCallback(() => {
    setState({ status: 'idle', content: '', error: null });
  }, []);

  return { state, generate, reset };
}
