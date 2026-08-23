import { describe, it, expect } from 'vitest';
import type { ChartDims, TimeWindow } from './types';
import { pixelRangeToWindow, MIN_DRAG_PX } from './zoom';

// Mismas dimensiones/ventana de referencia que chart.test.ts (FEAT-002).
const DIMS: ChartDims = {
  width: 1000,
  height: 400,
  padding: { top: 10, right: 20, bottom: 30, left: 50 },
};
const WINDOW: TimeWindow = { fromTime: 0, toTime: 10 };

// Regresión FEAT-002 (AC-04/AC-05): tras extraer xToTime a scale.ts, pixelRangeToWindow
// debe seguir comportándose exactamente igual.
describe('zoom — pixelRangeToWindow (regresión tras compartir xToTime con scale.ts)', () => {
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
