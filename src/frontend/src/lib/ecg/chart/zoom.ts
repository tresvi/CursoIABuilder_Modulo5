import type { ChartDims, TimeWindow } from './types';

/** Umbral mínimo (px) de un arrastre para considerarlo un zoom intencional (mitigación R2). */
export const MIN_DRAG_PX = 3;

/** Restringe `v` al intervalo `[lo, hi]`. */
function clamp(v: number, lo: number, hi: number): number {
  return Math.min(hi, Math.max(lo, v));
}

/**
 * Convierte un arrastre en píxeles (`x0`→`x1`) a un rango temporal, inverso de `timeToX`.
 *
 * - Normaliza el orden de `x0`/`x1`.
 * - Si `|x1 - x0| < MIN_DRAG_PX` (arrastre despreciable) => `null` (no hay zoom, AC-05).
 * - Mapea los px a tiempo y clampea el resultado a `[window.fromTime, window.toTime]`.
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

  const span = window.toTime - window.fromTime;
  const left = dims.padding.left;
  const xToTime = (x: number): number => window.fromTime + ((x - left) / drawWidth) * span;

  const loX = Math.min(x0, x1);
  const hiX = Math.max(x0, x1);

  const fromTime = clamp(xToTime(loX), window.fromTime, window.toTime);
  const toTime = clamp(xToTime(hiX), window.fromTime, window.toTime);

  if (!(fromTime < toTime)) return null;
  return { fromTime, toTime };
}
