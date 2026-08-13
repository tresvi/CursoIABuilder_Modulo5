import { useCallback, useEffect, useRef } from 'react';
import { cn } from '@/lib/utils';
import { computeYRange } from '@/lib/ecg/chart/scale';
import { pixelRangeToWindow } from '@/lib/ecg/chart/zoom';
import type { ChartDims } from '@/lib/ecg/chart/types';
import { useSignalStore } from '@/state/signalStore';
import { useViewStore } from '@/state/viewStore';
import { drawChart } from './render/drawChart';
import { clearOverlay, drawSelection } from './render/drawOverlay';

/** Dimensiones fijas del lienzo (px). El área de dibujo descuenta el padding. */
const DIMS: ChartDims = {
  width: 800,
  height: 400,
  padding: { top: 16, right: 16, bottom: 32, left: 48 },
};

/** Coordenada X relativa al canvas (los eventos de mouse llegan en px de página). */
function relativeX(clientX: number, canvas: HTMLCanvasElement | null): number {
  if (!canvas) return clientX;
  return clientX - canvas.getBoundingClientRect().left;
}

/**
 * Gráfico ECG en Canvas 2D propio (FEAT-002, Block 3). Dos lienzos superpuestos:
 * el base (señal/ejes/rejilla) sólo se redibuja ante cambios de señal, ventana o
 * rejilla; el overlay se redibuja durante el arrastre de zoom sin tocar el base
 * (RNF-02). Deriva `[t0, tN]` de la señal y sincroniza la ventana en el `viewStore`.
 */
export function ECGChart() {
  const signal = useSignalStore((s) => s.signal);
  const visibleWindow = useViewStore((s) => s.visibleWindow);
  const gridVisible = useViewStore((s) => s.gridVisible);
  const activeTool = useViewStore((s) => s.activeTool);
  const initForSignal = useViewStore((s) => s.initForSignal);
  const setZoomWindow = useViewStore((s) => s.setZoomWindow);

  const baseRef = useRef<HTMLCanvasElement | null>(null);
  const overlayRef = useRef<HTMLCanvasElement | null>(null);
  const dragStartXRef = useRef<number | null>(null);

  // Sync señal → vista: fija la ventana completa al cargarse una señal válida.
  // Guarda: con < 2 muestras o rango degenerado (t0 >= tN) NO inicializa (evita
  // una fullWindow inválida — WARN de la auditoría del Block 2).
  useEffect(() => {
    if (!signal) return;
    const { samples } = signal;
    if (samples.length < 2) return;
    const t0 = samples[0].t;
    const tN = samples[samples.length - 1].t;
    if (!(t0 < tN)) return;
    initForSignal(t0, tN);
  }, [signal, initForSignal]);

  // Render del lienzo base: sólo ante cambios de señal, ventana visible o rejilla.
  useEffect(() => {
    const canvas = baseRef.current;
    if (!canvas || !signal || !visibleWindow) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return; // no-2d-context: guarda, no lanza.
    const yRange = computeYRange(signal.samples);
    drawChart(ctx, { signal, window: visibleWindow, dims: DIMS, yRange, gridVisible });
  }, [signal, visibleWindow, gridVisible]);

  const onMouseDown = useCallback(
    (event: React.MouseEvent<HTMLDivElement>) => {
      if (activeTool !== 'zoom') return;
      dragStartXRef.current = relativeX(event.clientX, overlayRef.current);
    },
    [activeTool],
  );

  const onMouseMove = useCallback(
    (event: React.MouseEvent<HTMLDivElement>) => {
      if (activeTool !== 'zoom') return;
      const start = dragStartXRef.current;
      if (start === null) return;
      const overlay = overlayRef.current;
      if (!overlay) return;
      const ctx = overlay.getContext('2d');
      if (!ctx) return;
      // Sólo el overlay se redibuja durante el arrastre (RNF-02).
      drawSelection(ctx, start, relativeX(event.clientX, overlay), DIMS);
    },
    [activeTool],
  );

  const onMouseUp = useCallback(
    (event: React.MouseEvent<HTMLDivElement>) => {
      if (activeTool !== 'zoom') return;
      const start = dragStartXRef.current;
      dragStartXRef.current = null;
      const overlay = overlayRef.current;
      if (overlay) {
        const ctx = overlay.getContext('2d');
        if (ctx) clearOverlay(ctx, DIMS);
      }
      if (start === null || !visibleWindow || !overlay) return;
      const win = pixelRangeToWindow(start, relativeX(event.clientX, overlay), visibleWindow, DIMS);
      if (win) setZoomWindow(win);
    },
    [activeTool, visibleWindow, setZoomWindow],
  );

  // Estado vacío: sin señal no se montan lienzos, se muestra un indicador.
  if (!signal) {
    return (
      <div
        role="status"
        className="mx-auto flex h-64 max-w-3xl items-center justify-center rounded-lg border border-dashed border-slate-300 bg-slate-50 text-sm text-slate-500"
      >
        Cargá una señal para visualizarla.
      </div>
    );
  }

  return (
    <div
      data-testid="ecg-chart"
      onMouseDown={onMouseDown}
      onMouseMove={onMouseMove}
      onMouseUp={onMouseUp}
      style={{ width: DIMS.width, height: DIMS.height }}
      className={cn(
        'relative mx-auto rounded-lg border border-slate-200 bg-white',
        activeTool === 'zoom' && 'cursor-zoom-in',
      )}
    >
      <canvas
        ref={baseRef}
        width={DIMS.width}
        height={DIMS.height}
        className="absolute inset-0"
        aria-label="Gráfico ECG"
      />
      <canvas
        ref={overlayRef}
        width={DIMS.width}
        height={DIMS.height}
        className="absolute inset-0"
        aria-hidden="true"
      />
    </div>
  );
}
