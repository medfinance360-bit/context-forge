import {
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
  type MouseEvent as ReactMouseEvent,
} from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useQueryClient } from '@tanstack/react-query';
import { LayoutGrid, List, Package, Plus, Search, FolderPlus } from 'lucide-react';
import { toast } from 'sonner';
import { VaultPackageCard } from '../components/VaultPackageCard';
import { Button } from '../components/ui/button';
import { Input } from '../components/ui/input';
import { useVaultFolders } from '../hooks/useVaultFolders';
import { useVaultPackages, type VaultPackageRow } from '../hooks/useVaultPackages';
import {
  createVaultFolder,
  movePackageToFolder,
  setPackageFavorite,
} from '../integrations/supabase/vaultActions';
import { TASK_TYPES, type TaskType } from '../lib/contract';
import { cn } from '../lib/utils';

const TASK_TAB_LABEL: Record<TaskType, string> = {
  REASONING: 'Raciocínio',
  EXTRACTION: 'Extração',
  AGENT: 'Agente',
  CODE: 'Código',
};

type ViewMode = 'grid' | 'list';

export function Vault() {
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const { data: rows = [], isLoading } = useVaultPackages();
  const { data: folders = [] } = useVaultFolders();

  const [folderScopeId, setFolderScopeId] = useState<string | null>(null);
  const [q, setQ] = useState('');
  const [filterType, setFilterType] = useState<TaskType | 'all'>('all');
  const [view, setView] = useState<ViewMode>('grid');
  const [moveMenuPackageId, setMoveMenuPackageId] = useState<string | null>(null);
  const [creatingFolder, setCreatingFolder] = useState(false);
  const [newFolderName, setNewFolderName] = useState('');

  const searchRef = useRef<HTMLInputElement>(null);

  const focusSearch = useCallback(() => {
    searchRef.current?.focus();
    searchRef.current?.select();
  }, []);

  useEffect(() => {
    function onKey(e: KeyboardEvent) {
      if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === 'k') {
        e.preventDefault();
        focusSearch();
      }
    }
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [focusSearch]);

  const inboxCount = useMemo(
    () => rows.filter((r) => r.folder_id == null).length,
    [rows],
  );

  const inScope = useMemo(() => {
    if (folderScopeId === null) {
      return rows.filter((r) => r.folder_id == null);
    }
    return rows.filter((r) => r.folder_id === folderScopeId);
  }, [rows, folderScopeId]);

  const filtered = useMemo(() => {
    let list = inScope;
    if (filterType !== 'all') {
      list = list.filter((r) => r.task_type === filterType);
    }
    const s = q.trim().toLowerCase();
    if (!s) return list;
    return list.filter(
      (r) =>
        r.raw_input.toLowerCase().includes(s) ||
        r.task_type.toLowerCase().includes(s) ||
        r.target_platform.toLowerCase().includes(s),
    );
  }, [inScope, q, filterType]);

  const displayRows = useMemo(() => {
    return [...filtered].sort((a, b) => {
      if (a.is_favorite !== b.is_favorite) return a.is_favorite ? -1 : 1;
      return new Date(b.created_at).getTime() - new Date(a.created_at).getTime();
    });
  }, [filtered]);

  const folderCounts = useMemo(() => {
    const m = new Map<string, number>();
    for (const r of rows) {
      if (r.folder_id) m.set(r.folder_id, (m.get(r.folder_id) ?? 0) + 1);
    }
    return m;
  }, [rows]);

  const activeFolder = folders.find((f) => f.id === folderScopeId);

  function openInForge(row: VaultPackageRow) {
    navigate('/forge', { state: { row } });
  }

  const showEmpty = !isLoading && displayRows.length === 0;

  const snippetClampClass =
    '[display:-webkit-box] [-webkit-line-clamp:2] [-webkit-box-orient:vertical] overflow-hidden';

  async function handleCreateFolder() {
    const name = newFolderName.trim();
    if (!name) {
      toast.error('Digite um nome para a pasta.');
      return;
    }
    try {
      await createVaultFolder(name);
      setNewFolderName('');
      setCreatingFolder(false);
      void queryClient.invalidateQueries({ queryKey: ['vault-folders'] });
      toast.success('Pasta criada.');
    } catch (e) {
      toast.error(e instanceof Error ? e.message : 'Não foi possível criar a pasta.');
    }
  }

  async function handleToggleFavorite(row: VaultPackageRow) {
    try {
      await setPackageFavorite(row.id, !row.is_favorite);
      void queryClient.invalidateQueries({ queryKey: ['vault-packages'] });
    } catch (e) {
      toast.error(e instanceof Error ? e.message : 'Não foi possível atualizar.');
    }
  }

  async function handleMoveToFolder(packageId: string, folderId: string | null) {
    try {
      await movePackageToFolder(packageId, folderId);
      void queryClient.invalidateQueries({ queryKey: ['vault-packages'] });
      toast.success(folderId ? 'Movido para a pasta.' : 'Devolvido ao cofre principal.');
    } catch (e) {
      toast.error(e instanceof Error ? e.message : 'Não foi possível mover.');
    }
  }

  function toggleMoveMenu(e: ReactMouseEvent<HTMLButtonElement>, id: string) {
    e.stopPropagation();
    setMoveMenuPackageId((p) => (p === id ? null : id));
  }

  const scopeTitle =
    folderScopeId === null
      ? 'Cofre principal'
      : activeFolder?.name ?? 'Pasta';

  const scopeCountLabel =
    inScope.length === 1 ? '1 pacote' : `${inScope.length} pacotes`;

  return (
    <div className="mx-auto max-w-[min(100%,1400px)] px-4 py-6 sm:py-8">
      <header className="space-y-2 border-b border-border/40 pb-6">
        <h1 className="text-3xl font-semibold tracking-tight text-foreground sm:text-4xl">
          Cofre
        </h1>
        <p className="max-w-2xl text-sm leading-relaxed text-muted-foreground sm:text-[15px]">
          {isLoading ? (
            'Carregando…'
          ) : (
            <>
              <span className="text-foreground/90">{scopeTitle}</span>
              {' — '}
              {scopeCountLabel}
              {filtered.length !== inScope.length ? (
                <span className="text-muted-foreground/80">
                  {' '}
                  · {filtered.length} neste filtro
                </span>
              ) : null}
              {folderScopeId === null ? (
                <span className="mt-2 block text-xs text-muted-foreground/90">
                  O que enviar para uma pasta deixa de aparecer aqui — abra a pasta para ver.
                </span>
              ) : null}
            </>
          )}
        </p>

        {folderScopeId !== null ? (
          <button
            type="button"
            onClick={() => {
              setFolderScopeId(null);
              setMoveMenuPackageId(null);
            }}
            className="min-h-11 touch-manipulation py-2 text-left text-sm font-medium text-muted-foreground underline-offset-4 hover:text-foreground hover:underline sm:min-h-0 sm:py-0"
          >
            ← Voltar ao cofre principal
          </button>
        ) : null}
      </header>

      <div className="mt-6 flex flex-col gap-3">
        <div className="flex min-w-0 gap-2 overflow-x-auto pb-1 [-ms-overflow-style:none] [scrollbar-width:none] [&::-webkit-scrollbar]:hidden">
          <button
            type="button"
            onClick={() => {
              setFolderScopeId(null);
              setMoveMenuPackageId(null);
            }}
            className={cn(
              'shrink-0 touch-manipulation rounded-full px-4 py-2.5 text-sm font-medium transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 focus-visible:ring-offset-background sm:px-3.5 sm:py-1.5 sm:text-xs',
              folderScopeId === null
                ? 'bg-primary text-primary-foreground'
                : 'border border-border bg-background text-muted-foreground hover:border-ring hover:text-foreground',
            )}
          >
            Principal ({inboxCount})
          </button>
          {folders.map((f) => (
            <button
              key={f.id}
              type="button"
              onClick={() => {
                setFolderScopeId(f.id);
                setMoveMenuPackageId(null);
              }}
              className={cn(
                'max-w-[200px] shrink-0 touch-manipulation truncate rounded-full px-4 py-2.5 text-sm font-medium transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 focus-visible:ring-offset-background sm:px-3.5 sm:py-1.5 sm:text-xs',
                folderScopeId === f.id
                  ? 'bg-primary text-primary-foreground'
                  : 'border border-border bg-background text-muted-foreground hover:border-ring hover:text-foreground',
              )}
              title={f.name}
            >
              {f.name} ({folderCounts.get(f.id) ?? 0})
            </button>
          ))}
          {creatingFolder ? (
            <div className="flex shrink-0 items-center gap-2 pl-1">
              <Input
                autoFocus
                value={newFolderName}
                onChange={(e) => setNewFolderName(e.target.value)}
                placeholder="Nome da pasta"
                className="h-11 min-h-11 w-[min(100%,240px)] rounded-full text-base sm:h-8 sm:min-h-0 sm:w-40 sm:text-xs md:text-sm"
                onKeyDown={(e) => {
                  if (e.key === 'Enter') void handleCreateFolder();
                  if (e.key === 'Escape') {
                    setCreatingFolder(false);
                    setNewFolderName('');
                  }
                }}
              />
              <Button
                type="button"
                size="sm"
                className="min-h-11 rounded-full px-4 text-base sm:h-8 sm:min-h-0 sm:text-xs"
                onClick={() => void handleCreateFolder()}
              >
                Criar
              </Button>
              <Button
                type="button"
                variant="ghost"
                size="sm"
                className="min-h-11 rounded-full px-4 text-base sm:h-8 sm:min-h-0 sm:text-xs"
                onClick={() => {
                  setCreatingFolder(false);
                  setNewFolderName('');
                }}
              >
                Cancelar
              </Button>
            </div>
          ) : (
            <Button
              type="button"
              variant="outline"
              size="sm"
              className="min-h-11 shrink-0 touch-manipulation gap-1 rounded-full px-4 text-base sm:h-8 sm:min-h-0 sm:text-xs"
              onClick={() => setCreatingFolder(true)}
            >
              <FolderPlus className="size-3.5" aria-hidden />
              Nova pasta
            </Button>
          )}
        </div>
      </div>

      <div className="mt-6 flex min-w-0 flex-col gap-4 sm:flex-row sm:items-center sm:justify-between sm:gap-8 lg:gap-8">
        <div className="flex min-w-0 gap-2 overflow-x-auto pb-1 [-ms-overflow-style:none] [scrollbar-width:none] [&::-webkit-scrollbar]:hidden">
          <button
            type="button"
            onClick={() => setFilterType('all')}
            className={cn(
              'shrink-0 touch-manipulation rounded-full px-4 py-2.5 text-sm font-medium transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 focus-visible:ring-offset-background sm:px-3.5 sm:py-1.5 sm:text-xs',
              filterType === 'all'
                ? 'bg-primary text-primary-foreground'
                : 'border border-border bg-background text-muted-foreground hover:border-ring hover:text-foreground',
            )}
          >
            Todos
          </button>
          {TASK_TYPES.map((tt) => (
            <button
              key={tt}
              type="button"
              onClick={() => setFilterType(tt)}
              className={cn(
                'shrink-0 touch-manipulation rounded-full px-4 py-2.5 text-sm font-medium transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 focus-visible:ring-offset-background sm:px-3.5 sm:py-1.5 sm:text-xs',
                filterType === tt
                  ? 'bg-primary text-primary-foreground'
                  : 'border border-border bg-background text-muted-foreground hover:border-ring hover:text-foreground',
              )}
            >
              {TASK_TAB_LABEL[tt]}
            </button>
          ))}
        </div>

        <div className="flex w-full min-w-0 flex-col gap-3 sm:w-auto sm:flex-row sm:items-center sm:justify-end lg:max-w-xl">
          <div className="relative w-full min-w-0 sm:w-auto sm:min-w-[280px]">
            <Search
              className="pointer-events-none absolute left-3 top-1/2 size-4 -translate-y-1/2 text-muted-foreground"
              aria-hidden
            />
            <Input
              ref={searchRef}
              type="search"
              value={q}
              onChange={(e) => setQ(e.target.value)}
              placeholder="Buscar pacotes…"
              className="h-11 min-h-11 w-full rounded-full pl-10 pr-12 text-base sm:h-10 sm:min-h-0 sm:pr-14 sm:text-sm md:text-sm"
            />
            <kbd className="pointer-events-none absolute right-2.5 top-1/2 hidden -translate-y-1/2 rounded-md border border-border bg-muted px-1.5 py-0.5 font-mono text-[10px] text-muted-foreground sm:inline">
              Ctrl K
            </kbd>
          </div>

          <div className="flex shrink-0 items-center justify-end gap-1.5">
            <div className="flex shrink-0 rounded-full border border-border bg-muted p-0.5">
              <button
                type="button"
                aria-label="Vista em grade"
                onClick={() => setView('grid')}
                className={cn(
                  'flex min-h-11 min-w-11 touch-manipulation items-center justify-center rounded-full p-2 transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 sm:min-h-0 sm:min-w-0 sm:p-1.5',
                  view === 'grid'
                    ? 'bg-primary text-primary-foreground'
                    : 'text-muted-foreground hover:text-foreground',
                )}
              >
                <LayoutGrid className="size-4 shrink-0" />
              </button>
              <button
                type="button"
                aria-label="Vista em lista"
                onClick={() => setView('list')}
                className={cn(
                  'flex min-h-11 min-w-11 touch-manipulation items-center justify-center rounded-full p-2 transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 sm:min-h-0 sm:min-w-0 sm:p-1.5',
                  view === 'list'
                    ? 'bg-primary text-primary-foreground'
                    : 'text-muted-foreground hover:text-foreground',
                )}
              >
                <List className="size-4 shrink-0" />
              </button>
            </div>
          </div>
        </div>
      </div>

      {isLoading ? (
        <p className="mt-10 text-center text-sm text-muted-foreground">Carregando cofre…</p>
      ) : showEmpty ? (
        <div className="flex min-h-[44vh] flex-col items-center justify-center px-4 py-12 text-center">
          <div className="flex size-14 items-center justify-center rounded-lg border border-border bg-card shadow-sm">
            <Package className="size-7 text-muted-foreground" strokeWidth={1.5} aria-hidden />
          </div>
          <h2 className="mt-5 text-lg font-semibold leading-none tracking-tight text-foreground sm:text-xl">
            {rows.length === 0 && folderScopeId === null && !q.trim() && filterType === 'all'
              ? 'Cofre vazio'
              : 'Nenhum resultado'}
          </h2>
          <p className="mt-2 max-w-sm text-sm text-muted-foreground">
            {rows.length === 0 && folderScopeId === null && !q.trim() && filterType === 'all' ? (
              'Forje um pacote na Forja — aparece aqui com intent, JSON e validação.'
            ) : folderScopeId === null &&
              inboxCount === 0 &&
              rows.length > 0 &&
              !q.trim() &&
              filterType === 'all' ? (
              <>
                Tudo está organizado em pastas. Escolha uma pasta acima ou crie uma nova.
              </>
            ) : (
              'Tente outro termo ou filtro.'
            )}
          </p>
          {rows.length === 0 && folderScopeId === null && !q.trim() && filterType === 'all' ? (
            <Button type="button" className="mt-7 rounded-full" asChild>
              <Link to="/forge">
                <Plus className="size-4" strokeWidth={2.5} />
                Nova forja
              </Link>
            </Button>
          ) : null}
        </div>
      ) : (
        <ul
          className={cn(
            'mt-6 gap-3 overflow-visible',
            view === 'grid'
              ? 'grid grid-cols-1 gap-4 sm:grid-cols-2 sm:gap-3 xl:grid-cols-3'
              : 'flex flex-col',
          )}
        >
          {displayRows.map((row) => (
            <VaultPackageCard
              key={row.id}
              row={row}
              view={view}
              folders={folders}
              moveMenuOpen={moveMenuPackageId === row.id}
              onToggleMoveMenu={(e) => toggleMoveMenu(e, row.id)}
              onCloseMoveMenu={() => setMoveMenuPackageId(null)}
              onOpenForge={() => openInForge(row)}
              onToggleFavorite={() => void handleToggleFavorite(row)}
              onMoveToFolder={(folderId) => void handleMoveToFolder(row.id, folderId)}
              snippetClampClass={snippetClampClass}
            />
          ))}
        </ul>
      )}
    </div>
  );
}
