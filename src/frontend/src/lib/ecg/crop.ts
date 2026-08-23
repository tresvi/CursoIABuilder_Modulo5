import type { ECGSignal } from './types';
import type { TimeWindow } from './chart/types';

/**
 * Recorta `signal` al rango `[range.fromTime, range.toTime]` (límites inclusivos, consistente con
 * lo que el usuario ve resaltado como selección). Devuelve `null` si el resultado queda con menos
 * de 2 muestras (rango degenerado, mismo umbral que exige el useEffect de sincronización de
 * ECGChart) — el llamador debe tratar `null` como "no aplicar el recorte".
 */
export function cropSignal(signal: ECGSignal, range: TimeWindow): ECGSignal | null {
  const samples = signal.samples.filter((s) => s.t >= range.fromTime && s.t <= range.toTime);
  if (samples.length < 2) return null;
  return { samples };
}
