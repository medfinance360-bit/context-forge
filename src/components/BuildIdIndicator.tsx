import { cn } from '../lib/utils';

/** Expõe `BUILD_ID` das edge functions via `VITE_BUILD_ID` no build do cliente. */
export function BuildIdIndicator({ className }: { className?: string }) {
  const id = import.meta.env.VITE_BUILD_ID as string | undefined;
  return (
    <div
      className={cn(
        'flex flex-wrap items-center justify-center gap-x-3 gap-y-1 text-center',
        className,
      )}
    >
      <span className="text-xs tabular-nums text-muted-foreground">
        {id ? (
          <>
            <span className="font-medium text-foreground/80">Build</span>{' '}
            <code className="rounded-sm bg-muted px-1 py-0.5 font-mono text-[11px]">
              {id}
            </code>
          </>
        ) : (
          <span className="font-mono text-[11px]">local / sem VITE_BUILD_ID</span>
        )}
      </span>
    </div>
  );
}
