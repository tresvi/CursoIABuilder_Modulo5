import { create } from 'zustand';
import type { TimeWindow } from '@/lib/ecg/chart/types';

/** Herramienta de interacción activa sobre el gráfico (FR-03/FR-04). */
export type ChartTool = 'none' | 'zoom';

export interface ViewState {
  /** Ventana temporal actualmente visible; `null` mientras no hay señal (FR-04). */
  visibleWindow: TimeWindow | null;
  /** Rango completo de la señal; fuente de verdad para `resetZoom` (FR-05). */
  fullWindow: TimeWindow | null;
  /** Visibilidad de la rejilla ECG (FR-06). Por defecto visible. */
  gridVisible: boolean;
  /** Herramienta activa (FR-03). Por defecto ninguna. */
  activeTool: ChartTool;
  /** Fija el rango completo y la ventana visible al cargarse una señal (`[t0, tN]`). */
  initForSignal: (fromTime: number, toTime: number) => void;
  /** Acerca la vista a `win` si es válida y cabe en `fullWindow`; si no, no-op (FR-04). */
  setZoomWindow: (win: TimeWindow) => void;
  /** Restablece la vista a la señal completa; no-op si no hay señal (FR-05). */
  resetZoom: () => void;
  /** Alterna la visibilidad de la rejilla (FR-06). */
  toggleGrid: () => void;
  /** Selecciona la herramienta activa (FR-03). */
  setActiveTool: (tool: ChartTool) => void;
  /** Vuelve todo a los defaults (memoria volátil; sin persistencia — AGENTS.md). */
  reset: () => void;
}

const DEFAULTS = {
  visibleWindow: null,
  fullWindow: null,
  gridVisible: true,
  activeTool: 'none',
} as const;

/**
 * Store Zustand del estado de vista del gráfico ECG (FEAT-002, Block 2).
 * Desacoplado de `signalStore` (ADR-001): no lo importa ni contamina su `reset()`.
 * Estado global en memoria; no se persiste.
 */
export const useViewStore = create<ViewState>((set, get) => ({
  ...DEFAULTS,
  initForSignal: (fromTime, toTime) => {
    const full: TimeWindow = { fromTime, toTime };
    set({ fullWindow: full, visibleWindow: { ...full } });
  },
  setZoomWindow: (win) => {
    if (win.fromTime >= win.toTime) {
      return; // invalid-window: rango degenerado o invertido → ignorado.
    }
    const { fullWindow } = get();
    let next: TimeWindow = win;
    if (fullWindow) {
      // Clampeo del rango a los límites de la señal completa.
      const fromTime = Math.max(win.fromTime, fullWindow.fromTime);
      const toTime = Math.min(win.toTime, fullWindow.toTime);
      if (fromTime >= toTime) {
        return; // La intersección con fullWindow es vacía → no-op.
      }
      next = { fromTime, toTime };
    }
    set({ visibleWindow: next });
  },
  resetZoom: () => {
    const { fullWindow } = get();
    if (!fullWindow) {
      return; // reset-without-signal: sin señal → no-op.
    }
    set({ visibleWindow: { ...fullWindow } });
  },
  toggleGrid: () => set((s) => ({ gridVisible: !s.gridVisible })),
  setActiveTool: (tool) => set({ activeTool: tool }),
  reset: () => set({ ...DEFAULTS }),
}));
