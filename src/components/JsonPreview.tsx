import { useMemo, useState } from 'react';
import { Prism as SyntaxHighlighter } from 'react-syntax-highlighter';
import { oneDark } from 'react-syntax-highlighter/dist/esm/styles/prism';
import { ChevronDown, ChevronRight, Copy } from 'lucide-react';
import { toast } from 'sonner';
import type { ContextPackage, Validation, Platform } from '../lib/contract';
import { formatForPlatform, PLATFORM_FORMAT_LABELS } from '../lib/formatters';
import { cn } from '../lib/utils';

const PACKAGE_BLOCK_ORDER = [
  'system_immutable',
  'task_routing',
  'assumptions',
  'intent',
  'user_data',
  'retrieval',
  'contract',
] as const;

type PackageBlockKey = (typeof PACKAGE_BLOCK_ORDER)[number];

const BLOCK_LABELS: Record<PackageBlockKey, string> = {
  system_immutable: 'system_immutable',
  task_routing: 'task_routing',
  assumptions: 'assumptions',
  intent: 'intent',
  user_data: 'user_data',
  retrieval: 'retrieval',
  contract: 'contract',
};

function stringifyBlock(value: unknown): string {
  return JSON.stringify(value, null, 2);
}

async function copyText(text: string, okMessage: string) {
  try {
    await navigator.clipboard.writeText(text);
    toast.success(okMessage);
  } catch {
    toast.error('Não foi possível copiar.');
  }
}

interface CollapsibleJsonProps {
  title: string;
  json: string;
  defaultOpen?: boolean;
}

function CollapsibleJson({ title, json, defaultOpen = false }: CollapsibleJsonProps) {
  const [open, setOpen] = useState(defaultOpen);

  return (
    <div className="overflow-hidden rounded-md bg-muted/30">
      <div className="flex items-center gap-1.5 px-2 py-1.5">
        <button
          type="button"
          onClick={() => setOpen((o) => !o)}
          className="flex min-w-0 flex-1 items-center gap-1 text-left text-[11px] font-medium text-foreground/90 hover:text-foreground"
        >
          {open ? (
            <ChevronDown className="size-3.5 shrink-0 opacity-70" />
          ) : (
            <ChevronRight className="size-3.5 shrink-0 opacity-70" />
          )}
          <span className="truncate">{title}</span>
        </button>
        <button
          type="button"
          onClick={() => void copyText(json, 'Bloco copiado.')}
          className="rounded p-1 text-muted-foreground/70 transition-colors hover:bg-muted/80 hover:text-foreground"
          title="Copiar bloco"
        >
          <Copy className="size-3" />
        </button>
      </div>
      {open ? (
        <div className="max-h-[min(420px,50vh)] overflow-auto border-t border-border/20">
          <SyntaxHighlighter
            language="json"
            style={oneDark}
            customStyle={{
              margin: 0,
              padding: '0.65rem 0.75rem',
              background: 'hsl(var(--muted) / 0.35)',
              fontSize: '11px',
            }}
            codeTagProps={{ className: 'font-mono' }}
          >
            {json}
          </SyntaxHighlighter>
        </div>
      ) : null}
    </div>
  );
}

interface JsonPreviewProps {
  pkg: ContextPackage | null;
  validation?: Validation | null;
  platform?: Platform;
  className?: string;
}

export function JsonPreview({ pkg, validation, platform, className }: JsonPreviewProps) {
  const fullJson = useMemo(() => {
    if (!pkg) return '';
    const envelope: Record<string, unknown> = { ...pkg };
    if (validation) envelope.validation = validation;
    return JSON.stringify(envelope, null, 2);
  }, [pkg, validation]);

  if (!pkg) {
    return (
      <div
        className={cn(
          'flex min-h-[120px] items-center justify-center py-8 text-center text-xs text-muted-foreground/70',
          className,
        )}
      >
        Resultado após forjar…
      </div>
    );
  }

  return (
    <div className={cn('flex h-full min-h-0 flex-col gap-5', className)}>
      <div className="flex items-center justify-between gap-3">
        <p className="text-xs font-medium text-muted-foreground">Pré-visualização</p>
        <div className="flex items-center gap-2">
          {platform && pkg && (
            <button
              type="button"
              onClick={() => void copyText(formatForPlatform(pkg, platform), `${PLATFORM_FORMAT_LABELS[platform].replace('Copiar ', '')} copiado.`)}
              className="inline-flex items-center gap-1.5 rounded-md bg-primary/10 px-2 py-0.5 text-xs font-medium text-primary transition-colors hover:bg-primary/20"
            >
              <Copy className="size-3" />
              {PLATFORM_FORMAT_LABELS[platform]}
            </button>
          )}
          <button
            type="button"
            onClick={() => void copyText(fullJson, 'JSON completo copiado.')}
            className="inline-flex items-center gap-1.5 text-xs font-medium text-muted-foreground transition-colors hover:text-foreground"
          >
            <Copy className="size-3" />
            Copiar JSON
          </button>
        </div>
      </div>

      <div className="min-h-0 flex-1 space-y-1 overflow-y-auto pr-0.5">
        {PACKAGE_BLOCK_ORDER.map((key) => (
          <CollapsibleJson
            key={key}
            title={BLOCK_LABELS[key]}
            json={stringifyBlock(pkg[key])}
            defaultOpen={key === 'task_routing' || key === 'intent'}
          />
        ))}
        {validation ? (
          <CollapsibleJson title="validation" json={stringifyBlock(validation)} defaultOpen />
        ) : null}
      </div>
    </div>
  );
}
