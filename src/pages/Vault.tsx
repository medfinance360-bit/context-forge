import { useState, useMemo } from 'react';
import { Plus, Search, FolderPlus, Trash2 } from 'lucide-react';
import { toast } from 'sonner';
import { PromptCard } from '../components/PromptCard';
import { SavePromptDialog } from '../components/SavePromptDialog';
import { Button } from '../components/ui/button';
import { useFolders, useInsertFolder, useDeleteFolder } from '../hooks/useFolders';
import { useAllPrompts, useInsertPrompt, useUpdatePrompt, useDeletePrompt, useToggleFavorite } from '../hooks/usePrompts';
import type { Prompt, PromptColor } from '../lib/types';
import { cn } from '../lib/utils';

type TabId = 'all' | 'favorites' | string; // string = folder id

export function Vault() {
  const [activeTab, setActiveTab] = useState<TabId>('all');
  const [search, setSearch] = useState('');
  const [showNew, setShowNew] = useState(false);
  const [editPrompt, setEditPrompt] = useState<Prompt | null>(null);
  const [newFolderMode, setNewFolderMode] = useState(false);
  const [newFolderName, setNewFolderName] = useState('');

  const { data: folders = [] } = useFolders();
  const { data: allPrompts = [], isLoading } = useAllPrompts();
  const insertPrompt = useInsertPrompt();
  const updatePrompt = useUpdatePrompt();
  const deletePrompt = useDeletePrompt();
  const toggleFavorite = useToggleFavorite();
  const insertFolder = useInsertFolder();
  const deleteFolder = useDeleteFolder();

  const visiblePrompts = useMemo(() => {
    let list = allPrompts;
    if (activeTab === 'favorites') {
      list = list.filter(p => p.is_favorite);
    } else if (activeTab !== 'all') {
      list = list.filter(p => p.folder_id === activeTab);
    }
    if (search.trim()) {
      const q = search.toLowerCase();
      list = list.filter(
        p =>
          p.title.toLowerCase().includes(q) ||
          p.content.toLowerCase().includes(q) ||
          p.tags.some(t => t.toLowerCase().includes(q)),
      );
    }
    return list;
  }, [allPrompts, activeTab, search]);

  async function handleCopy(content: string) {
    try {
      await navigator.clipboard.writeText(content);
      toast.success('Copiado.');
    } catch {
      toast.error('Não foi possível copiar.');
    }
  }

  async function handleSaveNew(data: { title: string; content: string; tags: string[]; color: PromptColor; folder_id: string | null }) {
    await insertPrompt.mutateAsync(data);
    setShowNew(false);
    toast.success('Prompt salvo.');
  }

  async function handleUpdate(data: { title: string; content: string; tags: string[]; color: PromptColor; folder_id: string | null }) {
    if (!editPrompt) return;
    await updatePrompt.mutateAsync({ id: editPrompt.id, payload: data });
    setEditPrompt(null);
    toast.success('Prompt atualizado.');
  }

  async function handleCreateFolder() {
    const name = newFolderName.trim();
    if (!name) return;
    await insertFolder.mutateAsync(name);
    setNewFolderName('');
    setNewFolderMode(false);
  }

  return (
    <div className="mx-auto flex h-full min-h-0 w-full max-w-5xl flex-1 flex-col px-4 py-6 sm:px-6">
      {/* Folder tabs */}
      <div className="mb-5 flex flex-wrap items-center gap-1.5 border-b border-border pb-4">
        {([
          { id: 'all',       label: 'Cofre' },
          { id: 'favorites', label: '★ Favoritos' },
          ...folders.map(f => ({ id: f.id, label: f.name })),
        ] as { id: TabId; label: string }[]).map(tab => (
          <button
            key={tab.id}
            type="button"
            onClick={() => setActiveTab(tab.id)}
            className={cn(
              'flex items-center gap-1.5 rounded-full px-3.5 py-1.5 text-[12px] font-medium transition-colors',
              activeTab === tab.id
                ? 'bg-foreground text-background'
                : 'text-muted-foreground hover:bg-muted hover:text-foreground',
            )}
          >
            {tab.id !== 'all' && tab.id !== 'favorites' && (
              <span className="opacity-50">📁</span>
            )}
            {tab.label}
          </button>
        ))}

        {newFolderMode ? (
          <div className="flex items-center gap-1">
            <input
              autoFocus
              value={newFolderName}
              onChange={e => setNewFolderName(e.target.value)}
              onKeyDown={e => {
                if (e.key === 'Enter') void handleCreateFolder();
                if (e.key === 'Escape') { setNewFolderMode(false); setNewFolderName(''); }
              }}
              placeholder="Nome da pasta"
              className="h-7 w-36 rounded-full border border-border bg-background px-3 text-[12px] text-foreground outline-none focus:border-ring"
            />
            <button
              type="button"
              onClick={() => void handleCreateFolder()}
              className="text-[11px] text-muted-foreground hover:text-foreground"
            >
              ✓
            </button>
          </div>
        ) : (
          <button
            type="button"
            onClick={() => setNewFolderMode(true)}
            className="flex items-center gap-1 rounded-full px-2 py-1.5 text-[12px] text-muted-foreground/50 hover:text-muted-foreground"
          >
            <FolderPlus className="size-3.5" />
          </button>
        )}
      </div>

      {/* Header */}
      <div className="mb-4 flex items-center justify-between gap-4">
        <div>
          <h1 className="text-base font-medium text-foreground">
            {activeTab === 'all'
              ? 'Cofre'
              : activeTab === 'favorites'
                ? 'Favoritos'
                : folders.find(f => f.id === activeTab)?.name ?? ''}
          </h1>
          <p className="text-[11px] text-muted-foreground">
            {visiblePrompts.length} {visiblePrompts.length === 1 ? 'prompt' : 'prompts'}
          </p>
        </div>

        <div className="flex items-center gap-2">
          {/* Search */}
          <div className="relative">
            <Search className="absolute left-2.5 top-1/2 size-3.5 -translate-y-1/2 text-muted-foreground/50" />
            <input
              value={search}
              onChange={e => setSearch(e.target.value)}
              placeholder="Buscar prompts…"
              className="h-8 w-48 rounded-full border border-border bg-background pl-7 pr-3 text-[12px] text-foreground placeholder:text-muted-foreground/40 outline-none focus:border-ring sm:w-64"
            />
          </div>

          {/* Delete folder */}
          {activeTab !== 'all' && activeTab !== 'favorites' && (
            <button
              type="button"
              onClick={() => {
                void deleteFolder.mutateAsync(activeTab);
                setActiveTab('all');
              }}
              className="rounded-lg p-1.5 text-muted-foreground/40 hover:text-destructive"
              title="Excluir pasta"
            >
              <Trash2 className="size-4" />
            </button>
          )}

          <Button
            size="sm"
            className="h-8 gap-1.5 rounded-full px-3.5 text-[12px]"
            onClick={() => setShowNew(true)}
          >
            <Plus className="size-3.5" strokeWidth={2.5} />
            Novo Prompt
          </Button>
        </div>
      </div>

      {/* Grid */}
      {isLoading ? (
        <div className="flex flex-1 items-center justify-center">
          <p className="text-[12px] text-muted-foreground">Carregando…</p>
        </div>
      ) : visiblePrompts.length === 0 ? (
        <div className="flex flex-1 flex-col items-center justify-center gap-3 py-20">
          <p className="text-sm text-muted-foreground">
            {search ? 'Nenhum resultado.' : 'Nenhum prompt aqui ainda.'}
          </p>
          {!search && (
            <Button
              variant="outline"
              size="sm"
              className="gap-1.5 rounded-full"
              onClick={() => setShowNew(true)}
            >
              <Plus className="size-3.5" />
              Criar prompt
            </Button>
          )}
        </div>
      ) : (
        <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
          {visiblePrompts.map(p => (
            <PromptCard
              key={p.id}
              prompt={p}
              onEdit={setEditPrompt}
              onDelete={id => void deletePrompt.mutateAsync(id)}
              onCopy={handleCopy}
              onToggleFavorite={(id, cur) => void toggleFavorite.mutateAsync({ id, isFavorite: !cur })}
            />
          ))}
        </div>
      )}

      {/* Dialogs */}
      {showNew && (
        <SavePromptDialog
          onSave={data => void handleSaveNew(data)}
          onClose={() => setShowNew(false)}
          loading={insertPrompt.isPending}
        />
      )}
      {editPrompt && (
        <SavePromptDialog
          prompt={editPrompt}
          onSave={data => void handleUpdate(data)}
          onClose={() => setEditPrompt(null)}
          loading={updatePrompt.isPending}
        />
      )}
    </div>
  );
}
