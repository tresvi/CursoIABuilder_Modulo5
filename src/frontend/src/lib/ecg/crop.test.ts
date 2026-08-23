import { describe, expect, it } from 'vitest';
import { cropSignal } from './crop';
import type { ECGSignal } from './types';

function makeSignal(times: number[]): ECGSignal {
  return { samples: times.map((t) => ({ t, mV: t * 10 })) };
}

describe('cropSignal', () => {
  it('con un rango que contiene un subconjunto propio de muestras, devuelve solo esas muestras en el mismo orden', () => {
    const signal = makeSignal([0, 1, 2, 3, 4, 5]);
    const result = cropSignal(signal, { fromTime: 1, toTime: 3 });
    expect(result).not.toBeNull();
    expect(result?.samples.map((s) => s.t)).toEqual([1, 2, 3]);
  });

  it('con un rango que cubre toda la señal, devuelve todas las muestras sin cambios', () => {
    const signal = makeSignal([0, 1, 2, 3]);
    const result = cropSignal(signal, { fromTime: 0, toTime: 3 });
    expect(result).not.toBeNull();
    expect(result?.samples).toEqual(signal.samples);
  });

  it('con un rango que no deja ninguna muestra dentro (0 muestras), devuelve null', () => {
    const signal = makeSignal([0, 1, 2, 3]);
    const result = cropSignal(signal, { fromTime: 0.5, toTime: 0.9 });
    expect(result).toBeNull();
  });

  it('con un rango que deja exactamente 1 muestra dentro, devuelve null', () => {
    const signal = makeSignal([0, 1, 2, 3]);
    const result = cropSignal(signal, { fromTime: 0.5, toTime: 1.2 });
    expect(result).toBeNull();
  });

  it('no muta el array samples original', () => {
    const signal = makeSignal([0, 1, 2, 3, 4]);
    const originalSamples = signal.samples;
    const result = cropSignal(signal, { fromTime: 1, toTime: 3 });
    expect(result?.samples).not.toBe(originalSamples);
    expect(signal.samples).toBe(originalSamples);
    expect(signal.samples.map((s) => s.t)).toEqual([0, 1, 2, 3, 4]);
  });
});
