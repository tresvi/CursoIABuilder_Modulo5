import { describe, expect, it } from 'vitest';
import { computeSampleRateHz } from './sampleRate';
import type { ECGSignal } from './types';

describe('computeSampleRateHz', () => {
  it('calcula ~10Hz sobre una señal con dt=0.1 constante', () => {
    const signal: ECGSignal = {
      samples: [
        { t: 0, mV: 0 },
        { t: 0.1, mV: 0 },
        { t: 0.2, mV: 0 },
        { t: 0.3, mV: 0 },
      ],
    };

    expect(computeSampleRateHz(signal)).toBeCloseTo(10, 5);
  });

  it('calcula el promedio de deltas cuando el muestreo no es perfectamente uniforme', () => {
    // deltas: 0.1, 0.1, 0.2 → promedio 0.1333... → 1/0.1333... ≈ 7.5
    const signal: ECGSignal = {
      samples: [
        { t: 0, mV: 0 },
        { t: 0.1, mV: 0 },
        { t: 0.2, mV: 0 },
        { t: 0.4, mV: 0 },
      ],
    };

    const avgDelta = (0.1 + 0.1 + 0.2) / 3;
    expect(computeSampleRateHz(signal)).toBeCloseTo(1 / avgDelta, 5);
  });
});
