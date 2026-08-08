import { create } from 'zustand';
import { parseCsv } from '@/lib/ecg/parseCsv';
import type { ECGSignal, ParseError } from '@/lib/ecg/types';

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
  /** Último error de carga; `null` en `idle`/`loaded`. */
  error: SignalError | null;
  status: SignalStatus;
  /** Parsea `text` con `parseCsv` e ingresa la señal, o registra el error (FR-04/FR-05). */
  loadFromText: (text: string) => void;
  /** Registra un error previo al parseo (tamaño/lectura) sin ingresar señal. */
  setError: (error: SignalError) => void;
  /** Vuelve al estado inicial (memoria volátil; no hay persistencia — AGENTS.md). */
  reset: () => void;
}

/**
 * Store Zustand de la señal ECG. Estado global en memoria (ADR-001); no se persiste:
 * los cambios no se guardan solos (regla de AGENTS.md). RF-02 consumirá `signal`.
 */
export const useSignalStore = create<SignalState>((set) => ({
  signal: null,
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
  reset: () => set({ signal: null, status: 'idle', error: null }),
}));
