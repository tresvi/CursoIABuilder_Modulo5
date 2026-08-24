import { describe, expect, it } from 'vitest';
import { samplesInWindow } from './window';
import type { ECGSample } from '../types';

function makeSamples(times: number[]): ECGSample[] {
  return times.map((t) => ({ t, mV: t * 10 }));
}

describe('samplesInWindow', () => {
  it('devuelve solo las muestras dentro de [fromTime, toTime], límites inclusivos (incluye ambos extremos exactos)', () => {
    const samples = makeSamples([0, 1, 2, 3, 4, 5]);
    const result = samplesInWindow(samples, { fromTime: 1, toTime: 4 });
    expect(result.map((s) => s.t)).toEqual([1, 2, 3, 4]);
  });

  it('con samples vacío, devuelve []', () => {
    const result = samplesInWindow([], { fromTime: 0, toTime: 10 });
    expect(result).toEqual([]);
  });

  it('con una ventana que no intersecta ninguna muestra, devuelve []', () => {
    const samples = makeSamples([0, 1, 2, 3]);
    const result = samplesInWindow(samples, { fromTime: 10, toTime: 20 });
    expect(result).toEqual([]);
  });

  it('no muta el array samples original', () => {
    const samples = makeSamples([0, 1, 2, 3, 4]);
    const originalSamples = samples;
    const result = samplesInWindow(samples, { fromTime: 1, toTime: 3 });
    expect(result).not.toBe(originalSamples);
    expect(samples).toBe(originalSamples);
    expect(samples.map((s) => s.t)).toEqual([0, 1, 2, 3, 4]);
  });
});
