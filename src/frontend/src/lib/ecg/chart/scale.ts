import type { ECGSample } from '../types';
import type { ChartDims, TimeWindow, YRange } from './types';

/** Rango Y por defecto cuando no hay muestras (evita divisiones por cero aguas abajo). */
const DEFAULT_Y_RANGE: YRange = { min: -1, max: 1 };

/** Ancho útil del área de dibujo (descuenta el padding lateral). */
function drawWidth(dims: ChartDims): number {
  return dims.width - dims.padding.left - dims.padding.right;
}

/** Alto útil del área de dibujo (descuenta el padding vertical). */
function drawHeight(dims: ChartDims): number {
  return dims.height - dims.padding.top - dims.padding.bottom;
}

/**
 * Mapea un instante de tiempo a la coordenada X (px) dentro del área de dibujo,
 * respetando el padding. `fromTime` cae en el borde izquierdo y `toTime` en el derecho.
 * Si la ventana es degenerada (`fromTime === toTime`) devuelve el borde izquierdo.
 */
export function timeToX(t: number, window: TimeWindow, dims: ChartDims): number {
  const span = window.toTime - window.fromTime;
  const left = dims.padding.left;
  if (span === 0) return left;
  const frac = (t - window.fromTime) / span;
  return left + frac * drawWidth(dims);
}

/**
 * Mapea una amplitud (mV) a la coordenada Y (px) dentro del área de dibujo, con el eje
 * invertido: mV mayor => Y menor (arriba). Si el rango es degenerado (`min === max`)
 * devuelve el centro vertical del área.
 */
export function mvToY(mv: number, yRange: YRange, dims: ChartDims): number {
  const span = yRange.max - yRange.min;
  const top = dims.padding.top;
  const h = drawHeight(dims);
  if (span === 0) return top + h / 2;
  const frac = (mv - yRange.min) / span;
  return top + (1 - frac) * h;
}

/**
 * Autoescala el eje Y al min/max de las muestras.
 * - `[]` => rango por defecto seguro (`{min:-1,max:1}`).
 * - `min === max` => expande un margen para no dividir por cero después.
 */
export function computeYRange(samples: ECGSample[]): YRange {
  if (samples.length === 0) return { ...DEFAULT_Y_RANGE };

  let min = samples[0].mV;
  let max = samples[0].mV;
  for (let i = 1; i < samples.length; i++) {
    const mv = samples[i].mV;
    if (mv < min) min = mv;
    if (mv > max) max = mv;
  }

  if (min === max) {
    const margin = Math.abs(min) * 0.1 || 1;
    return { min: min - margin, max: max + margin };
  }
  return { min, max };
}

/** Redondea `value` a un "número bonito" (1, 2, 5 × potencia de 10). */
function niceNum(value: number, round: boolean): number {
  const exponent = Math.floor(Math.log10(value));
  const fraction = value / Math.pow(10, exponent);
  let niceFraction: number;
  if (round) {
    if (fraction < 1.5) niceFraction = 1;
    else if (fraction < 3) niceFraction = 2;
    else if (fraction < 7) niceFraction = 5;
    else niceFraction = 10;
  } else {
    if (fraction <= 1) niceFraction = 1;
    else if (fraction <= 2) niceFraction = 2;
    else if (fraction <= 5) niceFraction = 5;
    else niceFraction = 10;
  }
  return niceFraction * Math.pow(10, exponent);
}

/**
 * Devuelve ~`count` marcas "redondas" (espaciado uniforme) contenidas en `[min, max]`.
 * Filtra las que caigan fuera del rango, de modo que todas cumplen `min <= tick <= max`.
 */
export function niceTicks(min: number, max: number, count: number): number[] {
  if (max < min) return niceTicks(max, min, count);
  if (max === min) return [min];
  const targetCount = Math.max(2, Math.floor(count));

  const range = niceNum(max - min, false);
  const spacing = niceNum(range / (targetCount - 1), true);
  const niceMin = Math.floor(min / spacing) * spacing;
  const niceMax = Math.ceil(max / spacing) * spacing;

  const ticks: number[] = [];
  // Tolerancia relativa al espaciado para absorber el error de punto flotante.
  const eps = spacing * 1e-9;
  for (let v = niceMin; v <= niceMax + eps; v += spacing) {
    if (v >= min - eps && v <= max + eps) {
      // Redondea residuos de punto flotante (p. ej. 0.30000000000000004).
      ticks.push(Number(v.toPrecision(12)));
    }
  }
  return ticks;
}
