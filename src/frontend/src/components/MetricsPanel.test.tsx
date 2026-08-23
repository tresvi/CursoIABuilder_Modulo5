import { describe, it, expect, beforeEach, vi } from 'vitest';
import { render, screen } from '@testing-library/react';
import { MetricsPanel } from './MetricsPanel';
import { useSignalStore } from '@/state/signalStore';
import { useViewStore } from '@/state/viewStore';
import type { ECGSample } from '@/lib/ecg/types';
import * as hrvModule from '@/lib/ecg/metrics/hrv';

/**
 * Genera muestras sintéticas con QRS regulares (picos gaussianos angostos) cada
 * `periodS` segundos, muestreadas a `fs` Hz, entre `[0, durationS)` — mismo criterio
 * que `rpeaks.test.ts` (Block 1) para producir picos R detectables por
 * `detectRPeaks`.
 */
function syntheticQrsSamples(durationS: number, periodS: number, fs = 250): ECGSample[] {
  const samples: ECGSample[] = [];
  const n = Math.round(durationS * fs);
  for (let i = 0; i < n; i++) {
    const t = i / fs;
    const phase = t % periodS;
    const distToPeak = Math.min(phase, periodS - phase);
    const mV = 0.1 + Math.exp(-(distToPeak * distToPeak) / (2 * 0.01 * 0.01));
    samples.push({ t, mV });
  }
  return samples;
}

/**
 * Tests de MetricsPanel (FEAT-006, Block 4). Se resetean signalStore/viewStore
 * antes de cada test (patrón de ChartToolbar.test/MarkerList.test).
 */
describe('MetricsPanel', () => {
  beforeEach(() => {
    useSignalStore.getState().reset();
    useViewStore.getState().reset();
    vi.restoreAllMocks();
  });

  it('AC-05: sin señal cargada, el panel no muestra valores de métricas', () => {
    render(<MetricsPanel />);

    expect(screen.queryByText(/bpm/i)).not.toBeInTheDocument();
    expect(screen.queryByLabelText('Métricas cardíacas')).not.toBeInTheDocument();
  });

  it('AC-02/AC-03: con una señal cargada y visibleWindow fijo, el panel muestra los 4 valores calculados', () => {
    const samples = syntheticQrsSamples(10, 0.8);
    useSignalStore.setState({ signal: { samples }, status: 'loaded', error: null });
    useViewStore.getState().initForSignal(0, 10);

    render(<MetricsPanel />);

    const section = screen.getByLabelText('Métricas cardíacas');
    expect(section).toBeInTheDocument();

    // RR ~800ms constante → bpm ~75, sdnn/rmssd ~0, pnn50 = 0.
    expect(screen.getByLabelText('BPM')).toHaveTextContent(/^7[4-6]$/);
    expect(screen.getByLabelText('SDNN')).toHaveTextContent('0.0');
    expect(screen.getByLabelText('RMSSD')).toHaveTextContent('0.0');
    expect(screen.getByLabelText('pNN50')).toHaveTextContent('0.0');
  });

  it('AC-03: cambiar visibleWindow (simulando un zoom) recalcula BPM con datos reales distintos por ventana', () => {
    // Señal construida en dos tramos con espaciado RR bien distinto: [0,10) a 0.8s
    // (RR=800ms -> bpm~75) y [10,20) a 0.5s (RR=500ms -> bpm~120). Si el useMemo
    // tuviera el arreglo de dependencias roto y nunca recalculara, la ventana B
    // seguiría mostrando el bpm de la ventana A (~75) en lugar de ~120: este test
    // fallaría en ese escenario, a diferencia de la versión anterior que solo
    // comprobaba "!== 'N/A'" en ambas ventanas.
    const fs = 250;
    const segmentA = syntheticQrsSamples(10, 0.8, fs); // bpm esperado ~75
    const segmentB = syntheticQrsSamples(10, 0.5, fs); // bpm esperado ~120
    const samples: ECGSample[] = [
      ...segmentA,
      ...segmentB.map((s) => ({ ...s, t: s.t + 10 })),
    ];

    useSignalStore.setState({ signal: { samples }, status: 'loaded', error: null });
    useViewStore.getState().initForSignal(0, 20);
    useViewStore.getState().setZoomWindow({ fromTime: 0, toTime: 10 });

    const { rerender } = render(<MetricsPanel />);
    const bpmWindowA = Number(screen.getByLabelText('BPM').textContent);
    expect(bpmWindowA).toBeGreaterThanOrEqual(72);
    expect(bpmWindowA).toBeLessThanOrEqual(80);

    useViewStore.getState().setZoomWindow({ fromTime: 10, toTime: 20 });
    rerender(<MetricsPanel />);
    const bpmWindowB = Number(screen.getByLabelText('BPM').textContent);
    expect(bpmWindowB).toBeGreaterThanOrEqual(115);
    expect(bpmWindowB).toBeLessThanOrEqual(125);

    // Prueba directa de que el recálculo ocurrió: los valores no solo son válidos,
    // son distintos entre sí y coinciden con el bpm esperado de cada ventana.
    expect(bpmWindowA).not.toBe(bpmWindowB);
  });

  it('AC-04: con una ventana visible sin suficientes picos R, las métricas no calculables muestran "N/A"', () => {
    // Señal plana: detectRPeaks devuelve [], todas las métricas son null.
    const samples: ECGSample[] = [];
    for (let i = 0; i < 100; i++) samples.push({ t: i / 100, mV: 0.5 });

    useSignalStore.setState({ signal: { samples }, status: 'loaded', error: null });
    useViewStore.getState().initForSignal(0, 1);

    render(<MetricsPanel />);

    expect(screen.getByLabelText('BPM')).toHaveTextContent('N/A');
    expect(screen.getByLabelText('SDNN')).toHaveTextContent('N/A');
    expect(screen.getByLabelText('RMSSD')).toHaveTextContent('N/A');
    expect(screen.getByLabelText('pNN50')).toHaveTextContent('N/A');
  });

  it('el useMemo no recalcula si ni signal ni visibleWindow cambiaron entre renders', () => {
    const samples = syntheticQrsSamples(5, 0.8);
    useSignalStore.setState({ signal: { samples }, status: 'loaded', error: null });
    useViewStore.getState().initForSignal(0, 5);

    const spy = vi.spyOn(hrvModule, 'computeHrvMetrics');

    const { rerender } = render(<MetricsPanel />);
    expect(spy).toHaveBeenCalledTimes(1);

    rerender(<MetricsPanel />);
    expect(spy).toHaveBeenCalledTimes(1);
  });
});
