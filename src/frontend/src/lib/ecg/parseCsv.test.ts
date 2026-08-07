import { describe, it, expect } from 'vitest';
import { parseCsv } from './parseCsv';

describe('parseCsv — happy path (AC-02)', () => {
  it('parsea un CSV de 1 canal con cabecera + filas (espacios y negativos) preservando el orden', () => {
    const csv = ['tiempo,  mV', '0,-0.085', '0.002 , -0.0551', ' 0.004,0.028 '].join('\n');

    const result = parseCsv(csv);

    expect(result.ok).toBe(true);
    if (!result.ok) return; // narrowing para TS
    expect(result.signal.samples).toEqual([
      { t: 0, mV: -0.085 },
      { t: 0.002, mV: -0.0551 },
      { t: 0.004, mV: 0.028 },
    ]);
  });

  it('acepta valores negativos en ambas columnas', () => {
    const csv = ['t,mV', '-1,-2', '-3,-4'].join('\n');

    const result = parseCsv(csv);

    expect(result.ok).toBe(true);
    if (!result.ok) return;
    expect(result.signal.samples).toEqual([
      { t: -1, mV: -2 },
      { t: -3, mV: -4 },
    ]);
  });
});

describe('parseCsv — too-few-columns (AC-04)', () => {
  it('rechaza CSV con menos de 2 columnas en la cabecera', () => {
    const csv = ['tiempo', '0', '0.002'].join('\n');

    const result = parseCsv(csv);

    expect(result.ok).toBe(false);
    if (result.ok) return;
    expect(result.error.kind).toBe('too-few-columns');
  });
});

describe('parseCsv — non-numeric (AC-04)', () => {
  it('rechaza CSV con un valor no numérico en una fila de datos e informa la fila', () => {
    const csv = ['tiempo,mV', '0,-0.085', '0.002,abc'].join('\n');

    const result = parseCsv(csv);

    expect(result.ok).toBe(false);
    if (result.ok) return;
    expect(result.error.kind).toBe('non-numeric');
    if (result.error.kind !== 'non-numeric') return;
    expect(result.error.row).toBe(2);
  });

  it('trata la celda vacía como no numérica', () => {
    const csv = ['tiempo,mV', '0,-0.085', '0.004,'].join('\n');

    const result = parseCsv(csv);

    expect(result.ok).toBe(false);
    if (result.ok) return;
    expect(result.error.kind).toBe('non-numeric');
    if (result.error.kind !== 'non-numeric') return;
    expect(result.error.row).toBe(2);
  });
});

describe('parseCsv — no-data (AC-04)', () => {
  it('rechaza un CSV vacío', () => {
    const result = parseCsv('');

    expect(result.ok).toBe(false);
    if (result.ok) return;
    expect(result.error.kind).toBe('no-data');
  });

  it('rechaza un CSV con solo cabecera', () => {
    const result = parseCsv('tiempo,mV');

    expect(result.ok).toBe(false);
    if (result.ok) return;
    expect(result.error.kind).toBe('no-data');
  });
});

describe('parseCsv — inconsistent-columns (AC-04)', () => {
  it('rechaza filas de datos con distinta cantidad de columnas que la cabecera e informa la fila', () => {
    const csv = ['tiempo,mV', '0,-0.085', '0.002,-0.05,extra'].join('\n');

    const result = parseCsv(csv);

    expect(result.ok).toBe(false);
    if (result.ok) return;
    expect(result.error.kind).toBe('inconsistent-columns');
    if (result.error.kind !== 'inconsistent-columns') return;
    expect(result.error.row).toBe(2);
  });
});

describe('parseCsv — multichannel (AC-05)', () => {
  it('rechaza CSV con 3+ columnas e informa la cantidad de canales', () => {
    const csv = ['tiempo,mV1,mV2', '0,-0.085,0.1', '0.002,-0.05,0.2'].join('\n');

    const result = parseCsv(csv);

    expect(result.ok).toBe(false);
    if (result.ok) return;
    expect(result.error.kind).toBe('multichannel');
    if (result.error.kind !== 'multichannel') return;
    expect(result.error.channels).toBe(3);
  });
});

describe('parseCsv — rendimiento (NFR-01)', () => {
  it('parsea 30.000 filas con p95 < 0.2 s sobre 20 mediciones', () => {
    const rows: string[] = ['tiempo,mV'];
    for (let i = 0; i < 30_000; i++) {
      const t = (i * 0.002).toFixed(3);
      const mV = (Math.sin(i / 50) * 0.5).toFixed(6);
      rows.push(`${t},${mV}`);
    }
    const csv = rows.join('\n');

    const timings: number[] = [];
    for (let run = 0; run < 20; run++) {
      const start = performance.now();
      const result = parseCsv(csv);
      const elapsed = performance.now() - start;
      expect(result.ok).toBe(true);
      timings.push(elapsed);
    }

    timings.sort((a, b) => a - b);
    // p95 sobre 20 muestras: índice ceil(0.95*20)-1 = 18 (la 19.ª más lenta).
    const p95 = timings[Math.ceil(0.95 * timings.length) - 1];
    console.log(`[perf] p95 parseCsv 30k filas = ${p95.toFixed(2)} ms`);
    expect(p95).toBeLessThan(200);
  });
});
