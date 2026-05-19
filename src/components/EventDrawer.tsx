import {
  AlertCircle,
  CheckCircle2,
  ChevronDown,
  ChevronRight,
  FileJson2,
  Sparkles,
  Wrench,
} from 'lucide-react';
import { AnimatePresence, motion } from 'framer-motion';
import type { PipelineEvent } from '../lib/contract';
import { cn } from '../lib/utils';

const EVENT_LABELS: Record<PipelineEvent['type'], string> = {
  intent_extracted: 'Intent extraída',
  context_chunk: 'Fragmento de contexto',
  context_complete: 'Contexto completo',
  validation_result: 'Resultado da validação',
  refine_start: 'Refinamento iniciado',
  pipeline_done: 'Pipeline concluído',
  pipeline_error: 'Erro no pipeline',
};

function eventIcon(type: PipelineEvent['type']) {
  switch (type) {
    case 'intent_extracted':
      return Sparkles;
    case 'context_chunk':
      return FileJson2;
    case 'context_complete':
      return FileJson2;
    case 'validation_result':
      return CheckCircle2;
    case 'refine_start':
      return Wrench;
    case 'pipeline_done':
      return CheckCircle2;
    case 'pipeline_error':
      return AlertCircle;
    default:
      return FileJson2;
  }
}

export interface TimedPipelineEvent {
  at: number;
  event: PipelineEvent;
}

interface EventDrawerProps {
  open: boolean;
  onToggle: () => void;
  items: TimedPipelineEvent[];
  className?: string;
}

export function EventDrawer({ open, onToggle, items, className }: EventDrawerProps) {
  return (
    <div
      className={cn(
        'flex shrink-0 flex-col border-t border-border/40 bg-background/95 backdrop-blur-xl',
        className,
      )}
    >
      <button
        type="button"
        onClick={onToggle}
        aria-expanded={open}
        className="flex min-h-11 w-full touch-manipulation items-center justify-between gap-2 px-4 py-2 text-left text-[11px] text-muted-foreground transition-colors hover:bg-muted/40 hover:text-foreground active:bg-muted/50 sm:min-h-10"
      >
        <span className="flex items-center gap-2 font-medium">
          {open ? (
            <ChevronDown className="size-4 shrink-0 opacity-70" aria-hidden />
          ) : (
            <ChevronRight className="size-4 shrink-0 opacity-70" aria-hidden />
          )}
          Eventos do pipeline
        </span>
        <span className="tab-nums shrink-0 font-mono text-[10px] text-muted-foreground/60">
          {items.length}
        </span>
      </button>

      <AnimatePresence initial={false}>
        {open ? (
          <motion.div
            key="body"
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: 160, opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            transition={{ duration: 0.18 }}
            className="overflow-hidden border-t border-border/30"
          >
            <div className="h-[160px] overflow-y-auto px-3 py-1.5">
              {items.length === 0 ? (
                <p className="py-4 text-center text-[10px] text-muted-foreground">Nenhum evento ainda.</p>
              ) : (
                <ul className="space-y-0.5">
                  {items.map((row, i) => {
                    const Icon = eventIcon(row.event.type);
                    const time = new Date(row.at).toLocaleTimeString('pt-BR', {
                      hour: '2-digit',
                      minute: '2-digit',
                      second: '2-digit',
                    });
                    const isErr = row.event.type === 'pipeline_error';
                    return (
                      <li
                        key={`${row.at}-${i}`}
                        className={cn(
                          'flex items-start gap-1.5 rounded px-1.5 py-1 font-mono text-[10px] leading-snug',
                          isErr ? 'bg-destructive/8' : 'bg-muted/35',
                        )}
                      >
                        <Icon
                          className={cn(
                            'mt-0.5 size-3 shrink-0',
                            isErr ? 'text-destructive' : 'text-muted-foreground',
                          )}
                        />
                        <div className="min-w-0 flex-1">
                          <div className="flex flex-wrap items-baseline justify-between gap-x-2 gap-y-0">
                            <span className={cn(isErr ? 'text-destructive' : 'text-foreground/90')}>
                              {EVENT_LABELS[row.event.type]}
                            </span>
                            <span className="shrink-0 tabular-nums text-[9px] text-muted-foreground/55">
                              {time}
                            </span>
                          </div>
                          {row.event.type === 'pipeline_error' ? (
                            <p className="mt-0.5 break-words text-[10px] text-muted-foreground">
                              {row.event.data.message}
                            </p>
                          ) : null}
                        </div>
                      </li>
                    );
                  })}
                </ul>
              )}
            </div>
          </motion.div>
        ) : null}
      </AnimatePresence>
    </div>
  );
}
