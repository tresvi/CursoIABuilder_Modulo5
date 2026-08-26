import { describe, expect, it } from 'vitest';
import { signalDurationSeconds } from './duration';
import type { ECGSignal } from './types';

function makeSignal(times: number[]): ECGSignal {
  return { samples: times.map((t) => ({ t, mV: t * 10 })) };
}

describe('signalDurationSeconds', () => {
  it('devuelve la diferencia entre la última y la primera muestra', () => {
    const signal = makeSignal([0, 0.5, 1, 19.5, 20]);
    expect(signalDurationSeconds(signal)).toBeCloseTo(20, 6);
  });
});
