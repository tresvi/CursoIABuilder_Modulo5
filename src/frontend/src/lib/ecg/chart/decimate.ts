import type { ECGSample } from '../types';
import type { TimeWindow } from './types';

/**
 * Decima las muestras dentro de `window` a ≤ ~2 vértices por columna de píxel,
 * conservando el mínimo y el máximo de mV de cada columna para no perder picos.
 *
 * El trabajo de salida es O(ancho en px), no O(nº de muestras) (estrategia NFR-01).
 * - `[]` de entrada => `[]`.
 * - Muestras fuera de `window` se descartan.
 * - Los dos vértices de una columna se emiten en orden temporal.
 */
export function decimate(
  samples: ECGSample[],
  window: TimeWindow,
  widthPx: number,
): ECGSample[] {
  if (samples.length === 0) return [];

  const cols = Math.max(1, Math.floor(widthPx));
  const span = window.toTime - window.fromTime;

  // Por cada columna guardamos la muestra de mV mínima y la de mV máxima.
  const minPerCol: Array<ECGSample | null> = new Array(cols).fill(null);
  const maxPerCol: Array<ECGSample | null> = new Array(cols).fill(null);

  for (let i = 0; i < samples.length; i++) {
    const s = samples[i];
    if (s.t < window.fromTime || s.t > window.toTime) continue;

    let col: number;
    if (span > 0) {
      col = Math.floor(((s.t - window.fromTime) / span) * cols);
      if (col < 0) col = 0;
      else if (col >= cols) col = cols - 1;
    } else {
      col = 0;
    }

    const curMin = minPerCol[col];
    if (curMin === null || s.mV < curMin.mV) minPerCol[col] = s;
    const curMax = maxPerCol[col];
    if (curMax === null || s.mV > curMax.mV) maxPerCol[col] = s;
  }

  const out: ECGSample[] = [];
  for (let col = 0; col < cols; col++) {
    const lo = minPerCol[col];
    const hi = maxPerCol[col];
    if (lo === null || hi === null) continue;
    if (lo === hi) {
      out.push(lo);
    } else if (lo.t <= hi.t) {
      out.push(lo, hi);
    } else {
      out.push(hi, lo);
    }
  }
  return out;
}
