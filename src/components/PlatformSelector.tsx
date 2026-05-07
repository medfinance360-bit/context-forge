import type { Platform } from '../lib/contract';
import { PLATFORMS } from '../lib/contract';
import { cn } from '../lib/utils';

/** Labels curtos (sem subtítulo) — UX compacta na Forja */
const LABELS: Record<Platform, string> = {
  gpt: 'GPT',
  claude: 'Claude',
  cursor: 'Cursor',
  'system-prompt': 'System prompt',
  agente: 'Agente',
};

interface PlatformSelectorProps {
  value: Platform;
  onChange: (p: Platform) => void;
  disabled?: boolean;
  className?: string;
  /** Linha única, chips pequenos, só nome */
  compact?: boolean;
}

export function PlatformSelector({
  value,
  onChange,
  disabled,
  className,
  compact = false,
}: PlatformSelectorProps) {
  return (
    <div className={cn(compact ? 'flex flex-wrap items-center gap-1.5' : 'flex flex-wrap gap-2', className)}>
      {PLATFORMS.map((p) => {
        const active = value === p;
        return (
          <button
            key={p}
            type="button"
            disabled={disabled}
            onClick={() => onChange(p)}
            className={cn(
              'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 focus-visible:ring-offset-background',
              'font-medium transition-colors',
              compact
                ? cn(
                    'rounded-full border px-2.5 py-1 text-xs',
                    active
                      ? 'border-transparent bg-primary text-primary-foreground'
                      : 'border-transparent bg-muted/80 text-muted-foreground hover:bg-muted hover:text-foreground',
                  )
                : cn(
                    'min-w-[7.25rem] rounded-md border px-3 py-2 text-left text-[13px] leading-tight',
                    active
                      ? 'border-transparent bg-primary text-primary-foreground shadow-sm'
                      : 'border-border bg-secondary text-secondary-foreground hover:bg-accent hover:text-accent-foreground',
                  ),
              disabled && 'pointer-events-none opacity-50',
            )}
          >
            {LABELS[p]}
          </button>
        );
      })}
    </div>
  );
}
