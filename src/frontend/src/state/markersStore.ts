import { create } from 'zustand';
import type { Marker } from '@/lib/ecg/chart/types';

export interface MarkersState {
  /** Marcadores creados; sin orden garantizado (el orden cronológico lo resuelve el consumidor). */
  markers: Marker[];
  /** Crea un marcador en `time` con `label` (etiquetas en blanco tras `trim()` se guardan como `null`). */
  addMarker: (time: number, label: string | null) => void;
  /** Vuelve todo a los defaults (memoria volátil; sin persistencia — AGENTS.md). */
  reset: () => void;
}

const DEFAULTS: Pick<MarkersState, 'markers'> = {
  markers: [],
};

/**
 * Store Zustand de marcadores de evento (FEAT-003a, Block 2).
 * Desacoplado de `viewStore`/`signalStore` (ADR-001): no los importa ni contamina su `reset()`.
 * Estado global en memoria; no se persiste.
 */
export const useMarkersStore = create<MarkersState>((set) => ({
  ...DEFAULTS,
  addMarker: (time, label) => {
    const trimmed = label?.trim() ?? '';
    const marker: Marker = {
      id: crypto.randomUUID(),
      time,
      label: trimmed === '' ? null : trimmed,
    };
    set((s) => ({ markers: [...s.markers, marker] }));
  },
  reset: () => set({ ...DEFAULTS }),
}));
