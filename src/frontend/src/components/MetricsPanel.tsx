import { useMemo } from 'react';
import { useSignalStore } from '@/state/signalStore';
import { useViewStore } from '@/state/viewStore';
import { samplesInWindow } from '@/lib/ecg/metrics/window';
import { computeHrvMetrics } from '@/lib/ecg/metrics/hrv';
import type { HrvMetrics } from '@/lib/ecg/metrics/types';

/** Formatea un campo de `HrvMetrics`, o `"N/A"` cuando no es calculable (AC-04). */
function formatMetric(value: number | null, digits: number): string {
  return value === null ? 'N/A' : value.toFixed(digits);
}

/**
 * Panel de métricas cardíacas HRV (FEAT-006, Block 4): compone `samplesInWindow`
 * (Block 3) y `computeHrvMetrics` (Block 2) sobre la ventana visible del `viewStore`
 * y muestra BPM/SDNN/RMSSD/pNN50 o "N/A" por campo. El `useMemo` solo recalcula
 * cuando cambia la referencia de `signal` o `visibleWindow` (FR-04, NFR-02): nunca en
 * cada render, y sin tocar el canvas de `ECGChart`.
 */
export function MetricsPanel() {
  const signal = useSignalStore((s) => s.signal);
  const visibleWindow = useViewStore((s) => s.visibleWindow);

  const metrics: HrvMetrics | null = useMemo(() => {
    if (!signal || !visibleWindow) return null;
    const windowed = samplesInWindow(signal.samples, visibleWindow);
    return computeHrvMetrics(windowed);
  }, [signal, visibleWindow]);

  // Estado vacío: sin señal (o sin ventana visible) no se muestra el panel — mismo
  // criterio que ECGChart cuando `!signal`.
  if (!metrics) return null;

  return (
    <section
      aria-label="Métricas cardíacas"
      className="mx-auto flex max-w-3xl items-center gap-4 rounded-md border border-slate-300 bg-white p-3 text-sm"
    >
      <div className="flex flex-col items-center">
        <span className="text-xs font-medium text-slate-500">BPM</span>
        <span aria-label="BPM" className="font-mono text-sky-700">
          {formatMetric(metrics.bpm, 0)}
        </span>
      </div>
      <div className="flex flex-col items-center">
        <span className="text-xs font-medium text-slate-500">SDNN (ms)</span>
        <span aria-label="SDNN" className="font-mono text-sky-700">
          {formatMetric(metrics.sdnn, 1)}
        </span>
      </div>
      <div className="flex flex-col items-center">
        <span className="text-xs font-medium text-slate-500">RMSSD (ms)</span>
        <span aria-label="RMSSD" className="font-mono text-sky-700">
          {formatMetric(metrics.rmssd, 1)}
        </span>
      </div>
      <div className="flex flex-col items-center">
        <span className="text-xs font-medium text-slate-500">pNN50 (%)</span>
        <span aria-label="pNN50" className="font-mono text-sky-700">
          {formatMetric(metrics.pnn50, 1)}
        </span>
      </div>
    </section>
  );
}
