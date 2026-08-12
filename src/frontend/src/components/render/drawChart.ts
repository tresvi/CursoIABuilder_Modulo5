import { decimate } from '@/lib/ecg/chart/decimate';
import { mvToY, niceTicks, timeToX } from '@/lib/ecg/chart/scale';
import type { ChartDims, TimeWindow, YRange } from '@/lib/ecg/chart/types';
import type { ECGSignal } from '@/lib/ecg/types';

/** Parámetros de dibujo del lienzo base (FEAT-002, Block 3). */
export interface DrawChartOptions {
  signal: ECGSignal;
  window: TimeWindow;
  dims: ChartDims;
  yRange: YRange;
  gridVisible: boolean;
}

const GRID_COLOR = '#f2d4d4';
const AXIS_COLOR = '#334155';
const SIGNAL_COLOR = '#0369a1';

/** Formatea un valor de tick evitando residuos de punto flotante. */
function formatTick(value: number): string {
  return String(Number(value.toPrecision(4)));
}

/** Rejilla de referencia tipo ECG en las posiciones de los ticks (FR-06). */
function drawGrid(
  ctx: CanvasRenderingContext2D,
  window: TimeWindow,
  yRange: YRange,
  dims: ChartDims,
): void {
  const top = dims.padding.top;
  const bottom = dims.height - dims.padding.bottom;
  const left = dims.padding.left;
  const right = dims.width - dims.padding.right;

  ctx.save();
  ctx.strokeStyle = GRID_COLOR;
  ctx.lineWidth = 1;
  ctx.beginPath();
  for (const t of niceTicks(window.fromTime, window.toTime, 10)) {
    const x = timeToX(t, window, dims);
    ctx.moveTo(x, top);
    ctx.lineTo(x, bottom);
  }
  for (const mv of niceTicks(yRange.min, yRange.max, 8)) {
    const y = mvToY(mv, yRange, dims);
    ctx.moveTo(left, y);
    ctx.lineTo(right, y);
  }
  ctx.stroke();
  ctx.restore();
}

/** Ejes con ticks y etiquetas numéricas: X en segundos, Y en mV (FR-01). */
function drawAxes(
  ctx: CanvasRenderingContext2D,
  window: TimeWindow,
  yRange: YRange,
  dims: ChartDims,
): void {
  const top = dims.padding.top;
  const bottom = dims.height - dims.padding.bottom;
  const left = dims.padding.left;
  const right = dims.width - dims.padding.right;

  ctx.save();
  ctx.strokeStyle = AXIS_COLOR;
  ctx.fillStyle = AXIS_COLOR;
  ctx.lineWidth = 1;
  ctx.font = '10px sans-serif';

  // Líneas de eje.
  ctx.beginPath();
  ctx.moveTo(left, top);
  ctx.lineTo(left, bottom);
  ctx.moveTo(left, bottom);
  ctx.lineTo(right, bottom);
  ctx.stroke();

  // Ticks + etiquetas del eje X (segundos).
  ctx.textAlign = 'center';
  ctx.textBaseline = 'top';
  for (const t of niceTicks(window.fromTime, window.toTime, 8)) {
    const x = timeToX(t, window, dims);
    ctx.beginPath();
    ctx.moveTo(x, bottom);
    ctx.lineTo(x, bottom + 4);
    ctx.stroke();
    ctx.fillText(formatTick(t), x, bottom + 6);
  }

  // Ticks + etiquetas del eje Y (mV).
  ctx.textAlign = 'right';
  ctx.textBaseline = 'middle';
  for (const mv of niceTicks(yRange.min, yRange.max, 6)) {
    const y = mvToY(mv, yRange, dims);
    ctx.beginPath();
    ctx.moveTo(left - 4, y);
    ctx.lineTo(left, y);
    ctx.stroke();
    ctx.fillText(formatTick(mv), left - 6, y);
  }

  // Rótulos de unidad.
  ctx.textAlign = 'center';
  ctx.textBaseline = 'bottom';
  ctx.fillText('Tiempo (s)', (left + right) / 2, dims.height);
  ctx.textAlign = 'left';
  ctx.textBaseline = 'top';
  ctx.fillText('mV', 2, top);
  ctx.restore();
}

/** Traza la señal decimada por columna de píxel (estrategia NFR-01). */
function drawSignal(
  ctx: CanvasRenderingContext2D,
  signal: ECGSignal,
  window: TimeWindow,
  yRange: YRange,
  dims: ChartDims,
): void {
  const drawWidth = dims.width - dims.padding.left - dims.padding.right;
  const points = decimate(signal.samples, window, drawWidth);
  if (points.length === 0) return;

  ctx.save();
  ctx.strokeStyle = SIGNAL_COLOR;
  ctx.lineWidth = 1.5;
  ctx.beginPath();
  for (let i = 0; i < points.length; i++) {
    const x = timeToX(points[i].t, window, dims);
    const y = mvToY(points[i].mV, yRange, dims);
    if (i === 0) ctx.moveTo(x, y);
    else ctx.lineTo(x, y);
  }
  ctx.stroke();
  ctx.restore();
}

/**
 * Dibuja el lienzo base del gráfico ECG en este orden: rejilla (si visible),
 * ejes con ticks (X en s / Y en mV) y la señal decimada. Función lo más pura
 * posible: recibe el `ctx`, no lee stores ni el DOM.
 */
export function drawChart(ctx: CanvasRenderingContext2D, opts: DrawChartOptions): void {
  const { signal, window, dims, yRange, gridVisible } = opts;
  ctx.clearRect(0, 0, dims.width, dims.height);
  if (gridVisible) drawGrid(ctx, window, yRange, dims);
  drawAxes(ctx, window, yRange, dims);
  drawSignal(ctx, signal, window, yRange, dims);
}
