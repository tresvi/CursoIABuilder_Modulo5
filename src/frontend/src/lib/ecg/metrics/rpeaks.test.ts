import { describe, expect, it } from 'vitest';
import { detectRPeaks } from './rpeaks';
import type { ECGSample } from '../types';

/**
 * Genera una señal sintética con lóbulos gaussianos angostos en los tiempos indicados
 * (simula QRS aislados sobre una línea de base plana), a una frecuencia de muestreo fija.
 */
function makeSyntheticEcg(
  peakTimes: number[],
  durationS: number,
  sampleRateHz = 250,
  sigma = 0.02,
): ECGSample[] {
  const dt = 1 / sampleRateHz;
  const samples: ECGSample[] = [];
  for (let t = 0; t <= durationS; t += dt) {
    let mV = 0;
    for (const peak of peakTimes) {
      mV += Math.exp(-((t - peak) ** 2) / (2 * sigma * sigma));
    }
    samples.push({ t, mV });
  }
  return samples;
}

describe('detectRPeaks', () => {
  it('detecta un pico por cada QRS de una señal sintética con QRS regulares cada 800ms', () => {
    const peakTimes = [0.8, 1.6, 2.4, 3.2, 4.0];
    const samples = makeSyntheticEcg(peakTimes, 5);
    const detected = detectRPeaks(samples);

    expect(detected.length).toBe(peakTimes.length);
    detected.forEach((t, i) => {
      expect(Math.abs(t - peakTimes[i])).toBeLessThan(0.02);
    });
  });

  it('descarta el segundo candidato si dos picos están separados menos de 250ms (período refractario)', () => {
    // 200ms de separación: viola el refractario de 250ms.
    const samples = makeSyntheticEcg([1.0, 1.2], 2.5);
    const detected = detectRPeaks(samples);

    expect(detected.length).toBe(1);
    expect(Math.abs(detected[0] - 1.0)).toBeLessThan(0.02);
  });

  it('con samples vacío o con 1-2 elementos, devuelve [] sin lanzar', () => {
    expect(detectRPeaks([])).toEqual([]);
    expect(detectRPeaks([{ t: 0, mV: 0 }])).toEqual([]);
    expect(detectRPeaks([{ t: 0, mV: 0 }, { t: 0.1, mV: 1 }])).toEqual([]);
  });

  it('ignora muestras con mV/t no finitos intercaladas y sigue detectando el resto de los picos', () => {
    const peakTimes = [0.8, 1.6, 2.4];
    const clean = makeSyntheticEcg(peakTimes, 3.2);
    const withGarbage: ECGSample[] = [];
    for (let i = 0; i < clean.length; i++) {
      withGarbage.push(clean[i]);
      if (i % 37 === 0) withGarbage.push({ t: NaN, mV: 5 });
      if (i % 53 === 0) withGarbage.push({ t: clean[i].t, mV: Infinity });
    }

    const detected = detectRPeaks(withGarbage);

    expect(detected.length).toBe(peakTimes.length);
    detected.forEach((t, i) => {
      expect(Math.abs(t - peakTimes[i])).toBeLessThan(0.02);
    });
  });

  it('con una señal plana (mV constante) devuelve [], ningún candidato supera el umbral adaptativo', () => {
    const dt = 1 / 250;
    const samples: ECGSample[] = [];
    for (let t = 0; t <= 2; t += dt) {
      samples.push({ t, mV: 3.5 });
    }
    expect(detectRPeaks(samples)).toEqual([]);
  });
});
