import { detectRPeaks } from './rpeaks';
import type { ECGSample } from '../types';
import type { HrvMetrics } from './types';

/** Diferencia sucesiva mínima (ms) para contar como "NN50" en pNN50. */
const NN50_THRESHOLD_MS = 50;

/** Media aritmética de un arreglo numérico. */
function mean(values: number[]): number {
  return values.reduce((sum, v) => sum + v, 0) / values.length;
}

/** Desviación estándar poblacional de un arreglo numérico. */
function populationStdDev(values: number[]): number {
  const m = mean(values);
  const variance = values.reduce((sum, v) => sum + (v - m) ** 2, 0) / values.length;
  return Math.sqrt(variance);
}

/**
 * Calcula BPM/SDNN/RMSSD/pNN50 a partir de los picos R detectados en `samples` (RF-14).
 * Cada campo cae a `null` independientemente cuando no hay suficientes picos/intervalos —
 * nunca lanza excepción (reutiliza las guardas de entrada de `detectRPeaks`, Block 1).
 */
export function computeHrvMetrics(samples: ECGSample[]): HrvMetrics {
  const rPeaks = detectRPeaks(samples);

  const intervalsMs: number[] = [];
  for (let i = 1; i < rPeaks.length; i++) {
    intervalsMs.push((rPeaks[i] - rPeaks[i - 1]) * 1000);
  }

  const bpm = rPeaks.length >= 2 ? 60000 / mean(intervalsMs) : null;
  // Nota: la spec (punto 4) dice "intervalsMs.length >= 2", pero el test requerido de AC-04
  // exige sdnn calculable con exactamente 2 picos (1 intervalo) — la std poblacional de un solo
  // dato es 0 por definición, sin riesgo de división por cero (divide por n=1). Se implementa
  // con el mismo umbral que bpm (rPeaks.length >= 2 ⇔ intervalsMs.length >= 1).
  const sdnn = intervalsMs.length >= 1 ? populationStdDev(intervalsMs) : null;

  let rmssd: number | null = null;
  let pnn50: number | null = null;
  if (rPeaks.length >= 3) {
    const diffs: number[] = [];
    for (let i = 1; i < intervalsMs.length; i++) {
      diffs.push(intervalsMs[i] - intervalsMs[i - 1]);
    }
    rmssd = Math.sqrt(mean(diffs.map((d) => d * d)));
    pnn50 = (diffs.filter((d) => Math.abs(d) > NN50_THRESHOLD_MS).length / diffs.length) * 100;
  }

  return { bpm, sdnn, rmssd, pnn50 };
}
