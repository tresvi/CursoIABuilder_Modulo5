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

/**
 * Dibuja la Regla: un rectángulo entre `(x0,y0)` y `(x1,y1)` sobre el overlay (mismo
 * patrón fillRect+strokeRect que `drawSelection` usa para el rectángulo de Zoom, pero
 * acotado a los dos ejes en vez de solo X con altura completa) más un tooltip de texto
 * cerca de `(x1,y1)` con Δt/Δamplitud. Los deltas se muestran siempre en valor absoluto:
 * la Regla mide una diferencia, no una dirección de arrastre. El texto se pinta
 * exclusivamente vía `ctx.fillText`, mismo patrón de `drawMarkers.ts` (FEAT-003a).
 * Limpia el overlay antes de trazar para no acumular mediciones anteriores del mismo
 * arrastre (FIX-002: antes solo se limpiaba entre arrastres, en `onMouseDown`, nunca
 * entre los sucesivos `mousemove` de un mismo arrastre).
 */
export function drawRuler(
  ctx: CanvasRenderingContext2D,
  x0: number,
  y0: number,
  x1: number,
  y1: number,
  dims: ChartDims,
  deltaT: number,
  deltaAmplitude: number,
): void {
  clearOverlay(ctx, dims);

  const loX = Math.min(x0, x1);
  const loY = Math.min(y0, y1);
  const width = Math.abs(x1 - x0);
  const height = Math.abs(y1 - y0);

  ctx.save();
  ctx.fillStyle = SELECTION_FILL;
  ctx.fillRect(loX, loY, width, height);
  ctx.strokeStyle = SELECTION_STROKE;
  ctx.lineWidth = 1;
  ctx.strokeRect(loX, loY, width, height);

  const deltaTText = `Δt: ${Math.abs(deltaT).toFixed(3)}s`;
  const deltaAmplitudeText = `ΔmV: ${Math.abs(deltaAmplitude).toFixed(2)}mV`;

  // Se acota el X del tooltip para que no se dibuje fuera del área del canvas
  // cuando el punto final del arrastre queda cerca del borde derecho.
  const tooltipX = Math.min(x1 + 6, dims.width - dims.padding.right - 60);

  ctx.fillStyle = SELECTION_STROKE;
  ctx.font = '20px sans-serif';
  ctx.textAlign = 'left';
  ctx.textBaseline = 'bottom';
  ctx.fillText(deltaTText, tooltipX, y1 - 6);
  ctx.fillText(deltaAmplitudeText, tooltipX, y1 + 6);
  ctx.restore();
}
