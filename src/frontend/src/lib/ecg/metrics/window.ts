import type { ECGSample } from '../types';
import type { TimeWindow } from '../chart/types';

/**
 * Filtra `samples` al rango `[window.fromTime, window.toTime]` (límites inclusivos, mismo
 * predicado que `cropSignal`, `lib/ecg/crop.ts`). A diferencia de `cropSignal`, esta función
 * **nunca** devuelve `null`: siempre entrega el array filtrado tal cual (incluso vacío o de 1
 * elemento), porque `computeHrvMetrics` (Block 2) ya maneja esos casos degenerados devolviendo
 * `null` por campo. Es una función pura total, sin condiciones de error.
 */
export function samplesInWindow(samples: ECGSample[], window: TimeWindow): ECGSample[] {
  return samples.filter((s) => s.t >= window.fromTime && s.t <= window.toTime);
}
