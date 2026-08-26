import type { ECGSignal } from './types';

/**
 * Duración de `signal` en segundos: distancia temporal entre la primera y la última
 * muestra. Devuelve `null` cuando hay menos de 2 muestras (duración indefinida, mismo
 * umbral que `cropSignal`) — el llamador debe mostrar un marcador de "sin dato" en vez
 * de un `NaN` o un `0` engañoso (FEAT-009, FR-09).
 */
export function signalDurationSeconds(signal: ECGSignal): number | null {
  const { samples } = signal;
  if (samples.length < 2) return null;
  return samples[samples.length - 1].t - samples[0].t;
}
