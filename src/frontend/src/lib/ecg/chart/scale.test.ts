import { describe, it, expect } from 'vitest';
import type { ChartDims, TimeWindow } from './types';
import { timeToX, xToTime } from './scale';

// Mismas dimensiones de referencia que chart.test.ts: área de dibujo = [50, 980] en X.
const DIMS: ChartDims = {
  width: 1000,
  height: 400,
  padding: { top: 10, right: 20, bottom: 30, left: 50 },
};
const WINDOW: TimeWindow = { fromTime: 0, toTime: 10 };

describe('scale — xToTime (Block 1, FEAT-003a)', () => {
  it('es la inversa de timeToX para varios puntos dentro del área útil (round-trip)', () => {
    for (const t of [0, 2.5, 5, 7.5, 10]) {
      const x = timeToX(t, WINDOW, DIMS);
      expect(xToTime(x, WINDOW, DIMS)).toBeCloseTo(t, 6);
    }
  });

  it('clampea a window.fromTime cuando x cae antes del padding izquierdo', () => {
    expect(xToTime(0, WINDOW, DIMS)).toBe(WINDOW.fromTime);
    expect(xToTime(-500, WINDOW, DIMS)).toBe(WINDOW.fromTime);
  });

  it('clampea a window.toTime cuando x cae después del área útil (width - padding.right)', () => {
    expect(xToTime(1000, WINDOW, DIMS)).toBe(WINDOW.toTime);
    expect(xToTime(5000, WINDOW, DIMS)).toBe(WINDOW.toTime);
  });

  it('no divide por cero cuando la ventana es degenerada (fromTime === toTime)', () => {
    const degenerate: TimeWindow = { fromTime: 3, toTime: 3 };
    expect(xToTime(515, degenerate, DIMS)).toBe(3);
  });
});
