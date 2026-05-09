import { useState, useCallback } from 'react';
import { useSSEStream } from './useSSEStream';
import {
  IntentSchema,
  ContextPackageSchema,
  ValidationSchema,
  GAP_THRESHOLDS,
  type Intent,
  type ContextPackage,
  type Validation,
  type PipelineEvent,
  type Platform,
} from '../lib/contract';
import { toast } from 'sonner';
import { supabase } from '../integrations/supabase/client';
import { insertContextPackage } from '../integrations/supabase/contextPackages';

export type PipelinePhase =
  | 'idle'
  | 'inferring_intent'
  | 'building_context'
  | 'validating'
  | 'refining'
  | 'done'
  | 'error';

export interface PipelineState {
  phase:      PipelinePhase;
  events:     PipelineEvent[];
  intent:     Intent | null;
  package:    ContextPackage | null;
  validation: Validation | null;
  attempt:    number;          // 0 = primeira geração, 1-2 = refinamentos
  error:      string | null;
}

const MAX_ATTEMPTS = 2;

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

export function usePipeline() {
  const { accumulateStream } = useSSEStream();

  const [state, setState] = useState<PipelineState>({
    phase:      'idle',
    events:     [],
    intent:     null,
    package:    null,
    validation: null,
    attempt:    0,
    error:      null,
  });

  const pushEvent = useCallback((event: PipelineEvent) => {
    setState(s => ({ ...s, events: [...s.events, event] }));
  }, []);

  const run = useCallback(async (rawInput: string, platform: Platform) => {
    setState({
      phase: 'inferring_intent',
      events: [],
      intent: null,
      package: null,
      validation: null,
      attempt: 0,
      error: null,
    });

    try {
      const headers = await getAuthHeader();

      // ── Etapa 1: infer-intent ─────────────────────────────────────────────
      const intentRes = await fetch(getEdgeFunctionUrl('infer-intent'), {
        method:  'POST',
        headers: { 'Content-Type': 'application/json', ...headers },
        body:    JSON.stringify({ raw_input: rawInput, target_platform: platform }),
      });
      if (!intentRes.ok) throw new Error(`infer-intent: ${await intentRes.text()}`);

      const intentJson = await intentRes.json();
      const intent = IntentSchema.parse(intentJson);
      setState(s => ({ ...s, intent, phase: 'building_context' }));
      pushEvent({ type: 'intent_extracted', data: intent });

      // ── Etapa 2: build-context (SSE acumulado) ────────────────────────────
      let contextPackage: ContextPackage | null = null;
      let lastValidation: Validation | null = null;
      let attempt = 0;

      while (attempt <= MAX_ATTEMPTS) {
        setState(s => ({ ...s, attempt, phase: attempt === 0 ? 'building_context' : 'refining' }));
        if (attempt > 0) pushEvent({ type: 'refine_start', data: { attempt } });

        const raw = await accumulateStream(
          getEdgeFunctionUrl('build-context'),
          { intent, raw_input: rawInput, attempt },
          headers,
        );

        const clean = raw
          .replace(/^```json\s*/i, '')
          .replace(/^```\s*/i, '')
          .replace(/```\s*$/i, '')
          .trim();

        let parsed: ContextPackage;
        try {
          parsed = ContextPackageSchema.parse(JSON.parse(clean));
        } catch {
          console.error('build-context raw response:', clean.slice(0, 500));
          throw new Error(
            `build-context retornou JSON inválido na tentativa ${attempt}: ${clean.slice(0, 100)}`,
          );
        }

        contextPackage = parsed;
        pushEvent({ type: 'context_complete', data: parsed });

        // ── Etapa 3: validate-context ───────────────────────────────────────
        setState(s => ({ ...s, package: parsed, phase: 'validating' }));

        const valRes = await fetch(getEdgeFunctionUrl('validate-context'), {
          method:  'POST',
          headers: { 'Content-Type': 'application/json', ...headers },
          body:    JSON.stringify({ intent, package: parsed }),
        });
        if (!valRes.ok) throw new Error(`validate-context: ${await valRes.text()}`);

        const valJson = await valRes.json();
        const validation = ValidationSchema.parse(valJson);
        lastValidation = validation;
        setState(s => ({ ...s, validation }));
        pushEvent({ type: 'validation_result', data: validation });

        // ── Decisão ────────────────────────────────────────────────────────
        if (
          validation.gap_score >= GAP_THRESHOLDS.ACCEPT ||
          attempt >= MAX_ATTEMPTS
        ) {
          break;
        }

        attempt++;
      }

      if (!contextPackage) throw new Error('Pipeline não produziu pacote de contexto');

      // ── Salva no DB ───────────────────────────────────────────────────────
      try {
        await insertContextPackage({
          rawInput,
          platform,
          intent,
          pkg: contextPackage,
          validation: lastValidation,
          taskType: intent.task_type,
        });
      } catch {
        toast.error('O pacote foi gerado, mas não foi possível guardá-lo no cofre automaticamente.');
      }

      setState(s => ({ ...s, phase: 'done', package: contextPackage }));
      pushEvent({ type: 'pipeline_done', data: contextPackage! });

    } catch (err) {
      const message = err instanceof Error ? err.message : 'Erro desconhecido';
      setState(s => ({ ...s, phase: 'error', error: message }));
      pushEvent({ type: 'pipeline_error', data: { message } });
    }
  }, [accumulateStream, pushEvent]);

  const reset = useCallback(() => {
    setState({
      phase: 'idle', events: [], intent: null,
      package: null, validation: null, attempt: 0, error: null,
    });
  }, []);

  return { state, run, reset };
}
