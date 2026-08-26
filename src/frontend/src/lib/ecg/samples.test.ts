import { describe, it, expect, vi, afterEach } from 'vitest';
import { existsSync, statSync } from 'node:fs';
import { resolve } from 'node:path';
import { EXAMPLE_SAMPLES, fetchExampleSample } from './samples';

/** Presupuesto de tamaño por archivo de ejemplo (NFR-03 de FEAT-009). */
const MAX_SAMPLE_BYTES = 260 * 1024;

/**
 * Ruta en disco del asset que Vite sirve desde `public/` para un `path` del catálogo.
 * La suite corre con `cwd` en `src/frontend` (raíz de Vite); si se la invoca desde la
 * raíz del repo, se cae al prefijo `src/frontend`.
 */
function publicFilePath(path: string): string {
  const fromViteRoot = resolve(process.cwd(), `public${path}`);
  return existsSync(fromViteRoot)
    ? fromViteRoot
    : resolve(process.cwd(), `src/frontend/public${path}`);
}

afterEach(() => {
  vi.unstubAllGlobals();
});

describe('samples — catálogo de señales de ejemplo (FEAT-009, Block 5)', () => {
  it('un id fuera del catálogo devuelve ok:false y no dispara ningún fetch (R-07)', async () => {
    const fetchMock = vi.fn();
    vi.stubGlobal('fetch', fetchMock);

    // Ids que un llamador malicioso podría intentar: path traversal, ruta absoluta
    // y un id simplemente inexistente. Ninguno debe llegar a la red.
    for (const id of ['../../etc/passwd', '/etc/passwd', 'ECG_20_Seg_INEXISTENTE', '']) {
      await expect(fetchExampleSample(id)).resolves.toEqual({ ok: false });
    }

    expect(fetchMock).not.toHaveBeenCalled();
  });

  it('cada archivo de public/samples pesa ≤ 260 KB (NFR-03)', () => {
    expect(EXAMPLE_SAMPLES).toHaveLength(3);

    for (const sample of EXAMPLE_SAMPLES) {
      const file = publicFilePath(sample.path);
      expect(existsSync(file), `falta el asset ${sample.path}`).toBe(true);
      expect(statSync(file).size, `${sample.path} supera el presupuesto`).toBeLessThanOrEqual(
        MAX_SAMPLE_BYTES,
      );
    }
  });
});
