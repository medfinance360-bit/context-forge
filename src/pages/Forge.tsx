import { useState, useRef } from 'react';
import { Sparkles, Copy, BookmarkPlus, RotateCcw } from 'lucide-react';
import { toast } from 'sonner';
import { Button } from '../components/ui/button';
import { Textarea } from '../components/ui/textarea';
import { SavePromptDialog } from '../components/SavePromptDialog';
import { usePromptMaker } from '../hooks/usePromptMaker';
import { useInsertPrompt } from '../hooks/usePrompts';
import type { PromptColor } from '../lib/types';
import { cn } from '../lib/utils';

function extractPromptBody(content: string): string {
  const idx = content.search(/\bSelf-check:\s*```json/i);
  return idx > 0 ? content.slice(0, idx).trim() : content.trim();
}

function extractAudit(content: string): { score: number; status: string } | null {
  const match = content.match(/AUDIT REPORT:\s*```json\s*([\s\S]*?)```/i);
  if (!match) return null;
  try {
    const d = JSON.parse(match[1]);
    if (typeof d.score === 'number' && typeof d.status === 'string') return { score: d.score, status: d.status };
    return null;
  } catch { return null; }
}

function parseResult(content: string) {
  const body = extractPromptBody(content);
  const sections: { title: string; body: string }[] = [];
  const regex = /##\s+(.+?)\n([\s\S]*?)(?=\n##\s|\s*$)/g;
  let m: RegExpExecArray | null;
  while ((m = regex.exec(body)) !== null) {
    const s = m[2].trim();
    if (s) sections.push({ title: m[1].trim(), body: s });
  }
  return sections.length > 0 ? sections : [{ title: 'Resultado', body }];
}

export function Forge() {
  const [input, setInput] = useState('');
  const [showSave, setShowSave] = useState(false);
  const inputRef = useRef<HTMLTextAreaElement>(null);
  const { state, generate, reset } = usePromptMaker();
  const insertPrompt = useInsertPrompt();

  const isLoading = state.status === 'loading';
  const isDone = state.status === 'done';

  async function handleGenerate() {
    const trimmed = input.trim();
    if (!trimmed) { toast.error('Descreva o que precisa primeiro.'); return; }
    await generate(trimmed);
  }

  async function handleCopy() {
    if (!state.content) return;
    try {
      await navigator.clipboard.writeText(extractPromptBody(state.content));
      toast.success('Prompt copiado.');
    } catch { toast.error('Não foi possível copiar.'); }
  }

  async function handleSave(data: { title: string; content: string; tags: string[]; color: PromptColor; folder_id: string | null }) {
    await insertPrompt.mutateAsync(data);
    setShowSave(false);
    toast.success('Salvo no cofre.');
  }

  function handleReset() {
    reset(); setInput('');
    requestAnimationFrame(() => inputRef.current?.focus());
  }

  const sections = isDone ? parseResult(state.content) : [];
  const audit = isDone ? extractAudit(state.content) : null;

  return (
    <div className="mx-auto flex min-h-0 w-full max-w-5xl flex-1 flex-col px-4 py-6 sm:px-6">
      <div className={cn('flex min-h-0 flex-1 gap-8', isDone ? 'flex-col sm:flex-row' : 'flex-col items-center justify-center')}>

        {/* Input panel */}
        <div className={cn('flex flex-col gap-4', isDone ? 'sm:w-[380px] sm:shrink-0' : 'w-full max-w-2xl')}>
          {!isDone && (
            <div className="flex flex-col gap-1 text-center">
              <h1 className="text-2xl font-light tracking-tight text-foreground">PromptMaker</h1>
              <p className="text-sm text-muted-foreground">Descreva o que precisa. Receba a arquitetura certa.</p>
            </div>
          )}
          {isDone && <p className="text-[11px] font-semibold uppercase tracking-[0.12em] text-muted-foreground">Seu pedido</p>}

          <div className="flex flex-col gap-1">
            <Textarea
              ref={inputRef}
              value={input}
              onChange={e => setInput(e.target.value)}
              disabled={isLoading}
              placeholder="Ex: Preciso de um GPT que triaje leads de WhatsApp para um escritório de advocacia trabalhista…"
              className={cn('resize-y text-base leading-relaxed sm:text-sm', isDone ? 'min-h-[120px]' : 'min-h-[200px] sm:min-h-[260px]')}
              onKeyDown={e => { if (e.key === 'Enter' && (e.metaKey || e.ctrlKey)) void handleGenerate(); }}
            />
            <p className="text-right text-[10px] text-muted-foreground/40">⌘+Enter para gerar</p>
          </div>

          <Button size="lg" disabled={isLoading || !input.trim()} onClick={() => void handleGenerate()} className="h-12 gap-2 rounded-xl text-base sm:text-sm">
            {isLoading
              ? <><span className="size-4 animate-spin rounded-full border-2 border-primary-foreground/30 border-t-primary-foreground" />Analisando…</>
              : <><Sparkles className="size-4" />{isDone ? 'Gerar novamente' : 'Gerar'}</>}
          </Button>

          {isDone && (
            <div className="flex gap-2">
              <Button variant="outline" size="sm" className="flex-1 gap-1.5 rounded-xl text-xs" onClick={() => void handleCopy()}>
                <Copy className="size-3.5" />Copiar entrega
              </Button>
              <Button variant="outline" size="sm" className="flex-1 gap-1.5 rounded-xl text-xs" onClick={() => setShowSave(true)}>
                <BookmarkPlus className="size-3.5" />Salvar
              </Button>
              <button type="button" onClick={handleReset} className="rounded-xl px-2 text-muted-foreground hover:text-foreground" title="Recomeçar">
                <RotateCcw className="size-4" />
              </button>
            </div>
          )}

          {state.status === 'error' && (
            <p className="rounded-xl bg-destructive/10 px-3 py-2 text-[12px] text-destructive">{state.error}</p>
          )}
        </div>

        {/* Result panel */}
        {isDone && (
          <div className="flex min-h-0 flex-1 flex-col gap-4 overflow-y-auto pb-6">
            {audit && (
              <div className="flex items-center gap-2">
                <span className={cn(
                  'rounded-full px-2.5 py-0.5 text-[11px] font-semibold',
                  audit.status === 'APPROVED' ? 'bg-success/15 text-success-foreground' :
                  audit.status === 'APPROVED_WITH_CONDITIONS' ? 'bg-warning/15 text-warning-foreground' :
                  'bg-destructive/15 text-destructive',
                )}>{audit.status.replace(/_/g, ' ')}</span>
                <span className="text-[11px] text-muted-foreground">Score {audit.score.toFixed(1)} / 10.0</span>
              </div>
            )}
            {sections.map((s, i) => (
              <div key={i} className="flex flex-col gap-1.5">
                <p className="text-[10px] font-semibold uppercase tracking-[0.12em] text-muted-foreground">{s.title}</p>
                <div className="rounded-xl border border-border/50 bg-muted/20 px-4 py-3">
                  <pre className="whitespace-pre-wrap font-sans text-[13px] leading-relaxed text-foreground/90">{s.body}</pre>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {showSave && (
        <SavePromptDialog
          initialContent={extractPromptBody(state.content)}
          initialTitle={input.slice(0, 60)}
          onSave={data => void handleSave(data)}
          onClose={() => setShowSave(false)}
          loading={insertPrompt.isPending}
        />
      )}
    </div>
  );
}
