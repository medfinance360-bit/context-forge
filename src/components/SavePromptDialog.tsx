import { useState } from 'react';
import { X } from 'lucide-react';
import type { Prompt, PromptColor } from '../lib/types';
import { cn } from '../lib/utils';
import { Button } from './ui/button';
import { Input } from './ui/input';
import { Label } from './ui/label';
import { Textarea } from './ui/textarea';
import { useFolders } from '../hooks/useFolders';

const COLORS: { value: PromptColor; label: string; cls: string }[] = [
  { value: 'none',   label: '—',       cls: 'bg-border' },
  { value: 'blue',   label: 'Azul',    cls: 'bg-blue-500' },
  { value: 'green',  label: 'Verde',   cls: 'bg-green-500' },
  { value: 'yellow', label: 'Âmbar',   cls: 'bg-amber-400' },
  { value: 'red',    label: 'Rosa',    cls: 'bg-rose-500' },
  { value: 'purple', label: 'Roxo',    cls: 'bg-purple-500' },
];

interface SavePromptDialogProps {
  initialContent?: string;
  initialTitle?: string;
  prompt?: Prompt;
  onSave: (data: {
    title: string;
    content: string;
    tags: string[];
    color: PromptColor;
    folder_id: string | null;
  }) => void;
  onClose: () => void;
  loading?: boolean;
}

export function SavePromptDialog({
  initialContent = '',
  initialTitle = '',
  prompt,
  onSave,
  onClose,
  loading = false,
}: SavePromptDialogProps) {
  const [title, setTitle] = useState(prompt?.title ?? initialTitle);
  const [content, setContent] = useState(prompt?.content ?? initialContent);
  const [tagsRaw, setTagsRaw] = useState((prompt?.tags ?? []).join(', '));
  const [color, setColor] = useState<PromptColor>(prompt?.color ?? 'none');
  const [folderId, setFolderId] = useState<string | null>(prompt?.folder_id ?? null);

  const { data: folders = [] } = useFolders();

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    const tags = tagsRaw
      .split(',')
      .map(t => t.trim())
      .filter(Boolean);
    onSave({ title, content, tags, color, folder_id: folderId });
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      <div className="absolute inset-0 bg-background/80 backdrop-blur-sm" onClick={onClose} />
      <div className="relative w-full max-w-lg rounded-2xl border border-border bg-card shadow-2xl">
        <div className="flex items-center justify-between border-b border-border px-5 py-4">
          <h2 className="text-sm font-medium text-foreground">
            {prompt ? 'Editar prompt' : 'Salvar no cofre'}
          </h2>
          <button type="button" onClick={onClose} className="text-muted-foreground hover:text-foreground">
            <X className="size-4" />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="flex flex-col gap-4 p-5">
          <div className="flex flex-col gap-1.5">
            <Label className="text-[11px] uppercase tracking-wide text-muted-foreground">Título</Label>
            <Input
              value={title}
              onChange={e => setTitle(e.target.value)}
              placeholder="Nome do prompt"
              autoFocus
            />
          </div>

          <div className="flex flex-col gap-1.5">
            <Label className="text-[11px] uppercase tracking-wide text-muted-foreground">Conteúdo</Label>
            <Textarea
              value={content}
              onChange={e => setContent(e.target.value)}
              className="min-h-[140px] resize-y font-mono text-[12px]"
              placeholder="Cole ou escreva o prompt…"
            />
          </div>

          <div className="flex flex-col gap-1.5">
            <Label className="text-[11px] uppercase tracking-wide text-muted-foreground">Tags</Label>
            <Input
              value={tagsRaw}
              onChange={e => setTagsRaw(e.target.value)}
              placeholder="gpt, agente, análise (separadas por vírgula)"
            />
          </div>

          <div className="flex items-center gap-3">
            <div className="flex flex-col gap-1.5">
              <Label className="text-[11px] uppercase tracking-wide text-muted-foreground">Cor</Label>
              <div className="flex gap-1.5">
                {COLORS.map(c => (
                  <button
                    key={c.value}
                    type="button"
                    onClick={() => setColor(c.value)}
                    title={c.label}
                    className={cn(
                      'size-5 rounded-full border-2 transition-transform hover:scale-110',
                      c.cls,
                      color === c.value ? 'border-foreground' : 'border-transparent',
                    )}
                  />
                ))}
              </div>
            </div>

            {folders.length > 0 && (
              <div className="flex flex-1 flex-col gap-1.5">
                <Label className="text-[11px] uppercase tracking-wide text-muted-foreground">Pasta</Label>
                <select
                  value={folderId ?? ''}
                  onChange={e => setFolderId(e.target.value || null)}
                  className="h-9 w-full rounded-md border border-input bg-background px-2 text-sm text-foreground"
                >
                  <option value="">Sem pasta</option>
                  {folders.map(f => (
                    <option key={f.id} value={f.id}>{f.name}</option>
                  ))}
                </select>
              </div>
            )}
          </div>

          <div className="flex gap-2 pt-1">
            <Button type="button" variant="outline" className="flex-1" onClick={onClose}>
              Cancelar
            </Button>
            <Button type="submit" className="flex-1" disabled={loading || !content.trim()}>
              {loading ? 'Salvando…' : prompt ? 'Atualizar' : 'Salvar'}
            </Button>
          </div>
        </form>
      </div>
    </div>
  );
}
