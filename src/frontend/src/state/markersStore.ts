import { create } from 'zustand';
import type { Marker } from '@/lib/ecg/chart/types';

/** Estado de apertura del formulario de marcadores (FEAT-003b, Block 1): compartido entre
 * `ECGChart` (dispara `create`) y `MarkerList` (dispara `edit`), que son componentes hermanos. */
export type MarkerFormState =
  | { mode: 'create'; time: number }
  | { mode: 'edit'; markerId: string }
  | null;

/** Normaliza una etiqueta de marcador: trim, y `'' → null`. Compartida por `addMarker`/`updateMarker`. */
function normalizeLabel(label: string | null): string | null {
  const trimmed = label?.trim() ?? '';
  return trimmed === '' ? null : trimmed;
}

export interface MarkersState {
  /** Marcadores creados; sin orden garantizado (el orden cronológico lo resuelve el consumidor). */
  markers: Marker[];
  /** Estado del formulario de creación/edición; `null` cuando está cerrado. */
  formState: MarkerFormState;
  /** Crea un marcador en `time` con `label` (etiquetas en blanco tras `trim()` se guardan como `null`). */
  addMarker: (time: number, label: string | null) => void;
  /** Reemplaza la etiqueta del marcador con ese `id`. No-op silencioso si `id` no existe. */
  updateMarker: (id: string, label: string | null) => void;
  /** Quita el marcador con ese `id`. No-op silencioso si `id` no existe. */
  removeMarker: (id: string) => void;
  /** Abre el formulario en modo creación, en `time`. */
  openCreateForm: (time: number) => void;
  /** Abre el formulario en modo edición para `markerId` (no valida que exista). */
  openEditForm: (markerId: string) => void;
  /** Cierra el formulario. */
  closeForm: () => void;
  /** Vuelve todo a los defaults (memoria volátil; sin persistencia — AGENTS.md). */
  reset: () => void;
}

const DEFAULTS: Pick<MarkersState, 'markers' | 'formState'> = {
  markers: [],
  formState: null,
};

/**
 * Store Zustand de marcadores de evento (FEAT-003a Block 2, extendido en FEAT-003b Block 1).
 * Desacoplado de `viewStore`/`signalStore` (ADR-001): no los importa ni contamina su `reset()`.
 * Estado global en memoria; no se persiste.
 */
export const useMarkersStore = create<MarkersState>((set) => ({
  ...DEFAULTS,
  addMarker: (time, label) => {
    const marker: Marker = {
      id: crypto.randomUUID(),
      time,
      label: normalizeLabel(label),
    };
    set((s) => ({ markers: [...s.markers, marker] }));
  },
  updateMarker: (id, label) => {
    set((s) => ({
      markers: s.markers.map((m) => (m.id === id ? { ...m, label: normalizeLabel(label) } : m)),
    }));
  },
  removeMarker: (id) => {
    set((s) => ({ markers: s.markers.filter((m) => m.id !== id) }));
  },
  openCreateForm: (time) => set({ formState: { mode: 'create', time } }),
  openEditForm: (markerId) => set({ formState: { mode: 'edit', markerId } }),
  closeForm: () => set({ formState: null }),
  reset: () => set({ ...DEFAULTS }),
}));
