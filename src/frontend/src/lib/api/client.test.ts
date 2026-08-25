import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

describe('checkHealth', () => {
  const originalFetch = global.fetch;

  beforeEach(() => {
    vi.resetModules();
  });

  afterEach(() => {
    global.fetch = originalFetch;
    vi.unstubAllEnvs();
  });

  it('devuelve { ok: true } cuando fetch resuelve con res.ok === true', async () => {
    global.fetch = vi.fn().mockResolvedValue({ ok: true } as Response);

    const { checkHealth } = await import('./client');
    const result = await checkHealth();

    expect(result).toEqual({ ok: true });
  });

  it('devuelve { ok: false } cuando fetch rechaza (backend caído)', async () => {
    global.fetch = vi.fn().mockRejectedValue(new Error('network error'));

    const { checkHealth } = await import('./client');
    const result = await checkHealth();

    expect(result).toEqual({ ok: false });
  });

  it('usa http://localhost:5080 como base cuando VITE_API_BASE no está definida', async () => {
    vi.stubEnv('VITE_API_BASE', undefined);
    const fetchMock = vi.fn().mockResolvedValue({ ok: true } as Response);
    global.fetch = fetchMock;

    const { checkHealth } = await import('./client');
    await checkHealth();

    expect(fetchMock).toHaveBeenCalledWith('http://localhost:5080/api/health');
  });
});
