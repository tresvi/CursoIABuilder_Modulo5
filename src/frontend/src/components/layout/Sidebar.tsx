import type { ReactNode } from 'react';

interface SidebarProps {
  children: ReactNode;
}

/**
 * Columna oscura del shell (FEAT-009, Block 1): título de la app y las
 * `SidebarSection` que reciba por `children`. Puramente estructural.
 */
export function Sidebar({ children }: SidebarProps) {
  return (
    <div className="flex flex-col">
      <h1 className="px-4 py-4 text-lg font-bold text-white">ECGViewer</h1>
      <nav aria-label="Secciones" className="flex flex-col">
        {children}
      </nav>
    </div>
  );
}
