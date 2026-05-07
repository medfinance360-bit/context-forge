import { useRef, useState, useCallback } from 'react';

export type StreamPhase =
  | 'idle'
  | 'connecting'
  | 'streaming'
  | 'done'
  | 'error'
  | 'cancelled';

interface UseSSEStreamOptions {
  onChunk?: (chunk: string) => void;
  onDone?: (full: string) => void;
  onError?: (err: string) => void;
}

export function useSSEStream(options: UseSSEStreamOptions = {}) {
  const [phase, setPhase]           = useState<StreamPhase>('idle');
  const [streamingText, setStreaming] = useState('');
  const [error, setError]           = useState<string | null>(null);
  const abortRef                    = useRef<AbortController | null>(null);
  const bufferRef                   = useRef('');

  const start = useCallback(
    async (url: string, body: Record<string, unknown>, headers: Record<string, string> = {}) => {
      // Cancela stream anterior se ainda ativo
      abortRef.current?.abort();
      bufferRef.current = '';
      setStreaming('');
      setError(null);
      setPhase('connecting');

      const controller = new AbortController();
      abortRef.current = controller;

      try {
        const res = await fetch(url, {
          method:  'POST',
          headers: { 'Content-Type': 'application/json', ...headers },
          body:    JSON.stringify({ ...body, stream: true }),
          signal:  controller.signal,
        });

        if (!res.ok) {
          const text = await res.text();
          throw new Error(`HTTP ${res.status}: ${text}`);
        }

        if (!res.body) throw new Error('Response body is null');

        setPhase('streaming');
        const reader  = res.body.getReader();
        const decoder = new TextDecoder();

        while (true) {
          const { done, value } = await reader.read();
          if (done) break;

          const raw = decoder.decode(value, { stream: true });

          // Parseia SSE linha por linha
          for (const line of raw.split('\n')) {
            if (!line.startsWith('data: ')) continue;
            const payload = line.slice(6).trim();
            if (payload === '[DONE]') break;

            try {
              const parsed = JSON.parse(payload);
              const delta: string =
                parsed?.choices?.[0]?.delta?.content ?? '';
              if (!delta) continue;

              bufferRef.current += delta;
              setStreaming(bufferRef.current);
              options.onChunk?.(delta);
            } catch {
              // chunk SSE não-JSON (ex: eventos tipados do pipeline) — ignora aqui,
              // o orchestrator processa separado
            }
          }
        }

        setPhase('done');
        options.onDone?.(bufferRef.current);
      } catch (err: unknown) {
        if ((err as { name?: string }).name === 'AbortError') {
          setPhase('cancelled');
          return;
        }
        const msg = err instanceof Error ? err.message : 'Erro desconhecido';
        setError(msg);
        setPhase('error');
        options.onError?.(msg);
      }
    },
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [],
  );

  const cancel = useCallback(() => {
    abortRef.current?.abort();
    setPhase('cancelled');
  }, []);

  /** Acumula o stream inteiro num buffer e retorna a string completa (sem SSE). */
  const accumulateStream = useCallback(
    async (
      url: string,
      body: Record<string, unknown>,
      headers: Record<string, string> = {},
    ): Promise<string> => {
      const controller = new AbortController();
      abortRef.current = controller;

      const res = await fetch(url, {
        method:  'POST',
        headers: { 'Content-Type': 'application/json', ...headers },
        body:    JSON.stringify({ ...body, stream: true }),
        signal:  controller.signal,
      });

      if (!res.ok) {
        const text = await res.text();
        throw new Error(`HTTP ${res.status}: ${text}`);
      }

      if (!res.body) throw new Error('Response body is null');

      const reader  = res.body.getReader();
      const decoder = new TextDecoder();
      let accumulated = '';

      while (true) {
        const { done, value } = await reader.read();
        if (done) break;
        const raw = decoder.decode(value, { stream: true });
        for (const line of raw.split('\n')) {
          if (!line.startsWith('data: ')) continue;
          const payload = line.slice(6).trim();
          if (payload === '[DONE]') break;
          try {
            const parsed = JSON.parse(payload);
            const delta: string = parsed?.choices?.[0]?.delta?.content ?? '';
            accumulated += delta;
          } catch { /* ignora */ }
        }
      }

      return accumulated;
    },
    [],
  );

  return { phase, streamingText, error, start, cancel, accumulateStream };
}
