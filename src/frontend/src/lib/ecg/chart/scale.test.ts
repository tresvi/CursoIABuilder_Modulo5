import { describe, it, expect } from 'vitest';
import type { ChartDims, TimeWindow, YRange } from './types';
import { timeToX, xToTime, mvToY, yToMv } from './scale';

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

const Y_RANGE: YRange = { min: -1, max: 1 };

describe('scale — yToMv (Block 1, FEAT-004)', () => {
  it('es la inversa de mvToY para varios puntos dentro del área útil (round-trip)', () => {
    for (const mv of [-1, -0.5, 0, 0.5, 1]) {
      const y = mvToY(mv, Y_RANGE, DIMS);
      expect(yToMv(y, Y_RANGE, DIMS)).toBeCloseTo(mv, 6);
    }
  });

  it('clampea a yRange.max cuando y cae antes del padding superior', () => {
    expect(yToMv(DIMS.padding.top, Y_RANGE, DIMS)).toBe(Y_RANGE.max);
    expect(yToMv(-500, Y_RANGE, DIMS)).toBe(Y_RANGE.max);
  });

  it('clampea a yRange.min cuando y cae después del área útil (height - padding.bottom)', () => {
    expect(yToMv(DIMS.height - DIMS.padding.bottom, Y_RANGE, DIMS)).toBe(Y_RANGE.min);
    expect(yToMv(5000, Y_RANGE, DIMS)).toBe(Y_RANGE.min);
  });

  it('no divide por cero cuando yRange es degenerado (min === max)', () => {
    const degenerate: YRange = { min: 2, max: 2 };
    expect(yToMv(150, degenerate, DIMS)).toBe(2);
  });
});
