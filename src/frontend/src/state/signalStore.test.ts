import { describe, it, expect, beforeEach } from 'vitest';
import { useSignalStore } from './signalStore';

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
});
