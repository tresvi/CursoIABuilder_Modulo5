import { describe, it, expect, beforeEach, vi } from 'vitest';
import { useSignalStore } from './signalStore';
import { applyFilter as applyFilterApi } from '@/lib/api/filters';
import type { ECGSignal } from '@/lib/ecg/types';

/**
 * Mock del cliente HTTP de filtros (FEAT-007b, Block 5) — el store nunca debe
 * hablar directamente con `fetch`; se espía la función exportada por `filters.ts`.
 */
vi.mock('@/lib/api/filters', async (importOriginal) => {
  const actual = await importOriginal<typeof import('@/lib/api/filters')>();
  return { ...actual, applyFilter: vi.fn() };
});

/**
 * Tests del signalStore (FEAT-005, Block 2). Primer test dedicado de este store.
 * Se resetea el store antes de cada test (patrón de viewStore.test.ts/markersStore.test.ts).
 */
describe('signalStore', () => {
  beforeEach(() => {
    useSignalStore.getState().reset();
  });

  it('cropToRange con señal cargada y rango válido reemplaza signal por la señal acotada', () => {
    const csv = 'tiempo,mV\n0,-0.085\n0.002,-0.05\n0.004,0.1\n0.006,0.2';
    useSignalStore.getState().loadFromText(csv);
    useSignalStore.getState().cropToRange({ fromTime: 0.002, toTime: 0.004 });
    const state = useSignalStore.getState();
    expect(state.signal?.samples).toEqual([
      { t: 0.002, mV: -0.05 },
      { t: 0.004, mV: 0.1 },
    ]);
  });

  it('cropToRange sin señal cargada (signal === null) es no-op, status/error sin cambios', () => {
    useSignalStore.getState().cropToRange({ fromTime: 0, toTime: 1 });
    const state = useSignalStore.getState();
    expect(state.signal).toBeNull();
    expect(state.status).toBe('idle');
    expect(state.error).toBeNull();
  });

  it('cropToRange con rango que deja <2 muestras no cambia signal (sigue siendo el original)', () => {
    const csv = 'tiempo,mV\n0,-0.085\n0.002,-0.05\n0.004,0.1';
    useSignalStore.getState().loadFromText(csv);
    const before = useSignalStore.getState().signal;
    useSignalStore.getState().cropToRange({ fromTime: 0, toTime: 0 });
    const after = useSignalStore.getState().signal;
    expect(after).toBe(before);
  });

  describe('applyFilter / revertLastFilter (FEAT-007b, Block 6)', () => {
    beforeEach(() => {
      vi.mocked(applyFilterApi).mockReset();
    });

    const csv = 'tiempo,mV\n0,-0.085\n0.002,-0.05\n0.004,0.1\n0.006,0.2';

    it('applyFilter exitoso actualiza signal y guarda la señal previa en previousSignal', async () => {
      useSignalStore.getState().loadFromText(csv);
      const original = useSignalStore.getState().signal as ECGSignal;
      const filtered: ECGSignal = { samples: [{ t: 0, mV: 0 }, { t: 0.002, mV: 0.01 }] };
      vi.mocked(applyFilterApi).mockResolvedValueOnce({ ok: true, signal: filtered });

      const result = await useSignalStore.getState().applyFilter('LowPass', { cutoff: 49.5 });

      expect(result).toEqual({ ok: true });
      const state = useSignalStore.getState();
      expect(state.signal).toEqual(filtered);
      expect(state.previousSignal).toEqual(original);
    });

    it('applyFilter fallido no modifica signal ni previousSignal', async () => {
      useSignalStore.getState().loadFromText(csv);
      const original = useSignalStore.getState().signal;
      vi.mocked(applyFilterApi).mockResolvedValueOnce({ ok: false, error: 'parámetro inválido' });

      const result = await useSignalStore.getState().applyFilter('LowPass', { cutoff: -1 });

      expect(result).toEqual({ ok: false, error: 'parámetro inválido' });
      const state = useSignalStore.getState();
      expect(state.signal).toEqual(original);
      expect(state.previousSignal).toBeNull();
    });

    it('applyFilter llamado dos veces seguidas encadena sobre la señal ya filtrada, no la original', async () => {
      useSignalStore.getState().loadFromText(csv);
      const original = useSignalStore.getState().signal as ECGSignal;
      const firstFiltered: ECGSignal = { samples: [{ t: 0, mV: 0.5 }, { t: 0.002, mV: 0.6 }] };
      const secondFiltered: ECGSignal = { samples: [{ t: 0, mV: 0.9 }, { t: 0.002, mV: 1.0 }] };
      vi.mocked(applyFilterApi)
        .mockResolvedValueOnce({ ok: true, signal: firstFiltered })
        .mockResolvedValueOnce({ ok: true, signal: secondFiltered });

      await useSignalStore.getState().applyFilter('LowPass', { cutoff: 49.5 });
      await useSignalStore.getState().applyFilter('HighPass', { cutoff: 1 });

      expect(applyFilterApi).toHaveBeenNthCalledWith(1, original, 'LowPass', { cutoff: 49.5 });
      expect(applyFilterApi).toHaveBeenNthCalledWith(2, firstFiltered, 'HighPass', { cutoff: 1 });
      const state = useSignalStore.getState();
      expect(state.signal).toEqual(secondFiltered);
      expect(state.previousSignal).toEqual(firstFiltered);
    });

    it('revertLastFilter restaura signal a previousSignal y limpia previousSignal', async () => {
      useSignalStore.getState().loadFromText(csv);
      const original = useSignalStore.getState().signal as ECGSignal;
      const filtered: ECGSignal = { samples: [{ t: 0, mV: 0 }, { t: 0.002, mV: 0.01 }] };
      vi.mocked(applyFilterApi).mockResolvedValueOnce({ ok: true, signal: filtered });
      await useSignalStore.getState().applyFilter('LowPass', { cutoff: 49.5 });

      useSignalStore.getState().revertLastFilter();

      const state = useSignalStore.getState();
      expect(state.signal).toEqual(original);
      expect(state.previousSignal).toBeNull();
    });

    it('revertLastFilter sin filtro previo es no-op', () => {
      useSignalStore.getState().loadFromText(csv);
      const before = useSignalStore.getState().signal;

      useSignalStore.getState().revertLastFilter();

      const state = useSignalStore.getState();
      expect(state.signal).toBe(before);
      expect(state.previousSignal).toBeNull();
      expect(applyFilterApi).not.toHaveBeenCalled();
    });

    it('applyFilter sin señal cargada no llama al backend y devuelve error', async () => {
      const result = await useSignalStore.getState().applyFilter('LowPass', { cutoff: 49.5 });

      expect(result).toEqual({ ok: false, error: 'No hay una señal cargada' });
      expect(applyFilterApi).not.toHaveBeenCalled();
      const state = useSignalStore.getState();
      expect(state.signal).toBeNull();
      expect(state.previousSignal).toBeNull();
    });

    it('reset() limpia previousSignal cuando había un filtro aplicado', async () => {
      const filtered: ECGSignal = { samples: [{ t: 0, mV: 0.5 }] };
      vi.mocked(applyFilterApi).mockResolvedValueOnce({ ok: true, signal: filtered });
      useSignalStore.getState().loadFromText(csv);
      await useSignalStore.getState().applyFilter('LowPass', { cutoff: 49.5 });
      expect(useSignalStore.getState().previousSignal).not.toBeNull();

      useSignalStore.getState().reset();

      const state = useSignalStore.getState();
      expect(state.signal).toBeNull();
      expect(state.previousSignal).toBeNull();
    });
  });
});
