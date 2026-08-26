import type { ReactNode } from 'react';

interface SidebarSectionProps {
  title: string;
  /** Si la sección arranca desplegada. Por defecto, colapsada. */
  defaultOpen?: boolean;
  children?: ReactNode;
}

/**
 * Sección colapsable del sidebar (FEAT-009, Block 1). Usa `<details>`/`<summary>`
 * nativos —el mismo patrón ya probado en `MarkerList`— en vez de estado propio:
 * el navegador maneja el toggle y la accesibilidad. Sin `children` renderiza
 * solo el título, sin lanzar.
 */
export function SidebarSection({ title, defaultOpen = false, children }: SidebarSectionProps) {
  return (
    <details open={defaultOpen} className="border-b border-slate-700">
      <summary className="cursor-pointer px-4 py-2 text-xs font-semibold tracking-wide text-slate-300 uppercase hover:bg-slate-800">
        {title}
      </summary>

      {children ? (
        <div className="flex flex-col gap-2 px-4 pt-1 pb-3 text-sm">{children}</div>
      ) : null}
    </details>
  );
}
