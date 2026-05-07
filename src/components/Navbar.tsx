import { Link, NavLink } from 'react-router-dom';
import { LogOut, Plus } from 'lucide-react';
import { toast } from 'sonner';
import { supabase } from '../integrations/supabase/client';
import { BrandMark } from './BrandMark';
import { Button } from './ui/button';
import { cn } from '../lib/utils';

const pillClass = ({ isActive }: { isActive: boolean }) =>
  cn(
    'rounded-full px-4 py-1.5 text-sm font-medium transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 focus-visible:ring-offset-background',
    isActive
      ? 'bg-primary text-primary-foreground'
      : 'text-muted-foreground hover:text-foreground',
  );

export function Navbar() {
  async function handleLogout() {
    const { error } = await supabase.auth.signOut();
    if (error) {
      toast.error('Não foi possível sair.');
      return;
    }
    toast.success('Sessão encerrada.');
  }

  return (
    <header className="sticky top-0 z-50 border-b border-border bg-background/85 backdrop-blur-xl backdrop-saturate-150">
      <div className="mx-auto grid h-11 max-w-[1800px] grid-cols-3 items-center gap-2 px-3 sm:px-4">
        <div className="flex min-w-0 justify-start">
          <Link
            to="/forge"
            className="flex min-w-0 items-center gap-2 transition-opacity hover:opacity-90"
          >
            <BrandMark
              wordmark
              iconClass="h-5 w-auto max-w-[72px] shrink-0 sm:max-w-[88px]"
              wordmarkClassName="text-xs font-semibold tracking-tight text-foreground sm:text-sm"
            />
          </Link>
        </div>

        <nav
          className="flex justify-center justify-self-center"
          aria-label="Secções principais"
        >
          <div className="flex rounded-full border border-border bg-muted p-0.5 shadow-sm">
            <NavLink to="/forge" className={pillClass}>
              Forja
            </NavLink>
            <NavLink to="/vault" className={pillClass}>
              Cofre
            </NavLink>
          </div>
        </nav>

        <div className="flex items-center justify-end gap-1.5 sm:gap-2">
          <Button
            variant="default"
            size="sm"
            className="rounded-full px-3 sm:px-4"
            asChild
          >
            <Link to="/forge">
              <Plus className="size-3.5 sm:size-4" strokeWidth={2.5} />
              Nova forja
            </Link>
          </Button>
          <Button
            type="button"
            variant="outline"
            size="sm"
            className="rounded-full px-2 sm:px-3"
            title="Sair"
            onClick={() => void handleLogout()}
          >
            <LogOut className="size-4" aria-hidden />
            <span className="hidden sm:inline">Sair</span>
          </Button>
        </div>
      </div>
    </header>
  );
}
