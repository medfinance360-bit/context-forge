import { useEffect, useRef, type MouseEvent as ReactMouseEvent } from 'react';
import { Copy, FolderInput, GripVertical, Star } from 'lucide-react';
import { toast } from 'sonner';
import { TaskTypeChip } from './TaskTypeChip';
import { Button } from './ui/button';
import type { VaultFolderRow } from '../hooks/useVaultFolders';
import type { VaultPackageRow } from '../hooks/useVaultPackages';
import { PLATFORMS, type TaskType } from '../lib/contract';
import { cn } from '../lib/utils';

function isTaskType(s: string): s is TaskType {
  return s === 'REASONING' || s === 'EXTRACTION' || s === 'AGENT' || s === 'CODE';
}

const ACCENT_BAR: Record<TaskType, string> = {
  REASONING: 'bg-task-reasoning',
  EXTRACTION: 'bg-task-extraction',
  AGENT: 'bg-task-agent',
  CODE: 'bg-task-code',
};

const PLATFORM_LABEL: Record<string, string> = {
  gpt: 'gpt',
  claude: 'claude',
  cursor: 'cursor',
  'system-prompt': 'system',
  agente: 'agente',
};

function formatRelativeDate(iso: string) {
  const d = new Date(iso);
  const sec = Math.floor((Date.now() - d.getTime()) / 1000);
  if (sec < 60) return `há ${sec} s`;
  const min = Math.floor(sec / 60);
  if (min < 60) return `há ${min} min`;
  const h = Math.floor(min / 60);
  if (h < 24) return `há ${h} h`;
  const days = Math.floor(h / 24);
  if (days < 30) return `há ${days} dia${days > 1 ? 's' : ''}`;
  return `há aprox. ${Math.floor(days / 7)} sem.`;
}

function splitTitleSnippet(raw: string): { title: string; snippet: string } {
  const normalized = raw.replace(/\r\n/g, '\n').trim();
  if (!normalized) return { title: 'Pacote sem título', snippet: '' };

  const lines = normalized
    .split('\n')
    .map((l) => l.trim())
    .filter(Boolean);
  const first = lines[0] ?? '';

  if (lines.length === 1 && first.length > 72) {
    return {
      title: `${first.slice(0, 69)}…`,
      snippet: first.length > 69 ? `${first.slice(69, 349)}…` : '',
    };
  }

  const title = first.length > 72 ? `${first.slice(0, 69)}…` : first;
  const rest = lines.slice(1).join(' ').trim();
  const snippet = rest ? (rest.length > 220 ? `${rest.slice(0, 217)}…` : rest) : '';

  return { title, snippet };
}

function truncate(s: string, n: number) {
  const t = s.replace(/\s+/g, ' ').trim();
  if (t.length <= n) return t;
  return `${t.slice(0, n)}…`;
}

function packageSnippetStarts(row: VaultPackageRow): string | null {
  const pkg = row.package_json;
  if (!pkg || typeof pkg !== 'object') return null;
  const si = (pkg as { system_immutable?: string }).system_immutable;
  if (typeof si === 'string' && si.trim()) {
    return truncate(si.replace(/\s+/g, ' ').trim(), 160);
  }
  return null;
}

function isOptimized(row: VaultPackageRow): boolean {
  const v = row.validation_json;
  if (!v || typeof v !== 'object' || !('gap_score' in v)) return false;
  const gs = (v as { gap_score: unknown }).gap_score;
  return typeof gs === 'number' && gs >= 0.9;
}

function rowToEnvelopeJson(row: VaultPackageRow): string {
  const pkg = row.package_json;
  if (!pkg || typeof pkg !== 'object') {
    return JSON.stringify(
      { raw_input: row.raw_input, package_json: row.package_json, validation_json: row.validation_json },
      null,
      2,
    );
  }
  const envelope: Record<string, unknown> = { ...(pkg as Record<string, unknown>) };
  const v = row.validation_json;
  if (v && typeof v === 'object') envelope.validation = v;
  return JSON.stringify(envelope, null, 2);
}

type ViewMode = 'grid' | 'list';

interface VaultPackageCardProps {
  row: VaultPackageRow;
  view: ViewMode;
  folders: VaultFolderRow[];
  moveMenuOpen: boolean;
  onToggleMoveMenu: (e: ReactMouseEvent<HTMLButtonElement>) => void;
  onCloseMoveMenu: () => void;
  onOpenForge: () => void;
  onToggleFavorite: () => void;
  onMoveToFolder: (folderId: string | null) => void;
  snippetClampClass: string;
}

export function VaultPackageCard({
  row,
  view,
  folders,
  moveMenuOpen,
  onToggleMoveMenu,
  onCloseMoveMenu,
  onOpenForge,
  onToggleFavorite,
  onMoveToFolder,
  snippetClampClass,
}: VaultPackageCardProps) {
  const menuRef = useRef<HTMLDivElement>(null);

  const { title, snippet } = splitTitleSnippet(row.raw_input);
  const pkgPreview = packageSnippetStarts(row);
  const displaySnippet = snippet || pkgPreview || '';
  const accent = isTaskType(row.task_type)
    ? ACCENT_BAR[row.task_type]
    : 'bg-task-fallback';
  const plat =
    PLATFORM_LABEL[row.target_platform] ??
    (PLATFORMS.includes(row.target_platform as (typeof PLATFORMS)[number])
      ? row.target_platform
      : row.target_platform);

  const isFav = Boolean(row.is_favorite);

  useEffect(() => {
    if (!moveMenuOpen) return;
    const handler = (e: globalThis.MouseEvent) => {
      if (menuRef.current && !menuRef.current.contains(e.target as Node)) {
        onCloseMoveMenu();
      }
    };
    document.addEventListener('mousedown', handler);
    return () => document.removeEventListener('mousedown', handler);
  }, [moveMenuOpen, onCloseMoveMenu]);

  async function handleCopy(e: ReactMouseEvent<HTMLButtonElement>) {
    e.stopPropagation();
    try {
      await navigator.clipboard.writeText(rowToEnvelopeJson(row));
      toast.success('JSON copiado.');
    } catch {
      toast.error('Não foi possível copiar.');
    }
  }

  function handleFav(e: ReactMouseEvent<HTMLButtonElement>) {
    e.stopPropagation();
    onToggleFavorite();
  }

  function pickFolder(fid: string | null) {
    onMoveToFolder(fid);
    onCloseMoveMenu();
  }

  const otherFolders = folders.filter((f) => f.id !== row.folder_id);

  return (
    <li className={cn(view === 'list' && 'min-w-0')}>
      <div
        className={cn(
          'group relative overflow-visible rounded-xl border border-border bg-card text-card-foreground shadow-sm transition-colors hover:border-ring hover:bg-accent/30',
          view === 'list' ? 'min-h-[104px]' : 'min-h-[152px]',
        )}
      >
        <button
          type="button"
          className="absolute inset-0 z-0 rounded-xl"
          onClick={onOpenForge}
          aria-label="Abrir na Forja"
        />

        <div className="pointer-events-none relative z-10 flex h-full min-h-[inherit] flex-row">
          <span
            className={cn('w-1.5 shrink-0 self-stretch rounded-l-xl', accent)}
            aria-hidden
          />

          <div className="flex min-w-0 flex-1 flex-col py-3 pl-2.5 pr-3 sm:py-3.5 sm:pl-3 sm:pr-4">
            <div
              ref={menuRef}
              className="pointer-events-auto relative -mt-1 mb-1 flex min-h-[28px] justify-center"
            >
              <div
                className={cn(
                  'absolute -top-2 flex -translate-y-1 justify-center gap-0.5 rounded-full border border-border bg-card/95 px-1 py-0.5 shadow-lg backdrop-blur-md transition-all duration-200',
                  'opacity-0 group-hover:opacity-100',
                  moveMenuOpen && 'opacity-100',
                )}
              >
                <Button
                  type="button"
                  variant="ghost"
                  size="icon"
                  className="size-8 rounded-full text-muted-foreground hover:text-foreground"
                  title={isFav ? 'Remover dos favoritos' : 'Favoritar'}
                  onClick={handleFav}
                >
                  <Star
                    className={cn('size-3.5', isFav && 'fill-amber-400 text-amber-400')}
                    strokeWidth={2}
                    aria-hidden
                  />
                </Button>
                <Button
                  type="button"
                  variant="ghost"
                  size="icon"
                  className="size-8 rounded-full text-muted-foreground hover:text-foreground"
                  title="Mover para pasta"
                  onClick={onToggleMoveMenu}
                >
                  <FolderInput className="size-3.5" strokeWidth={2} aria-hidden />
                </Button>
                <Button
                  type="button"
                  variant="ghost"
                  size="icon"
                  className="size-8 rounded-full text-muted-foreground hover:text-foreground"
                  title="Copiar JSON"
                  onClick={(e) => void handleCopy(e)}
                >
                  <Copy className="size-3.5" strokeWidth={2} aria-hidden />
                </Button>
              </div>

              {moveMenuOpen ? (
                <div
                  className="absolute left-1/2 top-full z-30 mt-1 w-[min(100%,240px)] -translate-x-1/2 rounded-lg border border-border bg-popover p-1 shadow-md"
                  onMouseDown={(e) => e.stopPropagation()}
                >
                  <p className="px-2 py-1 text-[10px] font-medium uppercase tracking-wide text-muted-foreground">
                    Mover para
                  </p>
                  {row.folder_id ? (
                    <button
                      type="button"
                      className="flex w-full rounded-md px-2 py-1.5 text-left text-xs text-foreground hover:bg-accent"
                      onClick={() => pickFolder(null)}
                    >
                      Cofre principal
                    </button>
                  ) : null}
                  {otherFolders.length === 0 && !row.folder_id ? (
                    <p className="px-2 py-2 text-xs text-muted-foreground">
                      Crie uma pasta acima para organizar.
                    </p>
                  ) : null}
                  {otherFolders.map((f) => (
                    <button
                      key={f.id}
                      type="button"
                      className="flex w-full rounded-md px-2 py-1.5 text-left text-xs text-foreground hover:bg-accent"
                      onClick={() => pickFolder(f.id)}
                    >
                      {f.name}
                    </button>
                  ))}
                </div>
              ) : null}
            </div>

            <div className="flex min-w-0 items-start gap-1.5">
              <GripVertical
                className="mt-0.5 size-3.5 shrink-0 text-muted-foreground/50"
                aria-hidden
              />
              <div className="min-w-0 flex-1">
                <p className="line-clamp-1 text-[15px] font-semibold leading-snug tracking-tight text-card-foreground">
                  {title}
                </p>
                {displaySnippet ? (
                  <p
                    className={cn(
                      'mt-1 text-xs leading-relaxed text-muted-foreground',
                      snippetClampClass,
                    )}
                  >
                    {displaySnippet}
                  </p>
                ) : null}
              </div>
            </div>

            <div className="mt-auto flex flex-wrap items-center justify-between gap-x-2 gap-y-1.5 pt-3">
              <div className="flex min-w-0 flex-wrap items-center gap-1">
                {isTaskType(row.task_type) ? (
                  <TaskTypeChip
                    type={row.task_type}
                    className="scale-[0.92] px-2 py-px text-[10px]"
                  />
                ) : (
                  <span className="rounded-full border border-border bg-muted px-2 py-0.5 text-[10px] text-muted-foreground">
                    {row.task_type}
                  </span>
                )}
                <span className="rounded-full bg-muted px-2 py-0.5 text-[10px] font-medium text-muted-foreground">
                  {plat}
                </span>
                {isFav ? (
                  <span className="rounded-full border border-amber-500/30 bg-amber-500/10 px-2 py-0.5 text-[10px] font-medium text-amber-600 dark:text-amber-400">
                    favorito
                  </span>
                ) : null}
                {isOptimized(row) ? (
                  <span className="rounded-full border border-success/30 bg-success/10 px-2 py-0.5 text-[10px] font-semibold text-success-foreground">
                    otimizado
                  </span>
                ) : null}
              </div>
              <time
                className="shrink-0 text-[11px] tabular-nums text-muted-foreground"
                dateTime={row.created_at}
              >
                {formatRelativeDate(row.created_at)}
              </time>
            </div>
          </div>
        </div>
      </div>
    </li>
  );
}
