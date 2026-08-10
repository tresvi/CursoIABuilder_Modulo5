import { describe, it, expect } from 'vitest';
import type { ECGSample } from '../types';
import type { ChartDims, TimeWindow } from './types';
import { timeToX, mvToY, computeYRange, niceTicks } from './scale';
import { pixelRangeToWindow, MIN_DRAG_PX } from './zoom';
import { decimate } from './decimate';

// Dimensiones de referencia reutilizadas: área de dibujo = [50, 980] en X y [10, 370] en Y.
const DIMS: ChartDims = {
  width: 1000,
  height: 400,
  padding: { top: 10, right: 20, bottom: 30, left: 50 },
};
const WINDOW: TimeWindow = { fromTime: 0, toTime: 10 };

describe('scale — timeToX / mvToY (AC-01 base)', () => {
  it('mapea fromTime al borde izquierdo, toTime al derecho y el punto medio al centro del área', () => {
    // drawWidth = 1000 - 50 - 20 = 930
    expect(timeToX(0, WINDOW, DIMS)).toBeCloseTo(50, 6); // padding.left
    expect(timeToX(10, WINDOW, DIMS)).toBeCloseTo(980, 6); // width - padding.right
    expect(timeToX(5, WINDOW, DIMS)).toBeCloseTo(515, 6); // 50 + 0.5 * 930
  });

  it('invierte Y: mV mayor => Y menor; extremos y punto medio', () => {
    const yRange = { min: -1, max: 1 };
    // drawHeight = 400 - 10 - 30 = 360
    expect(mvToY(1, yRange, DIMS)).toBeCloseTo(10, 6); // máximo => borde superior (Y menor)
    expect(mvToY(-1, yRange, DIMS)).toBeCloseTo(370, 6); // mínimo => borde inferior (Y mayor)
    expect(mvToY(0, yRange, DIMS)).toBeCloseTo(190, 6); // centro
  });

  it('no divide por cero cuando window degenerado o yRange degenerado', () => {
    expect(Number.isFinite(timeToX(5, { fromTime: 3, toTime: 3 }, DIMS))).toBe(true);
    expect(Number.isFinite(mvToY(5, { min: 2, max: 2 }, DIMS))).toBe(true);
  });
});

describe('scale — computeYRange (AC-01)', () => {
  it('autoescala al min/max de la señal, incluyendo negativos', () => {
    const samples: ECGSample[] = [
      { t: 0, mV: -2 },
      { t: 1, mV: 0.5 },
      { t: 2, mV: 3 },
      { t: 3, mV: -1 },
    ];
    expect(computeYRange(samples)).toEqual({ min: -2, max: 3 });
  });

  it('con [] devuelve un rango por defecto seguro sin lanzar (sad path)', () => {
    const r = computeYRange([]);
    expect(r).toEqual({ min: -1, max: 1 });
  });

  it('con min===max expande un margen para no dividir por cero', () => {
    const flat: ECGSample[] = [
      { t: 0, mV: 0 },
      { t: 1, mV: 0 },
    ];
    const r = computeYRange(flat);
    expect(r.max).toBeGreaterThan(r.min);
    // mvToY debe seguir siendo finito con el rango expandido
    expect(Number.isFinite(mvToY(0, r, DIMS))).toBe(true);
  });
});

describe('scale — niceTicks', () => {
  it('devuelve marcas dentro de [min,max], no vacías y ascendentes', () => {
    const ticks = niceTicks(0, 10, 5);
    expect(ticks.length).toBeGreaterThan(0);
    for (const t of ticks) {
      expect(t).toBeGreaterThanOrEqual(0);
      expect(t).toBeLessThanOrEqual(10);
    }
    const sorted = [...ticks].sort((a, b) => a - b);
    expect(ticks).toEqual(sorted);
  });

  it('funciona con rangos con negativos y espaciado redondo', () => {
    const ticks = niceTicks(-3, 7, 5);
    for (const t of ticks) {
      expect(t).toBeGreaterThanOrEqual(-3);
      expect(t).toBeLessThanOrEqual(7);
    }
    // espaciado constante entre marcas consecutivas
    if (ticks.length >= 2) {
      const step = ticks[1] - ticks[0];
      for (let i = 1; i < ticks.length; i++) {
        expect(ticks[i] - ticks[i - 1]).toBeCloseTo(step, 6);
      }
    }
  });
});

describe('zoom — pixelRangeToWindow (AC-04 / AC-05)', () => {
  it('arrastre válido => ventana clampeada con fromTime<toTime', () => {
    // x=515 => t≈5 ; x=980 => t≈10
    const win = pixelRangeToWindow(515, 980, WINDOW, DIMS);
    expect(win).not.toBeNull();
    if (!win) return;
    expect(win.fromTime).toBeCloseTo(5, 4);
    expect(win.toTime).toBeCloseTo(10, 4);
    expect(win.fromTime).toBeLessThan(win.toTime);
  });

  it('normaliza el orden de x0/x1 (arrastre de derecha a izquierda)', () => {
    const win = pixelRangeToWindow(980, 515, WINDOW, DIMS);
    expect(win).not.toBeNull();
    if (!win) return;
    expect(win.fromTime).toBeCloseTo(5, 4);
    expect(win.toTime).toBeCloseTo(10, 4);
  });

  it('clampea a la ventana actual cuando el arrastre se sale del área', () => {
    const win = pixelRangeToWindow(-500, 5000, WINDOW, DIMS);
    expect(win).not.toBeNull();
    if (!win) return;
    expect(win.fromTime).toBeCloseTo(0, 6);
    expect(win.toTime).toBeCloseTo(10, 6);
  });

  it('arrastre despreciable (|x1-x0| < MIN_DRAG_PX) => null (sad path AC-05)', () => {
    expect(pixelRangeToWindow(100, 100 + MIN_DRAG_PX - 0.5, WINDOW, DIMS)).toBeNull();
    expect(pixelRangeToWindow(100, 100, WINDOW, DIMS)).toBeNull();
  });
});

describe('decimate', () => {
  it('con [] devuelve [] (sad path)', () => {
    expect(decimate([], WINDOW, 1000)).toEqual([]);
  });

  it('con widthPx=1 conserva exactamente min y max de mV de la única columna (≤2 puntos)', () => {
    const samples: ECGSample[] = [
      { t: 0, mV: 0 },
      { t: 1, mV: -5 }, // mínimo
      { t: 2, mV: 2 },
      { t: 3, mV: 7 }, // máximo
      { t: 4, mV: 1 },
    ];
    const out = decimate(samples, { fromTime: 0, toTime: 4 }, 1);
    expect(out.length).toBeLessThanOrEqual(2);
    const mvs = out.map((s) => s.mV);
    expect(mvs).toContain(-5);
    expect(mvs).toContain(7);
  });

  it('reduce una señal grande a ≤ ~2 puntos por columna y conserva los extremos globales', () => {
    const samples: ECGSample[] = [];
    for (let i = 0; i < 5000; i++) {
      samples.push({ t: i * 0.01, mV: Math.sin(i * 0.1) * 2 });
    }
    // pico artificial en el medio
    samples[2500] = { t: 25, mV: 9 };
    samples[2501] = { t: 25.01, mV: -9 };
    const widthPx = 200;
    const window: TimeWindow = { fromTime: 0, toTime: 49.99 };
    const out = decimate(samples, window, widthPx);
    expect(out.length).toBeLessThanOrEqual(2 * widthPx);
    const mvs = out.map((s) => s.mV);
    expect(Math.max(...mvs)).toBeCloseTo(9, 6);
    expect(Math.min(...mvs)).toBeCloseTo(-9, 6);
  });

  it('filtra a las muestras dentro de la ventana', () => {
    const samples: ECGSample[] = [
      { t: 0, mV: 100 }, // fuera (por debajo)
      { t: 5, mV: 1 },
      { t: 6, mV: 2 },
      { t: 100, mV: -100 }, // fuera (por encima)
    ];
    const out = decimate(samples, { fromTime: 4, toTime: 7 }, 500);
    const mvs = out.map((s) => s.mV);
    expect(mvs).not.toContain(100);
    expect(mvs).not.toContain(-100);
  });
});

describe('rendimiento — NFR-01 (30k muestras, ancho 1000px, p95 < 0.1s)', () => {
  it('construye el path decimado en < 0.1s (p95 de 20 corridas)', () => {
    const samples: ECGSample[] = [];
    for (let i = 0; i < 30000; i++) {
      // 1 minuto ≈ 30000 muestras => dt ≈ 0.002 s
      samples.push({ t: i * 0.002, mV: Math.sin(i * 0.05) * 1.2 + Math.sin(i * 0.5) * 0.2 });
    }
    const window: TimeWindow = { fromTime: 0, toTime: samples[samples.length - 1].t };
    const widthPx = 1000;

    const timings: number[] = [];
    for (let run = 0; run < 20; run++) {
      const start = performance.now();
      const yRange = computeYRange(samples);
      const pts = decimate(samples, window, widthPx);
      // cómputo del path (mapeo a coordenadas de canvas)
      const path: Array<{ x: number; y: number }> = new Array(pts.length);
      for (let i = 0; i < pts.length; i++) {
        path[i] = {
          x: timeToX(pts[i].t, window, DIMS),
          y: mvToY(pts[i].mV, yRange, DIMS),
        };
      }
      const elapsed = performance.now() - start;
      // guarda para que el optimizador no elimine el trabajo
      expect(path.length).toBeGreaterThan(0);
      timings.push(elapsed);
    }

    timings.sort((a, b) => a - b);
    // p95 de 20 muestras => índice ceil(0.95*20)-1 = 18
    const p95 = timings[Math.ceil(0.95 * timings.length) - 1];
    // Evidencia del valor medido en el entorno de CI/local:
    console.log(`[NFR-01] p95 decimate+path (30k @ 1000px) = ${p95.toFixed(3)} ms`);
    expect(p95).toBeLessThan(100);
  });
});
