import { Outlet } from 'react-router-dom';
import { BuildIdIndicator } from './BuildIdIndicator';
import { Navbar } from './Navbar';

export function AppShell() {
  return (
    <div className="safe-x flex min-h-svh flex-col bg-background antialiased">
      <Navbar />
      <main className="flex min-h-0 flex-1 flex-col">
        <Outlet />
      </main>
      <footer className="safe-bottom safe-x border-t border-border bg-background px-4 py-2">
        <BuildIdIndicator />
      </footer>
    </div>
  );
}
