import {
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
} from 'react';
import { BookmarkPlus, Copy } from 'lucide-react';
import { useLocation, useNavigate } from 'react-router-dom';
import { useQueryClient } from '@tanstack/react-query';
import { toast } from 'sonner';
import { EventDrawer, type TimedPipelineEvent } from '../components/EventDrawer';
import { JsonPreview } from '../components/JsonPreview';
import { PipelineProgress } from '../components/PipelineProgress';
import { PlatformSelector } from '../components/PlatformSelector';
import { Button } from '../components/ui/button';
import { Label } from '../components/ui/label';
import { Textarea } from '../components/ui/textarea';
import { usePipeline } from '../hooks/usePipeline';
import {
  ContextPackageSchema,
  PLATFORMS,
  ValidationSchema,
  type ContextPackage,
  type Platform,
  type TaskType,
  type Validation,
} from '../lib/contract';
import type { VaultPackageRow } from '../hooks/useVaultPackages';
import { insertContextPackage } from '../integrations/supabase/contextPackages';
import { cn } from '../lib/utils';

function asPlatform(s: string): Platform {
  return PLATFORMS.includes(s as Platform) ? (s as Platform) : 'gpt';
}

function parsePackage(json: unknown): ContextPackage | null {
  if (!json || typeof json !== 'object') return null;
  const r = ContextPackageSchema.safeParse(json);
  return r.success ? r.data : null;
}

function parseValidation(json: unknown): Validation | null {
  if (!json || typeof json !== 'object') return null;
  const r = ValidationSchema.safeParse(json);
  return r.success ? r.data : null;
}

function isTaskType(s: string): s is TaskType {
  return s === 'REASONING' || s === 'EXTRACTION' || s === 'AGENT' || s === 'CODE';
}

export function Forge() {
  const navigate = useNavigate();
  const location = useLocation();
  const queryClient = useQueryClient();
  const { state, run, reset } = usePipeline();

  const [rawInput, setRawInput] = useState('');
  const [platform, setPlatform] = useState<Platform>('gpt');
  const [externalPkg, setExternalPkg] = useState<ContextPackage | null>(null);
  const [externalValidation, setExternalValidation] = useState<Validation | null>(null);
  const [vaultTaskType, setVaultTaskType] = useState<TaskType | null>(null);
  const [drawerOpen, setDrawerOpen] = useState(false);
  const [vaultSaving, setVaultSaving] = useState(false);
  const [timedEvents, setTimedEvents] = useState<TimedPipelineEvent[]>([]);
  const timedEventCountRef = useRef(0);
  const rawInputRef = useRef<HTMLTextAreaElement>(null);

  const hydratedNavKey = useRef<string | null>(null);

  useEffect(() => {
    const row = (location.state as { row?: VaultPackageRow } | null)?.row;
    if (!row?.id || hydratedNavKey.current === row.id) return;
    hydratedNavKey.current = row.id;
    reset();
    setRawInput(row.raw_input);
    setPlatform(asPlatform(row.target_platform));
    setExternalPkg(parsePackage(row.package_json));
    setExternalValidation(parseValidation(row.validation_json));
    setVaultTaskType(isTaskType(row.task_type) ? row.task_type : null);
    navigate('.', { replace: true, state: {} });
  }, [location.state, navigate, reset]);

  useEffect(() => {
    if (state.phase === 'error' && state.error) {
      toast.error(state.error);
    }
  }, [state.phase, state.error]);

  useEffect(() => {
    if (state.phase === 'done') {
      void queryClient.invalidateQueries({ queryKey: ['vault-packages'] });
      toast.success('Pacote de contexto pronto.');
    }
  }, [state.phase, queryClient]);

  useEffect(() => {
    const evs = state.events;
    queueMicrotask(() => {
      if (evs.length === 0) {
        timedEventCountRef.current = 0;
        setTimedEvents([]);
        return;
      }
      if (evs.length > timedEventCountRef.current) {
        const added = evs.slice(timedEventCountRef.current).map((event) => ({
          at: Date.now(),
          event,
        }));
        setTimedEvents((prev) => [...prev, ...added]);
        timedEventCountRef.current = evs.length;
      } else if (evs.length < timedEventCountRef.current) {
        setTimedEvents(
          evs.map((event) => ({
            at: Date.now(),
            event,
          })),
        );
        timedEventCountRef.current = evs.length;
      }
    });
  }, [state.events]);

  const previewPackage = state.package ?? externalPkg;
  const previewValidation = state.validation ?? externalValidation;

  const taskType = state.intent?.task_type ?? vaultTaskType;

  const isRunning = useMemo(
    () =>
      state.phase === 'inferring_intent' ||
      state.phase === 'building_context' ||
      state.phase === 'validating' ||
      state.phase === 'refining',
    [state.phase],
  );

  const handleForge = useCallback(() => {
    const trimmed = rawInput.trim();
    if (!trimmed) {
      toast.error('Digite o pedido bruto antes de forjar.');
      return;
    }
    setExternalPkg(null);
    setExternalValidation(null);
    setVaultTaskType(null);
    void run(trimmed, platform);
  }, [rawInput, platform, run]);

  const handleClear = useCallback(() => {
    reset();
    setExternalPkg(null);
    setExternalValidation(null);
    setVaultTaskType(null);
  }, [reset]);

  const handleOptimizeAnother = useCallback(() => {
    handleClear();
    setRawInput('');
    requestAnimationFrame(() => rawInputRef.current?.focus());
  }, [handleClear]);

  const copyFullPackageJson = useCallback(async () => {
    if (!previewPackage) return;
    const envelope: Record<string, unknown> = { ...previewPackage };
    if (previewValidation) envelope.validation = previewValidation;
    try {
      await navigator.clipboard.writeText(JSON.stringify(envelope, null, 2));
      toast.success('JSON copiado.');
    } catch {
      toast.error('Não foi possível copiar.');
    }
  }, [previewPackage, previewValidation]);

  const handleSaveToVault = useCallback(async () => {
    if (!previewPackage) return;
    const trimmed = rawInput.trim();
    if (!trimmed) {
      toast.error('Precisa de texto de entrada para guardar no cofre.');
      return;
    }
    const tt = taskType ?? previewPackage.task_routing.type;
    try {
      setVaultSaving(true);
      await insertContextPackage({
        rawInput: trimmed,
        platform,
        intent: state.intent,
        pkg: previewPackage,
        validation: previewValidation,
        taskType: tt,
      });
      void queryClient.invalidateQueries({ queryKey: ['vault-packages'] });
      toast.success('Guardado no cofre.');
    } catch (e) {
      toast.error(e instanceof Error ? e.message : 'Não foi possível guardar.');
    } finally {
      setVaultSaving(false);
    }
  }, [
    platform,
    previewPackage,
    previewValidation,
    queryClient,
    rawInput,
    state.intent,
    taskType,
  ]);

  const showPreview =
    externalPkg !== null || (state.package !== null && state.phase === 'done');
  const showMetaRow =
    showPreview &&
    (Boolean(taskType) || previewValidation != null);

  return (
    <div className="flex min-h-0 flex-1 flex-col bg-background">
      <div
        className={cn(
          'mx-auto flex min-h-0 w-full max-w-[1500px] flex-1 flex-col px-4 py-8 sm:px-8',
          showPreview && 'lg:flex-row lg:gap-12 xl:gap-16',
        )}
      >
        <div
          className={cn(
            'flex min-h-0 flex-col gap-8',
            showPreview ? 'lg:min-w-0 lg:flex-1 lg:max-w-xl' : 'mx-auto w-full max-w-3xl',
          )}
        >
          <div className="flex min-h-0 flex-1 flex-col gap-6">
            <div className="flex min-h-0 flex-1 flex-col gap-2">
              <Label
                htmlFor="raw-input"
                className="text-[10px] font-semibold uppercase tracking-[0.12em] text-muted-foreground"
              >
                Entrada bruta
              </Label>
              <Textarea
                ref={rawInputRef}
                id="raw-input"
                value={rawInput}
                onChange={(e) => setRawInput(e.target.value)}
                disabled={isRunning}
                placeholder="Descreva a tarefa, público-alvo, restrições e o que precisa no output…"
                className="min-h-[300px] flex-1 resize-y text-sm leading-relaxed md:min-h-[340px]"
              />
            </div>

            <div className="flex flex-col gap-2">
              <p className="text-[10px] font-semibold uppercase tracking-[0.12em] text-muted-foreground">
                Plataforma alvo
              </p>
              <PlatformSelector
                compact
                value={platform}
                onChange={setPlatform}
                disabled={isRunning}
              />
            </div>

            {showMetaRow ? (
              <div className="flex flex-wrap items-center gap-x-2.5 gap-y-1 border-t border-border/25 pt-4">
                {taskType ? (
                  <span className="font-mono text-[10px] uppercase tracking-wide text-muted-foreground">
                    {taskType}
                  </span>
                ) : null}
                {taskType && previewValidation ? (
                  <span className="text-[10px] text-muted-foreground/40" aria-hidden>
                    ·
                  </span>
                ) : null}
                {previewValidation ? (
                  <span className="font-mono text-[10px] tabular-nums text-muted-foreground">
                    gap {previewValidation.gap_score.toFixed(2)}
                  </span>
                ) : null}
              </div>
            ) : null}

            <Button
              type="button"
              disabled={isRunning}
              className="w-full"
              size="lg"
              onClick={() => void handleForge()}
            >
              Forjar contexto
            </Button>

            <button
              type="button"
              onClick={handleClear}
              className="self-start text-xs text-muted-foreground underline-offset-4 transition-colors hover:text-foreground hover:underline"
            >
              Limpar execução
            </button>

            <PipelineProgress phase={state.phase} />

            {showPreview && previewPackage ? (
              <div className="flex flex-col gap-3 border-t border-border/25 pt-5">
                <div className="flex gap-3">
                  <Button
                    type="button"
                    variant="outline"
                    size="lg"
                    className="h-12 flex-1 gap-2 rounded-xl"
                    onClick={() => void copyFullPackageJson()}
                  >
                    <Copy className="size-4" strokeWidth={2} aria-hidden />
                    Copiar
                  </Button>
                  <Button
                    type="button"
                    size="lg"
                    className="h-12 flex-1 gap-2 rounded-xl"
                    disabled={isRunning || vaultSaving}
                    onClick={() => void handleSaveToVault()}
                  >
                    <BookmarkPlus className="size-4" strokeWidth={2} aria-hidden />
                    Salvar no cofre
                  </Button>
                </div>
                <button
                  type="button"
                  onClick={handleOptimizeAnother}
                  disabled={isRunning || vaultSaving}
                  className="w-full pt-1 text-center text-xs text-muted-foreground underline-offset-4 transition-colors hover:text-foreground hover:underline disabled:pointer-events-none disabled:opacity-50"
                >
                  Otimizar outro prompt
                </button>
              </div>
            ) : null}
          </div>
        </div>

        {showPreview ? (
          <div className="mt-10 flex min-h-0 flex-1 flex-col pt-6 lg:mt-0 lg:min-w-0 lg:border-l lg:border-border/25 lg:pl-10 lg:pt-2 xl:pl-12">
            <JsonPreview
              pkg={previewPackage}
              validation={previewValidation}
              className="min-h-[min(70vh,720px)] lg:min-h-0"
            />
          </div>
        ) : null}
      </div>

      <EventDrawer open={drawerOpen} onToggle={() => setDrawerOpen((o) => !o)} items={timedEvents} />
    </div>
  );
}
