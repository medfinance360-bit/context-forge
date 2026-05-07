import { cn } from '../lib/utils';

const ICON_SRC = '/prompt-do-icon.png';

interface BrandMarkProps {
  className?: string;
  /** Altura do ícone (Tailwind). */
  iconClass?: string;
  /** Exibe o texto "prompt.do" ao lado (ou abaixo se flex-col). */
  wordmark?: boolean;
  wordmarkClassName?: string;
}

/**
 * Logo composto: ícone oficial + wordmark opcional.
 */
export function BrandMark({
  className,
  iconClass = 'h-9 w-auto',
  wordmark = true,
  wordmarkClassName = 'font-medium tracking-tight text-foreground',
}: BrandMarkProps) {
  return (
    <span className={cn('inline-flex items-center gap-2.5', className)}>
      <img
        src={ICON_SRC}
        alt=""
        className={cn('max-h-14 max-w-[220px] object-contain', iconClass)}
        decoding="async"
      />
      {wordmark ? <span className={wordmarkClassName}>prompt.do</span> : null}
    </span>
  );
}

export { ICON_SRC as BRAND_ICON_SRC };
