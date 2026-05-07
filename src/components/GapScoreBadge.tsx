import { cn } from '../lib/utils';

interface GapScoreBadgeProps {
  score: number;
  className?: string;
}

export function GapScoreBadge({ score, className }: GapScoreBadgeProps) {
  const tone =
    score >= 0.9
      ? 'border-success/35 bg-success/15 text-success-foreground'
      : score >= 0.5
        ? 'border-warning/35 bg-warning/15 text-warning-foreground'
        : 'border-destructive/35 bg-destructive/15 text-destructive-foreground';

  const label = score.toFixed(2);

  return (
    <span
      className={cn(
        'inline-flex items-center rounded-full border px-2.5 py-0.5 font-mono text-xs font-semibold tabular-nums',
        tone,
        className,
      )}
      title="Gap score"
    >
      {label}
    </span>
  );
}
