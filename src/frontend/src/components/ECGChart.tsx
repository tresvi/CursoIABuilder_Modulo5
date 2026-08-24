import { useCallback, useEffect, useRef, useState } from 'react';
import { cn } from '@/lib/utils';
import { computeYRange, xToTime, yToMv } from '@/lib/ecg/chart/scale';
import { MIN_DRAG_PX, pixelRangeToWindow } from '@/lib/ecg/chart/zoom';
import type { ChartDims, TimeWindow, YRange } from '@/lib/ecg/chart/types';
import { useSignalStore } from '@/state/signalStore';
import { useViewStore } from '@/state/viewStore';
import { useMarkersStore } from '@/state/markersStore';
import { ConfirmDialog } from '@/components/ConfirmDialog';
import { formatMarkerTime } from '@/lib/ecg/chart/format';
import { drawChart } from './render/drawChart';
import { clearOverlay, drawRuler, drawSelection } from './render/drawOverlay';

/**
 * Dimensiones fijas del lienzo (px). El área de dibujo descuenta el padding.
 * Exportado para que `xToTime`/`drawMarkers` lo consuman sin duplicarlo (FEAT-003a, Block 5).
 */
export const DIMS: ChartDims = {
  width: 800,
  height: 400,
  padding: { top: 16, right: 16, bottom: 32, left: 48 },
};

/** Coordenada X relativa al canvas (los eventos de mouse llegan en px de página). */
function relativeX(clientX: number, canvas: HTMLCanvasElement | null): number {
  if (!canvas) return clientX;
  return clientX - canvas.getBoundingClientRect().left;
}

/** Coordenada Y relativa al canvas (análoga a `relativeX`, para la herramienta Regla). */
function relativeY(clientY: number, canvas: HTMLCanvasElement | null): number {
  if (!canvas) return clientY;
  return clientY - canvas.getBoundingClientRect().top;
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
  const markers = useMarkersStore((s) => s.markers);
  const openCreateForm = useMarkersStore((s) => s.openCreateForm);

  const baseRef = useRef<HTMLCanvasElement | null>(null);
  const overlayRef = useRef<HTMLCanvasElement | null>(null);
  const dragStartXRef = useRef<number | null>(null);
  const dragStartYRef = useRef<number | null>(null);
  // Fijado una sola vez en `onMouseDown` con `computeYRange(signal.samples)` y reusado
  // durante todo el arrastre: recalcularlo en cada `mousemove` sería trabajo redundante
  // (NFR-01, mismo canvas overlay que ya evita repintar el lienzo base).
  const rulerYRangeRef = useRef<YRange | null>(null);
  const prevToolRef = useRef(activeTool);
  // Rango pendiente de confirmación de recorte (FEAT-005, Block 5): estado local al
  // componente, no al store — análogo a `deletingId` en `MarkerList.tsx`.
  const [pendingCrop, setPendingCrop] = useState<TimeWindow | null>(null);

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
    drawChart(ctx, { signal, window: visibleWindow, dims: DIMS, yRange, gridVisible, markers });
  }, [signal, visibleWindow, gridVisible, markers]);

  const onMouseDown = useCallback(
    (event: React.MouseEvent<HTMLDivElement>) => {
      if (
        activeTool !== 'zoom' &&
        activeTool !== 'mark' &&
        activeTool !== 'ruler' &&
        activeTool !== 'crop'
      )
        return;
      dragStartXRef.current = relativeX(event.clientX, overlayRef.current);

      if (activeTool === 'ruler') {
        dragStartYRef.current = relativeY(event.clientY, overlayRef.current);
        if (signal) rulerYRangeRef.current = computeYRange(signal.samples);

        // Borra una medición anterior antes de empezar el nuevo arrastre: sin esto,
        // una medición más corta que la previa dejaría restos visuales (AC-04).
        const overlay = overlayRef.current;
        if (overlay) {
          const ctx = overlay.getContext('2d');
          if (ctx) clearOverlay(ctx, DIMS);
        }
      }
    },
    [activeTool, signal],
  );

  const onMouseMove = useCallback(
    (event: React.MouseEvent<HTMLDivElement>) => {
      if (activeTool !== 'zoom' && activeTool !== 'ruler' && activeTool !== 'crop') return;
      const start = dragStartXRef.current;
      if (start === null) return;
      const overlay = overlayRef.current;
      if (!overlay) return;
      const ctx = overlay.getContext('2d');
      if (!ctx) return;
      // Sólo el overlay se redibuja durante el arrastre (RNF-02).
      const x = relativeX(event.clientX, overlay);

      if (activeTool === 'ruler') {
        const startY = dragStartYRef.current;
        const yRange = rulerYRangeRef.current;
        if (startY === null || !yRange || !visibleWindow) return;
        const y = relativeY(event.clientY, overlay);
        const deltaT = xToTime(x, visibleWindow, DIMS) - xToTime(start, visibleWindow, DIMS);
        const deltaAmplitude = yToMv(y, yRange, DIMS) - yToMv(startY, yRange, DIMS);
        drawRuler(ctx, start, startY, x, y, DIMS, deltaT, deltaAmplitude);
        return;
      }

      drawSelection(ctx, start, x, DIMS);
    },
    [activeTool, visibleWindow],
  );

  const onMouseUp = useCallback(
    (event: React.MouseEvent<HTMLDivElement>) => {
      if (
        activeTool !== 'zoom' &&
        activeTool !== 'mark' &&
        activeTool !== 'ruler' &&
        activeTool !== 'crop'
      )
        return;
      const start = dragStartXRef.current;
      const startY = dragStartYRef.current;
      dragStartXRef.current = null;
      dragStartYRef.current = null;
      const overlay = overlayRef.current;

      if (activeTool !== 'ruler' && activeTool !== 'crop') {
        if (overlay) {
          const ctx = overlay.getContext('2d');
          if (ctx) clearOverlay(ctx, DIMS);
        }
      }
      if (start === null || !overlay) return;

      const end = relativeX(event.clientX, overlay);

      if (activeTool === 'zoom') {
        if (!visibleWindow) return;
        const win = pixelRangeToWindow(start, end, visibleWindow, DIMS);
        if (win) setZoomWindow(win);
        return;
      }

      if (activeTool === 'crop') {
        if (!visibleWindow) return;
        const win = pixelRangeToWindow(start, end, visibleWindow, DIMS);
        if (!win) {
          // Arrastre < MIN_DRAG_PX (AC-04): el overlay no se limpió arriba (guard
          // ajustado para excluir 'crop'), así que Recorte lo limpia acá.
          const ctx = overlay.getContext('2d');
          if (ctx) clearOverlay(ctx, DIMS);
          return;
        }
        // NO limpiar el overlay: la selección debe seguir resaltada (FR-02) mientras
        // el ConfirmDialog está abierto.
        setPendingCrop(win);
        return;
      }

      if (activeTool === 'ruler') {
        // Desplazamiento despreciable (o clic sin arrastre): no deja medición visible
        // (AC-06). Con desplazamiento suficiente, se deja el último dibujo de
        // `onMouseMove` tal cual — no hay estado adicional que persistir (AC-03).
        const endY = relativeY(event.clientY, overlay);
        const deltaX = Math.abs(end - start);
        const deltaY = startY === null ? 0 : Math.abs(endY - startY);
        if (deltaX < MIN_DRAG_PX && deltaY < MIN_DRAG_PX) {
          const ctx = overlay.getContext('2d');
          if (ctx) clearOverlay(ctx, DIMS);
        }
        return;
      }

      // activeTool === 'mark': un clic simple (desplazamiento < MIN_DRAG_PX) abre el
      // formulario de creación (en `markersStore`) con el tiempo del clic; un arrastre
      // se ignora en silencio (fuera de alcance del PRD para esta herramienta).
      if (Math.abs(end - start) >= MIN_DRAG_PX) return;
      if (!visibleWindow) return;
      openCreateForm(xToTime(end, visibleWindow, DIMS));
    },
    [activeTool, visibleWindow, setZoomWindow, openCreateForm],
  );

  const handleConfirmCrop = useCallback(() => {
    if (pendingCrop) {
      useSignalStore.getState().cropToRange(pendingCrop);
      useMarkersStore.getState().removeMarkersOutside(pendingCrop);
    }
    setPendingCrop(null);
    const overlay = overlayRef.current;
    if (overlay) {
      const ctx = overlay.getContext('2d');
      if (ctx) clearOverlay(ctx, DIMS);
    }
  }, [pendingCrop]);

  const handleCancelCrop = useCallback(() => {
    setPendingCrop(null);
    const overlay = overlayRef.current;
    if (overlay) {
      const ctx = overlay.getContext('2d');
      if (ctx) clearOverlay(ctx, DIMS);
    }
  }, []);

  // Limpia el overlay al abandonar la herramienta Regla (cambio de herramienta o
  // desactivación), sin depender de un evento de mouse: cubre AC-05. Se dispara sólo
  // en la TRANSICIÓN desde 'ruler' (vía `prevToolRef`), no en cada montaje/cambio de
  // `activeTool`: así no toca el canvas overlay cuando nunca hubo una medición que
  // borrar (evita un `getContext` innecesario en el primer render).
  useEffect(() => {
    const prevTool = prevToolRef.current;
    prevToolRef.current = activeTool;
    if (prevTool !== 'ruler' || activeTool === 'ruler') return;
    const overlay = overlayRef.current;
    if (!overlay) return;
    const ctx = overlay.getContext('2d');
    if (!ctx) return;
    clearOverlay(ctx, DIMS);
  }, [activeTool]);

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
    <>
      <div
        data-testid="ecg-chart"
        onMouseDown={onMouseDown}
        onMouseMove={onMouseMove}
        onMouseUp={onMouseUp}
        style={{ width: DIMS.width, height: DIMS.height }}
        className={cn(
          'relative mx-auto rounded-lg border border-slate-200 bg-white',
          activeTool === 'zoom' && 'cursor-zoom-in',
          (activeTool === 'ruler' || activeTool === 'crop') && 'cursor-crosshair',
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

      <ConfirmDialog
        open={pendingCrop !== null}
        title="Confirmar recorte"
        description={
          pendingCrop
            ? `¿Recortar la señal a ${formatMarkerTime(pendingCrop.fromTime)} – ${formatMarkerTime(pendingCrop.toTime)}? Esta acción no se puede deshacer.`
            : ''
        }
        onConfirm={handleConfirmCrop}
        onCancel={handleCancelCrop}
      />
    </>
  );
}
