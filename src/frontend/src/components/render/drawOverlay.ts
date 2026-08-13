import type { ChartDims } from '@/lib/ecg/chart/types';

const SELECTION_FILL = 'rgba(56, 189, 248, 0.25)';
const SELECTION_STROKE = 'rgba(2, 132, 199, 0.8)';

/** Borra por completo el lienzo overlay. */
export function clearOverlay(ctx: CanvasRenderingContext2D, dims: ChartDims): void {
  ctx.clearRect(0, 0, dims.width, dims.height);
}

/**
 * Dibuja el rectángulo de selección de zoom entre `x0` y `x1`, abarcando todo el
 * alto útil del gráfico (el eje Y no se acota — sólo el rango temporal, FR-04).
 * Limpia el overlay antes de trazar para no acumular selecciones anteriores.
 */
export function drawSelection(
  ctx: CanvasRenderingContext2D,
  x0: number,
  x1: number,
  dims: ChartDims,
): void {
  clearOverlay(ctx, dims);

  const loX = Math.min(x0, x1);
  const width = Math.abs(x1 - x0);
  const top = dims.padding.top;
  const height = dims.height - dims.padding.top - dims.padding.bottom;

  ctx.save();
  ctx.fillStyle = SELECTION_FILL;
  ctx.fillRect(loX, top, width, height);
  ctx.strokeStyle = SELECTION_STROKE;
  ctx.lineWidth = 1;
  ctx.strokeRect(loX, top, width, height);
  ctx.restore();
}
