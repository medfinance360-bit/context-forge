import { Check, Loader2 } from 'lucide-react';
import type { PipelinePhase } from '../hooks/usePipeline';
import { cn } from '../lib/utils';

/** Versão curta para uma linha */
const LABELS = [
  'Intent',
  'Contexto',
  'Validação',
  'Refino',
  'Feito',
] as const;

function phaseOrder(phase: PipelinePhase): number {
  switch (phase) {
    case 'idle':
      return -1;
    case 'inferring_intent':
      return 0;
    case 'building_context':
      return 1;
    case 'validating':
      return 2;
    case 'refining':
      return 3;
    case 'done':
      return 4;
    case 'error':
      return -2;
    default:
      return -1;
  }
}

interface PipelineProgressProps {
  phase: PipelinePhase;
  className?: string;
}

export function PipelineProgress({ phase, className }: PipelineProgressProps) {
  const order = phaseOrder(phase);
  const isError = phase === 'error';

  if (phase === 'idle') {
    return null;
  }

  return (
    <div className={cn('flex flex-wrap items-center gap-x-2 gap-y-1', className)}>
      <ol className="flex flex-wrap items-center gap-x-1.5 gap-y-1">
        {LABELS.map((label, i) => {
          const complete = !isError && (phase === 'done' || order > i);
          const current = !isError && phase !== 'done' && order === i;
          const showSpinner = current;

          return (
            <li key={label} className="flex items-center gap-1">
              {i > 0 ? (
                <span className="select-none text-[10px] text-muted-foreground/35" aria-hidden>
                  ·
                </span>
              ) : null}
              {showSpinner ? (
                <Loader2 className="size-3 shrink-0 animate-spin text-muted-foreground" aria-hidden />
              ) : !isError && complete ? (
                <Check className="size-3 shrink-0 text-success" aria-hidden />
              ) : (
                <span
                  className="size-3 shrink-0 rounded-full border border-border bg-background"
                  aria-hidden
                />
              )}
              <span
                className={cn(
                  'text-[10px] font-medium leading-none',
                  complete && 'text-muted-foreground',
                  current && 'text-foreground',
                  !complete && !current && 'text-muted-foreground/50',
                  isError && current && 'text-destructive',
                )}
              >
                {label}
              </span>
            </li>
          );
        })}
      </ol>
      {isError ? (
        <span className="text-[10px] text-destructive">Falhou — ver eventos.</span>
      ) : null}
    </div>
  );
}
