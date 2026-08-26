import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import type { ECGSignal } from '../ecg/types';

describe('applyFilter', () => {
  const originalFetch = global.fetch;
  const signal: ECGSignal = {
    samples: [
      { t: 0, mV: 0.1 },
      { t: 0.1, mV: 0.2 },
    ],
  };

  beforeEach(() => {
    vi.resetModules();
  });

  afterEach(() => {
    global.fetch = originalFetch;
    vi.unstubAllEnvs();
  });

  it('devuelve { ok: true, signal } cuando el backend responde 200', async () => {
    const filteredSamples = [
      { t: 0, mV: 0.15 },
      { t: 0.1, mV: 0.25 },
    ];
    global.fetch = vi.fn().mockResolvedValue({
      ok: true,
      status: 200,
      json: async () => ({ samples: filteredSamples }),
    } as Response);

    const { applyFilter } = await import('./filters');
    const result = await applyFilter(signal, 'LowPass', { cutoff: 49.5 });

    expect(result).toEqual({ ok: true, signal: { samples: filteredSamples } });
  });

  it('devuelve { ok: false, error } cuando el backend responde 200 con casing incorrecto (mv en vez de mV)', async () => {
    global.fetch = vi.fn().mockResolvedValue({
      ok: true,
      status: 200,
      json: async () => ({ samples: [{ t: 0, mv: 0.15 }] }),
    } as Response);

    const { applyFilter } = await import('./filters');
    const result = await applyFilter(signal, 'LowPass', { cutoff: 49.5 });

    expect(result).toEqual({ ok: false, error: 'Respuesta del backend con formato inesperado' });
  });

  it('devuelve { ok: false, error } cuando el backend responde 400', async () => {
    global.fetch = vi.fn().mockResolvedValue({
      ok: false,
      status: 400,
      json: async () => ({ error: 'La frecuencia excede Nyquist' }),
    } as Response);

    const { applyFilter } = await import('./filters');
    const result = await applyFilter(signal, 'LowPass', { cutoff: 999 });

    expect(result).toEqual({ ok: false, error: 'La frecuencia excede Nyquist' });
  });

  it('devuelve { ok: false, error } cuando fetch rechaza (backend caído)', async () => {
    global.fetch = vi.fn().mockRejectedValue(new Error('network error'));

    const { applyFilter } = await import('./filters');
    const result = await applyFilter(signal, 'LowPass', { cutoff: 49.5 });

    expect(result).toEqual({ ok: false, error: 'No se pudo conectar con el backend' });
  });

  it("devuelve { ok: false, error: 'Error inesperado del servidor' } cuando el backend responde con un código distinto de 200/400", async () => {
    global.fetch = vi.fn().mockResolvedValue({
      ok: false,
      status: 500,
      json: async () => ({}),
    } as Response);

    const { applyFilter } = await import('./filters');
    const result = await applyFilter(signal, 'LowPass', { cutoff: 49.5 });

    expect(result).toEqual({ ok: false, error: 'Error inesperado del servidor' });
  });

  it('llama a fetch con la URL, método y body esperados', async () => {
    const fetchMock = vi.fn().mockResolvedValue({
      ok: true,
      status: 200,
      json: async () => ({ samples: signal.samples }),
    } as Response);
    global.fetch = fetchMock;

    const { applyFilter } = await import('./filters');
    await applyFilter(signal, 'LowPass', { cutoff: 49.5 });

    expect(fetchMock).toHaveBeenCalledWith(
      'http://localhost:5080/api/filters/apply',
      expect.objectContaining({
        method: 'POST',
        headers: expect.objectContaining({ 'Content-Type': 'application/json' }),
        body: JSON.stringify({ samples: signal.samples, filterType: 'LowPass', cutoff: 49.5 }),
      }),
    );
  });
});
