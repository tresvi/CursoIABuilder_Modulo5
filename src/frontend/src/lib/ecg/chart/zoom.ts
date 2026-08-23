import type { ChartDims, TimeWindow } from './types';
import { xToTime } from './scale';

/** Umbral mínimo (px) de un arrastre para considerarlo un zoom intencional (mitigación R2). */
export const MIN_DRAG_PX = 3;

/**
 * Convierte un arrastre en píxeles (`x0`→`x1`) a un rango temporal, inverso de `timeToX`.
 *
 * - Normaliza el orden de `x0`/`x1`.
 * - Si `|x1 - x0| < MIN_DRAG_PX` (arrastre despreciable) => `null` (no hay zoom, AC-05).
 * - Mapea los px a tiempo (vía `xToTime`, ya clampeado a `[window.fromTime, window.toTime]`).
 * - Garantiza `fromTime < toTime`; si el rango colapsa tras el clamp => `null`.
 */
export function pixelRangeToWindow(
  x0: number,
  x1: number,
  window: TimeWindow,
  dims: ChartDims,
): TimeWindow | null {
  if (Math.abs(x1 - x0) < MIN_DRAG_PX) return null;

  const drawWidth = dims.width - dims.padding.left - dims.padding.right;
  if (drawWidth <= 0) return null;

  const loX = Math.min(x0, x1);
  const hiX = Math.max(x0, x1);

  const fromTime = xToTime(loX, window, dims);
  const toTime = xToTime(hiX, window, dims);

  if (!(fromTime < toTime)) return null;
  return { fromTime, toTime };
}
