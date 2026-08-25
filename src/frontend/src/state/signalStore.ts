import { create } from 'zustand';
import { parseCsv } from '@/lib/ecg/parseCsv';
import { cropSignal } from '@/lib/ecg/crop';
import { applyFilter as applyFilterApi } from '@/lib/api/filters';
import type { FilterType, FilterParams } from '@/lib/api/filters';
import type { ECGSignal, ParseError } from '@/lib/ecg/types';
import type { TimeWindow } from '@/lib/ecg/chart/types';

/**
 * Error del proceso de carga: puede venir del parser (`ParseError`) o de la etapa
 * previa (guardia de tamaño / lectura del archivo), ambas propias de la UI (Block 3).
 */
export type SignalError = ParseError | 'file-too-large' | 'read-error';

/** Estado del ciclo de carga de la señal. */
export type SignalStatus = 'idle' | 'loaded' | 'error';

export interface SignalState {
  /** Señal ingresada; `null` mientras no haya una carga exitosa (FR-03). */
  signal: ECGSignal | null;
  /** Señal previa al último filtro aplicado; `null` si no hay filtro para revertir
   * (undo de un solo nivel — FR-08, excepción documentada en el PRD de FEAT-007b). */
  previousSignal: ECGSignal | null;
  /** Último error de carga; `null` en `idle`/`loaded`. */
  error: SignalError | null;
  status: SignalStatus;
  /** Parsea `text` con `parseCsv` e ingresa la señal, o registra el error (FR-04/FR-05). */
  loadFromText: (text: string) => void;
  /** Registra un error previo al parseo (tamaño/lectura) sin ingresar señal. */
  setError: (error: SignalError) => void;
  /** Vuelve al estado inicial (memoria volátil; no hay persistencia — AGENTS.md). */
  reset: () => void;
  /** Recorta la señal cargada al rango dado (FR-04); no-op si no hay señal o el rango la deja
   * inválida (<2 muestras, ver `cropSignal`). */
  cropToRange: (range: TimeWindow) => void;
  /** Aplica `filterType` con `params` sobre la señal actual (encadenado aditivo, FR-09),
   * guardando la señal pre-filtro en `previousSignal` para poder revertir (FR-08). No-op
   * si no hay señal cargada. */
  applyFilter: (
    filterType: FilterType,
    params: FilterParams,
  ) => Promise<{ ok: boolean; error?: string }>;
  /** Revierte el último filtro aplicado sin llamar al backend (FR-08, undo de un solo
   * nivel); no-op si no hay filtro previo. */
  revertLastFilter: () => void;
}

/**
 * Store Zustand de la señal ECG. Estado global en memoria (ADR-001); no se persiste:
 * los cambios no se guardan solos (regla de AGENTS.md). RF-02 consumirá `signal`.
 */
export const useSignalStore = create<SignalState>((set, get) => ({
  signal: null,
  previousSignal: null,
  error: null,
  status: 'idle',
  loadFromText: (text) => {
    const result = parseCsv(text);
    if (result.ok) {
      set({ signal: result.signal, status: 'loaded', error: null });
    } else {
      set({ signal: null, status: 'error', error: result.error });
    }
  },
  setError: (error) => set({ signal: null, status: 'error', error }),
  reset: () => set({ signal: null, previousSignal: null, status: 'idle', error: null }),
  cropToRange: (range) => {
    const { signal } = get();
    if (!signal) return;
    const cropped = cropSignal(signal, range);
    if (!cropped) return;
    set({ signal: cropped });
  },
  applyFilter: async (filterType, params) => {
    const { signal } = get();
    if (!signal) return { ok: false, error: 'No hay una señal cargada' };
    const result = await applyFilterApi(signal, filterType, params);
    if (!result.ok) return { ok: false, error: result.error };
    set({ previousSignal: signal, signal: result.signal });
    return { ok: true };
  },
  revertLastFilter: () => {
    const { previousSignal } = get();
    if (!previousSignal) return;
    set({ signal: previousSignal, previousSignal: null });
  },
}));
