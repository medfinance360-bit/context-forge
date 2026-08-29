import { Star, Copy, Trash2, Pencil } from 'lucide-react';
import type { Prompt, PromptColor } from '../lib/types';
import { cn } from '../lib/utils';

const COLOR_BORDER: Record<PromptColor, string> = {
  none:   'border-l-border',
  blue:   'border-l-blue-500',
  green:  'border-l-green-500',
  yellow: 'border-l-amber-400',
  red:    'border-l-rose-500',
  purple: 'border-l-purple-500',
};

function relativeTime(iso: string): string {
  const diff = Date.now() - new Date(iso).getTime();
  const days = Math.floor(diff / 86_400_000);
  if (days === 0) return 'hoje';
  if (days === 1) return 'há 1 dia';
  if (days < 30) return `há ${days} dias`;
  const months = Math.floor(days / 30);
  return months === 1 ? 'há 1 mês' : `há ${months} meses`;
}

interface PromptCardProps {
  prompt: Prompt;
  onEdit: (p: Prompt) => void;
  onDelete: (id: string) => void;
  onCopy: (content: string) => void;
  onToggleFavorite: (id: string, current: boolean) => void;
  className?: string;
}

export function PromptCard({ prompt, onEdit, onDelete, onCopy, onToggleFavorite, className }: PromptCardProps) {
  return (
    <div
      className={cn(
        'group relative flex flex-col gap-2 rounded-2xl border border-border bg-card px-4 py-3.5',
        'border-l-[3px] transition-colors hover:bg-card/80',
        COLOR_BORDER[prompt.color],
        className,
      )}
    >
      {/* Title */}
      <p className="line-clamp-1 text-sm font-medium text-foreground">
        {prompt.title || 'Sem título'}
      </p>

      {/* Content preview */}
      <p className="line-clamp-2 text-[12px] leading-relaxed text-muted-foreground">
        {prompt.content}
      </p>

      {/* Footer */}
      <div className="flex items-center justify-between gap-2 pt-0.5">
        <div className="flex flex-wrap gap-1">
          {prompt.tags.slice(0, 3).map(tag => (
            <span
              key={tag}
              className="rounded-md bg-muted px-1.5 py-0.5 font-mono text-[10px] text-muted-foreground"
            >
              {tag}
            </span>
          ))}
        </div>
        <span className="shrink-0 text-[10px] text-muted-foreground/50">
          {relativeTime(prompt.created_at)}
        </span>
      </div>

      {/* Hover actions */}
      <div className="absolute right-2.5 top-2.5 hidden items-center gap-1 group-hover:flex">
        <button
          type="button"
          onClick={() => onToggleFavorite(prompt.id, prompt.is_favorite)}
          className={cn(
            'rounded-lg p-1.5 transition-colors hover:bg-muted',
            prompt.is_favorite ? 'text-amber-400' : 'text-muted-foreground/50',
          )}
          title={prompt.is_favorite ? 'Remover dos favoritos' : 'Favoritar'}
        >
          <Star className="size-3.5" fill={prompt.is_favorite ? 'currentColor' : 'none'} />
        </button>
        <button
          type="button"
          onClick={() => onCopy(prompt.content)}
          className="rounded-lg p-1.5 text-muted-foreground/50 transition-colors hover:bg-muted hover:text-foreground"
          title="Copiar"
        >
          <Copy className="size-3.5" />
        </button>
        <button
          type="button"
          onClick={() => onEdit(prompt)}
          className="rounded-lg p-1.5 text-muted-foreground/50 transition-colors hover:bg-muted hover:text-foreground"
          title="Editar"
        >
          <Pencil className="size-3.5" />
        </button>
        <button
          type="button"
          onClick={() => onDelete(prompt.id)}
          className="rounded-lg p-1.5 text-muted-foreground/50 transition-colors hover:bg-muted hover:text-destructive"
          title="Excluir"
        >
          <Trash2 className="size-3.5" />
        </button>
      </div>
    </div>
  );
}
