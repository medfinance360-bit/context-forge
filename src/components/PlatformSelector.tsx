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
    <div
      className={cn(
        compact
          ? cn(
              'flex items-center gap-2',
              '-mx-1 px-1 max-sm:flex-nowrap max-sm:gap-2 max-sm:overflow-x-auto max-sm:pb-1 max-sm:[-ms-overflow-style:none] max-sm:[scrollbar-width:none] max-sm:[&::-webkit-scrollbar]:hidden',
              'sm:flex-wrap',
            )
          : 'flex flex-wrap gap-2',
        className,
      )}
    >
      {PLATFORMS.map((p) => {
        const active = value === p;
        return (
          <button
            key={p}
            type="button"
            disabled={disabled}
            onClick={() => onChange(p)}
            className={cn(
              'shrink-0 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 focus-visible:ring-offset-background',
              'font-medium transition-colors active:opacity-95',
              compact
                ? cn(
                    'min-h-11 rounded-full border px-3 py-2 text-xs sm:min-h-0 sm:px-2.5 sm:py-1',
                    active
                      ? 'border-transparent bg-primary text-primary-foreground'
                      : 'border-transparent bg-muted/80 text-muted-foreground hover:bg-muted hover:text-foreground',
                  )
                : cn(
                    'min-h-11 min-w-[7.25rem] rounded-md border px-3 py-2 text-left text-[13px] leading-tight active:bg-accent md:min-h-0',
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
