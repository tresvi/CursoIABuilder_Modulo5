/**
 * Tipos de la capa de lógica de métricas HRV (RF-14).
 * Tipos planos, sin dependencias de Canvas/DOM.
 */

/** Métricas de variabilidad de la frecuencia cardíaca. `null` por campo cuando no es calculable. */
export type HrvMetrics = {
  bpm: number | null;
  sdnn: number | null;
  rmssd: number | null;
  pnn50: number | null;
};
