import type { ECGSample } from '../types';

/** Constante de umbral adaptativo (`mean + K_THRESHOLD * std`), ajustable a futuro. */
const K_THRESHOLD = 1.2;
/** Período refractario entre picos R aceptados: 250ms (fisiológicamente, no hay 2 latidos más cerca). */
const REFRACTORY_S = 0.25;
/** Ventana de refinamiento (±) sobre la señal cruda alrededor de cada candidato aceptado. */
const REFINE_WINDOW_S = 0.075;
/** Ancho de la ventana de integración móvil, en segundos (~150ms, típico del algoritmo Pan-Tompkins). */
const INTEGRATION_WINDOW_S = 0.15;

/**
 * Paso 1 del pipeline: derivada (paso variable, sin asumir muestreo uniforme) al cuadrado.
 * `diff[0] = 0` porque no hay muestra anterior con la que derivar.
 */
function derivativeSquare(samples: ECGSample[]): number[] {
  const sq = new Array<number>(samples.length).fill(0);
  for (let i = 1; i < samples.length; i++) {
    const dt = samples[i].t - samples[i - 1].t;
    const diff = dt > 0 ? (samples[i].mV - samples[i - 1].mV) / dt : 0;
    sq[i] = diff * diff;
  }
  return sq;
}

/**
 * Paso 2: ventana móvil de ~150ms (convertida a nº de muestras según el paso promedio local de
 * `samples`, nunca un tamaño fijo en índices) que promedia `sq` para obtener un envelope con un
 * lóbulo por latido.
 */
function movingIntegration(sq: number[], samples: ECGSample[]): number[] {
  const n = samples.length;
  const totalSpan = samples[n - 1].t - samples[0].t;
  const avgDt = n > 1 && totalSpan > 0 ? totalSpan / (n - 1) : INTEGRATION_WINDOW_S;
  const windowSamples = Math.max(1, Math.round(INTEGRATION_WINDOW_S / avgDt));

  const envelope = new Array<number>(n).fill(0);
  let windowSum = 0;
  for (let i = 0; i < n; i++) {
    windowSum += sq[i];
    if (i >= windowSamples) windowSum -= sq[i - windowSamples];
    const count = Math.min(i + 1, windowSamples);
    envelope[i] = windowSum / count;
  }
  return envelope;
}

/** Paso 3: umbral adaptativo `mean(envelope) + K_THRESHOLD * std(envelope)` (std poblacional). */
function adaptiveThreshold(envelope: number[]): number {
  const n = envelope.length;
  const mean = envelope.reduce((sum, v) => sum + v, 0) / n;
  const variance = envelope.reduce((sum, v) => sum + (v - mean) ** 2, 0) / n;
  return mean + K_THRESHOLD * Math.sqrt(variance);
}

/** Paso 4: índices de máximos locales del envelope estrictamente por encima del umbral. */
function findCandidates(envelope: number[], threshold: number): number[] {
  const candidates: number[] = [];
  for (let i = 0; i < envelope.length; i++) {
    if (envelope[i] <= threshold) continue;
    const prev = i > 0 ? envelope[i - 1] : -Infinity;
    const next = i < envelope.length - 1 ? envelope[i + 1] : -Infinity;
    if (envelope[i] >= prev && envelope[i] >= next) candidates.push(i);
  }
  return candidates;
}

/**
 * Detecta picos R en `samples` mediante el pipeline clásico derivada→cuadrado→integración
 * móvil→umbral adaptativo→período refractario→refinamiento sobre la señal cruda (RF-14).
 * Sin filtrado DSP previo (RF-10 no existe todavía).
 *
 * Nunca lanza: entradas degeneradas (vacías, <3 muestras, todo no finito) devuelven `[]`
 * (mitigación de DoS del threat model FEAT-006).
 */
export function detectRPeaks(samples: ECGSample[]): number[] {
  const clean = samples.filter((s) => Number.isFinite(s.t) && Number.isFinite(s.mV));
  if (clean.length < 3) return [];

  const sq = derivativeSquare(clean);
  const envelope = movingIntegration(sq, clean);
  const threshold = adaptiveThreshold(envelope);
  const candidates = findCandidates(envelope, threshold);

  const accepted: number[] = [];
  let lastAcceptedT: number | null = null;
  for (const idx of candidates) {
    const t = clean[idx].t;
    if (lastAcceptedT === null || t - lastAcceptedT >= REFRACTORY_S) {
      accepted.push(idx);
      lastAcceptedT = t;
    }
  }

  return accepted.map((idx) => refineToRawPeak(clean, idx));
}

/**
 * Paso 6: dentro de ±`REFINE_WINDOW_S` alrededor del candidato, busca el índice de `mV` máximo en
 * la señal cruda y devuelve su `t` — nunca el índice del envelope suavizado, que está desfasado.
 */
function refineToRawPeak(samples: ECGSample[], candidateIdx: number): number {
  const centerT = samples[candidateIdx].t;
  let bestIdx = candidateIdx;
  let bestMv = samples[candidateIdx].mV;
  for (let i = 0; i < samples.length; i++) {
    if (Math.abs(samples[i].t - centerT) > REFINE_WINDOW_S) continue;
    if (samples[i].mV > bestMv) {
      bestMv = samples[i].mV;
      bestIdx = i;
    }
  }
  return samples[bestIdx].t;
}
