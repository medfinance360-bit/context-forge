import { useEffect, useState } from 'react';
import { Link, NavLink, useLocation } from 'react-router-dom';
import { LogOut, Menu, Plus, X } from 'lucide-react';
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

const drawerLinkBase =
  'flex min-h-11 w-full items-center rounded-lg px-3 text-base font-medium transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 focus-visible:ring-offset-background active:bg-accent/80';

const drawerNavClass = ({ isActive }: { isActive: boolean }) =>
  cn(
    drawerLinkBase,
    isActive
      ? 'bg-primary text-primary-foreground'
      : 'text-muted-foreground hover:bg-accent/50 hover:text-foreground',
  );

export function Navbar() {
  const location = useLocation();
  const [mobileOpen, setMobileOpen] = useState(false);

  useEffect(() => {
    setMobileOpen(false);
  }, [location.pathname]);

  useEffect(() => {
    if (!mobileOpen) return;
    const prev = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') setMobileOpen(false);
    };
    window.addEventListener('keydown', onKey);
    return () => {
      document.body.style.overflow = prev;
      window.removeEventListener('keydown', onKey);
    };
  }, [mobileOpen]);

  async function handleLogout() {
    const { error } = await supabase.auth.signOut();
    if (error) {
      toast.error('Não foi possível sair.');
      return;
    }
    toast.success('Sessão encerrada.');
    setMobileOpen(false);
  }

  return (
    <>
      <header className="safe-x sticky top-0 z-50 safe-top grid min-h-14 min-[640px]:min-h-16 border-b border-border bg-background/80 backdrop-blur-xl backdrop-saturate-150">
        {/* Mobile: viewport menor que 640px */}
        <div className="col-span-full row-start-1 flex h-14 max-w-[1800px] items-center justify-between justify-self-stretch px-4 min-[640px]:hidden">
          <Link
            to="/forge"
            className="flex min-h-11 min-w-0 items-center gap-2 active:opacity-90"
          >
            <BrandMark
              wordmark
              iconClass="h-7 w-auto max-w-[64px] shrink-0 sm:h-9"
              wordmarkClassName="text-xs font-semibold lowercase tracking-tight text-foreground"
            />
          </Link>
          <Button
            type="button"
            variant="ghost"
            size="icon"
            className="min-h-11 min-w-11 shrink-0"
            aria-expanded={mobileOpen}
            aria-controls="mobile-nav-drawer"
            aria-label={mobileOpen ? 'Fechar menu' : 'Abrir menu'}
            onClick={() => setMobileOpen((o) => !o)}
          >
            <Menu className="size-[22px]" strokeWidth={2} aria-hidden />
          </Button>
        </div>

        {/* Desktop: a partir de 640px */}
        <div className="col-span-full row-start-1 mx-auto hidden h-16 w-full max-w-[1800px] grid-cols-3 items-center gap-2 px-4 min-[640px]:grid">
          <div className="flex min-w-0 justify-start">
            <Link
              to="/forge"
              className="flex min-h-11 min-w-0 items-center gap-2 active:opacity-90"
            >
              <BrandMark
                wordmark
                iconClass="h-[22px] w-auto max-w-[88px] shrink-0"
                wordmarkClassName="text-sm font-semibold lowercase tracking-tight text-foreground"
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

          <div className="flex min-h-11 items-center justify-end gap-2">
            <Button
              variant="default"
              size="sm"
              className="min-h-10 rounded-full px-4"
              asChild
            >
              <Link to="/forge">
                <Plus className="size-4" strokeWidth={2.5} />
                Nova forja
              </Link>
            </Button>
            <Button
              type="button"
              variant="outline"
              size="sm"
              className="min-h-10 rounded-full px-3"
              title="Sair"
              onClick={() => void handleLogout()}
            >
              <LogOut className="size-4" aria-hidden />
              <span>Sair</span>
            </Button>
          </div>
        </div>
      </header>

      {/* Mobile drawer */}
      {mobileOpen ? (
        <div className="fixed inset-0 z-[70] min-[640px]:hidden">
          <button
            type="button"
            className="absolute inset-0 bg-background/80 backdrop-blur-sm"
            aria-label="Fechar menu"
            onClick={() => setMobileOpen(false)}
          />
          <aside
            id="mobile-nav-drawer"
            className="absolute right-0 flex h-full w-[min(100%,320px)] flex-col border-l border-border bg-card pt-[env(safe-area-inset-top,0px)] pb-[env(safe-area-inset-bottom,0px)] pl-4 pr-[max(1rem,env(safe-area-inset-right,0px))] shadow-lg"
          >
            <div className="flex h-14 shrink-0 items-center justify-end border-b border-border pr-0">
              <Button
                type="button"
                variant="ghost"
                size="icon"
                className="min-h-11 min-w-11"
                aria-label="Fechar"
                onClick={() => setMobileOpen(false)}
              >
                <X className="size-5" aria-hidden />
              </Button>
            </div>
            <nav
              className="flex flex-1 flex-col gap-1 py-4"
              aria-label="Navegação móvel"
            >
              <NavLink
                to="/forge"
                end
                className={drawerNavClass}
                onClick={() => setMobileOpen(false)}
              >
                Forja
              </NavLink>
              <NavLink
                to="/vault"
                className={drawerNavClass}
                onClick={() => setMobileOpen(false)}
              >
                Cofre
              </NavLink>
              <Link
                to="/forge"
                className={cn(
                  drawerLinkBase,
                  'gap-2 border border-border/60 bg-background text-foreground hover:bg-accent/40',
                )}
                onClick={() => setMobileOpen(false)}
              >
                <Plus className="size-4 shrink-0" strokeWidth={2.5} />
                Nova forja
              </Link>
              <button
                type="button"
                className={cn(
                  drawerLinkBase,
                  'gap-2 text-left text-muted-foreground hover:bg-accent/50 hover:text-foreground',
                )}
                onClick={() => void handleLogout()}
              >
                <LogOut className="size-4 shrink-0" />
                Sair
              </button>
            </nav>
          </aside>
        </div>
      ) : null}
    </>
  );
}
