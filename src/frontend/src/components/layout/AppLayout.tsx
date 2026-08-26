import type { ReactNode } from 'react';
import { TopBar } from './TopBar';

interface AppLayoutProps {
  /** Contenido de la columna izquierda (sidebar). Requerido: el shell son dos columnas. */
  sidebar: ReactNode;
  children: ReactNode;
}

/**
 * Shell de dos columnas de la app (FEAT-009, Block 1): sidebar oscuro fijo a la
 * izquierda y panel de contenido claro a la derecha, con scroll propio. El panel
 * principal arranca con el `TopBar` (Block 2) sobre el contenido.
 */
export function AppLayout({ sidebar, children }: AppLayoutProps) {
  return (
    <div className="flex h-screen bg-slate-100">
      <aside
        aria-label="Navegación de ECGViewer"
        className="w-64 shrink-0 overflow-y-auto bg-slate-900 text-slate-100"
      >
        {sidebar}
      </aside>
      <main className="flex-1 overflow-auto p-6">
        <TopBar />
        {children}
      </main>
    </div>
  );
}
