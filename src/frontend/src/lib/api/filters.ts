import type { ECGSignal } from '../ecg/types';

const API_BASE = import.meta.env.VITE_API_BASE ?? 'http://localhost:5080';

export type FilterType =
  | 'LowPass'
  | 'HighPass'
  | 'BandPass'
  | 'Notch'
  | 'MovingAverage'
  | 'MovingMedian'
  | 'SavitzkyGolay';

export type FilterParams = {
  cutoff?: number;
  cutoffLow?: number;
  cutoffHigh?: number;
  window?: number;
  polynomialDegree?: number;
};

export type ApplyFilterResult = { ok: true; signal: ECGSignal } | { ok: false; error: string };

/**
 * Aplica `filterType` con `params` sobre `signal` invocando
 * `POST /api/filters/apply`. Cliente HTTP puro, sin lógica de negocio: nunca
 * lanza. Errores de red o `400` del backend se traducen a `{ ok: false, error }`;
 * cualquier otro código HTTP no anticipado se traduce a un mensaje genérico.
 */
export async function applyFilter(
  signal: ECGSignal,
  filterType: FilterType,
  params: FilterParams,
): Promise<ApplyFilterResult> {
  try {
    const res = await fetch(`${API_BASE}/api/filters/apply`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ samples: signal.samples, filterType, ...params }),
    });

    if (res.status === 200) {
      const body = (await res.json()) as { samples: ECGSignal['samples'] };
      return { ok: true, signal: { samples: body.samples } };
    }

    if (res.status === 400) {
      const body = (await res.json()) as { error: string };
      return { ok: false, error: body.error };
    }

    return { ok: false, error: 'Error inesperado del servidor' };
  } catch {
    return { ok: false, error: 'No se pudo conectar con el backend' };
  }
}
