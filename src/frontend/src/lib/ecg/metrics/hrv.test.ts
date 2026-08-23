import { describe, expect, it } from 'vitest';
import { computeHrvMetrics } from './hrv';
import type { ECGSample } from '../types';

/**
 * Genera una señal sintética con lóbulos gaussianos angostos en los tiempos indicados
 * (mismo helper que `rpeaks.test.ts`, para producir picos R detectables por `detectRPeaks`).
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

describe('computeHrvMetrics', () => {
  it('AC-01: con RR regulares de 800ms, bpm≈75, sdnn≈0, rmssd≈0, pnn50=0', () => {
    const peakTimes = [0.8, 1.6, 2.4, 3.2, 4.0];
    const samples = makeSyntheticEcg(peakTimes, 5);
    const metrics = computeHrvMetrics(samples);

    expect(metrics.bpm).not.toBeNull();
    expect(metrics.bpm as number).toBeCloseTo(75, 0);
    expect(metrics.sdnn).not.toBeNull();
    expect(metrics.sdnn as number).toBeCloseTo(0, 0);
    expect(metrics.rmssd).not.toBeNull();
    expect(metrics.rmssd as number).toBeCloseTo(0, 0);
    expect(metrics.pnn50).toBe(0);
  });

  it('con RR variables (alternando 700ms/900ms), sdnn/rmssd/pnn50 calculan los valores esperados', () => {
    // Picos separados alternando 700ms y 900ms: intervalos [700, 900, 700, 900] ms.
    const peakTimes = [0.7, 1.6, 2.3, 3.2, 3.9];
    const samples = makeSyntheticEcg(peakTimes, 4.7);
    const metrics = computeHrvMetrics(samples);

    const intervalsMs = [700, 900, 700, 900];
    const mean = intervalsMs.reduce((s, v) => s + v, 0) / intervalsMs.length;
    const variance =
      intervalsMs.reduce((s, v) => s + (v - mean) ** 2, 0) / intervalsMs.length;
    const expectedSdnn = Math.sqrt(variance);

    const diffs = [200, -200, 200];
    const expectedRmssd = Math.sqrt(
      diffs.reduce((s, d) => s + d * d, 0) / diffs.length,
    );
    const expectedPnn50 = (diffs.filter((d) => Math.abs(d) > 50).length / diffs.length) * 100;

    expect(metrics.bpm).not.toBeNull();
    expect(metrics.bpm as number).toBeCloseTo(60000 / mean, 0);
    expect(metrics.sdnn).not.toBeNull();
    expect(metrics.sdnn as number).toBeCloseTo(expectedSdnn, 0);
    expect(metrics.rmssd).not.toBeNull();
    expect(metrics.rmssd as number).toBeCloseTo(expectedRmssd, 0);
    expect(metrics.pnn50).not.toBeNull();
    expect(metrics.pnn50 as number).toBeCloseTo(expectedPnn50, 0);
  });

  it('AC-04: con exactamente 1 pico R (o 0), los 4 campos son null', () => {
    const oneBeat = makeSyntheticEcg([1.0], 2);
    const metricsOne = computeHrvMetrics(oneBeat);
    expect(metricsOne).toEqual({ bpm: null, sdnn: null, rmssd: null, pnn50: null });

    const flat: ECGSample[] = [];
    const dt = 1 / 250;
    for (let t = 0; t <= 1; t += dt) flat.push({ t, mV: 3.5 });
    const metricsZero = computeHrvMetrics(flat);
    expect(metricsZero).toEqual({ bpm: null, sdnn: null, rmssd: null, pnn50: null });
  });

  it('AC-04: con exactamente 2 picos R, bpm/sdnn calculables (sdnn=0 sin dividir por cero), rmssd/pnn50 null', () => {
    const peakTimes = [0.8, 1.6];
    const samples = makeSyntheticEcg(peakTimes, 2.4);
    const metrics = computeHrvMetrics(samples);

    expect(metrics.bpm).not.toBeNull();
    expect(metrics.bpm as number).toBeCloseTo(75, 0);
    expect(metrics.sdnn).toBe(0);
    expect(metrics.rmssd).toBeNull();
    expect(metrics.pnn50).toBeNull();
  });

  it('samples vacío → los 4 campos null, sin lanzar', () => {
    expect(computeHrvMetrics([])).toEqual({ bpm: null, sdnn: null, rmssd: null, pnn50: null });
  });
});
