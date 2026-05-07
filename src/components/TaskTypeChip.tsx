import type { TaskType } from '../lib/contract';
import { cn } from '../lib/utils';

const STYLES: Record<TaskType, string> = {
  REASONING:
    'border-task-reasoning/30 bg-task-reasoning/15 text-task-reasoning-foreground',
  EXTRACTION:
    'border-task-extraction/30 bg-task-extraction/15 text-task-extraction-foreground',
  AGENT: 'border-task-agent/30 bg-task-agent/15 text-task-agent-foreground',
  CODE: 'border-task-code/30 bg-task-code/15 text-task-code-foreground',
};

interface TaskTypeChipProps {
  type: TaskType;
  className?: string;
}

export function TaskTypeChip({ type, className }: TaskTypeChipProps) {
  return (
    <span
      className={cn(
        'inline-flex items-center rounded-full border px-2.5 py-0.5 text-[11px] font-semibold uppercase tracking-wide',
        STYLES[type],
        className,
      )}
    >
      {type}
    </span>
  );
}
