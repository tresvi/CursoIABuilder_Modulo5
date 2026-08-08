import Papa from 'papaparse';
import type { ECGSample, ParseResult } from './types';

/**
 * Parsea y valida un CSV de ECG de un solo canal (RF-01, FR-02..FR-05).
 *
 * Contrato del archivo: coma como separador de columnas, punto como separador decimal,
 * primera fila = cabecera (nombre no validado), filas siguientes = datos (tiempo, mV).
 * Se aplica `trim` a cada celda. Los valores negativos son válidos.
 *
 * Falla segura: ante cualquier violación del contrato devuelve `{ ok: false, error }`
 * y NO construye señal (ni parcial ni corrupta).
 *
 * Orden de precedencia de errores (se devuelve el PRIMERO que aplique):
 *   1. Columnas de la cabecera: `too-few-columns` (<2) o `multichannel` (>=3).
 *   2. `no-data`: no hay filas de datos.
 *   3. Por cada fila de datos, en orden de archivo:
 *        a. `inconsistent-columns` (nº de columnas != cabecera),
 *        b. `non-numeric` (celda vacía o no convertible a número).
 *
 * `row` es el índice 1-based de la fila de DATOS (la primera fila de datos = 1);
 * `channels` es el nº total de columnas detectado en la cabecera.
 */
export function parseCsv(text: string): ParseResult {
  // PapaParse en modo síncrono sobre string en memoria (sin worker, sin download).
  // El genérico <string[]> tipa `data` como string[][] sin necesidad de cast.
  const parsed = Papa.parse<string[]>(text, {
    delimiter: ',',
    skipEmptyLines: true,
  });

  const rows: string[][] = parsed.data;

  if (rows.length === 0) {
    return { ok: false, error: { kind: 'no-data' } };
  }

  // La cabecera (primera fila) determina el nº de columnas esperado.
  const header = rows[0].map((cell) => cell.trim());
  const columns = header.length;

  if (columns < 2) {
    return { ok: false, error: { kind: 'too-few-columns' } };
  }
  if (columns >= 3) {
    return { ok: false, error: { kind: 'multichannel', channels: columns } };
  }

  const dataRows = rows.slice(1);
  if (dataRows.length === 0) {
    return { ok: false, error: { kind: 'no-data' } };
  }

  const samples: ECGSample[] = [];
  for (let i = 0; i < dataRows.length; i++) {
    const row = i + 1; // 1-based sobre filas de datos
    const cells = dataRows[i].map((cell) => cell.trim());

    if (cells.length !== columns) {
      return { ok: false, error: { kind: 'inconsistent-columns', row } };
    }

    const tRaw = cells[0];
    const mVRaw = cells[1];
    // Number('') === 0, por eso la celda vacía se rechaza explícitamente.
    if (tRaw === '' || mVRaw === '') {
      return { ok: false, error: { kind: 'non-numeric', row } };
    }

    const t = Number(tRaw);
    const mV = Number(mVRaw);
    if (Number.isNaN(t) || Number.isNaN(mV)) {
      return { ok: false, error: { kind: 'non-numeric', row } };
    }

    samples.push({ t, mV });
  }

  return { ok: true, signal: { samples } };
}
