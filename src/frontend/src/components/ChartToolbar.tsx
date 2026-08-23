import { cn } from '@/lib/utils';
import { useViewStore } from '@/state/viewStore';

/**
 * Barra de herramientas del gráfico ECG (FEAT-002, Block 4). Controles nativos
 * (`<button>`) con `aria-label`, siguiendo el patrón de `CsvUpload`: selectores
 * granulares por campo del `viewStore`, sin lógica propia más allá de leer/escribir
 * el store. Toggle Zoom (FR-03), "Restablecer zoom" (FR-05), toggle Rejilla (FR-06),
 * toggle Marcar (FEAT-003a, FR-01), toggle Regla (FEAT-004, FR-01) y toggle Recorte
 * (FEAT-005, FR-01).
 */
export function ChartToolbar() {
  const activeTool = useViewStore((s) => s.activeTool);
  const gridVisible = useViewStore((s) => s.gridVisible);
  const setActiveTool = useViewStore((s) => s.setActiveTool);
  const resetZoom = useViewStore((s) => s.resetZoom);
  const toggleGrid = useViewStore((s) => s.toggleGrid);

  const isZoomActive = activeTool === 'zoom';
  const isMarkActive = activeTool === 'mark';
  const isRulerActive = activeTool === 'ruler';
  const isCropActive = activeTool === 'crop';

  const handleToggleZoom = () => {
    setActiveTool(isZoomActive ? 'none' : 'zoom');
  };

  const handleToggleMark = () => {
    setActiveTool(isMarkActive ? 'none' : 'mark');
  };

  const handleToggleRuler = () => {
    setActiveTool(isRulerActive ? 'none' : 'ruler');
  };

  const handleToggleCrop = () => {
    setActiveTool(isCropActive ? 'none' : 'crop');
  };

  return (
    <section
      aria-label="Herramientas del gráfico"
      className="mx-auto flex max-w-3xl items-center gap-2"
    >
      <button
        type="button"
        aria-label="Activar herramienta de zoom"
        aria-pressed={isZoomActive}
        onClick={handleToggleZoom}
        className={cn(
          'rounded-md border px-3 py-1.5 text-sm font-medium transition-colors',
          isZoomActive
            ? 'border-sky-600 bg-sky-600 text-white'
            : 'border-slate-300 bg-white text-slate-700 hover:bg-slate-50',
        )}
      >
        Zoom
      </button>

      <button
        type="button"
        aria-label="Activar herramienta de marcador"
        aria-pressed={isMarkActive}
        onClick={handleToggleMark}
        className={cn(
          'rounded-md border px-3 py-1.5 text-sm font-medium transition-colors',
          isMarkActive
            ? 'border-sky-600 bg-sky-600 text-white'
            : 'border-slate-300 bg-white text-slate-700 hover:bg-slate-50',
        )}
      >
        Marcar
      </button>

      <button
        type="button"
        aria-label="Activar herramienta de regla"
        aria-pressed={isRulerActive}
        onClick={handleToggleRuler}
        className={cn(
          'rounded-md border px-3 py-1.5 text-sm font-medium transition-colors',
          isRulerActive
            ? 'border-sky-600 bg-sky-600 text-white'
            : 'border-slate-300 bg-white text-slate-700 hover:bg-slate-50',
        )}
      >
        Regla
      </button>

      <button
        type="button"
        aria-label="Activar herramienta de recorte"
        aria-pressed={isCropActive}
        onClick={handleToggleCrop}
        className={cn(
          'rounded-md border px-3 py-1.5 text-sm font-medium transition-colors',
          isCropActive
            ? 'border-sky-600 bg-sky-600 text-white'
            : 'border-slate-300 bg-white text-slate-700 hover:bg-slate-50',
        )}
      >
        Recorte
      </button>

      <button
        type="button"
        aria-label="Restablecer zoom"
        onClick={resetZoom}
        className="rounded-md border border-slate-300 bg-white px-3 py-1.5 text-sm font-medium text-slate-700 hover:bg-slate-50"
      >
        Restablecer zoom
      </button>

      <button
        type="button"
        aria-label="Mostrar u ocultar rejilla"
        aria-pressed={gridVisible}
        onClick={toggleGrid}
        className={cn(
          'rounded-md border px-3 py-1.5 text-sm font-medium transition-colors',
          gridVisible
            ? 'border-sky-600 bg-sky-600 text-white'
            : 'border-slate-300 bg-white text-slate-700 hover:bg-slate-50',
        )}
      >
        Rejilla
      </button>
    </section>
  );
}
