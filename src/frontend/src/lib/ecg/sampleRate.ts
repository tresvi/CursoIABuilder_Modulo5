import type { ECGSignal } from './types';

/**
 * Calcula la frecuencia de muestreo en Hz de `signal`: `1 / dtPromedio`, donde
 * `dtPromedio` es el promedio de los deltas de tiempo consecutivos entre muestras.
 * Replica exactamente el mismo criterio que `SampleRateCalculator.ComputeSampleRateHz`
 * del backend (promedio, no mediana) para que ambos lados coincidan sobre la misma
 * señal al calcular Nyquist. Precondición: `signal.samples` tiene al menos 2 muestras.
 */
export function computeSampleRateHz(signal: ECGSignal): number {
  const { samples } = signal;
  let sumDelta = 0;
  for (let i = 1; i < samples.length; i++) {
    sumDelta += samples[i].t - samples[i - 1].t;
  }
  const avgDelta = sumDelta / (samples.length - 1);
  return 1 / avgDelta;
}
