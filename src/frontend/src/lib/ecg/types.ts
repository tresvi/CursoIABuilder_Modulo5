/**
 * Tipos del dominio de ingestión de señales ECG (RF-01).
 * Un `ECGSample` es un par (tiempo en segundos, amplitud en mV).
 */
export type ECGSample = { t: number; mV: number };

/** Señal de un solo canal: secuencia ordenada de muestras (FR-03). */
export type ECGSignal = { samples: ECGSample[] };

/**
 * Errores de parseo/validación, discriminados por `kind` (FR-04, FR-05).
 * - `too-few-columns`: la cabecera tiene menos de 2 columnas.
 * - `multichannel`: la cabecera tiene 3 o más columnas; `channels` = nº total de columnas.
 * - `non-numeric`: una celda de datos no es numérica; `row` = nº de fila de datos (1-based).
 * - `no-data`: no hay filas de datos (archivo vacío o solo cabecera).
 * - `inconsistent-columns`: una fila difiere del nº de columnas de la cabecera; `row` = 1-based.
 */
export type ParseError =
  | { kind: 'too-few-columns' }
  | { kind: 'multichannel'; channels: number }
  | { kind: 'non-numeric'; row: number }
  | { kind: 'no-data' }
  | { kind: 'inconsistent-columns'; row: number };

/** Resultado del parseo: éxito con señal, o fallo con error discriminado. */
export type ParseResult =
  | { ok: true; signal: ECGSignal }
  | { ok: false; error: ParseError };
