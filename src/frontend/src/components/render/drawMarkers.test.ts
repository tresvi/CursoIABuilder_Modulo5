import { describe, it, expect, vi } from 'vitest';
import { drawMarkers } from './drawMarkers';
import { timeToX } from '@/lib/ecg/chart/scale';
import type { ChartDims, Marker, TimeWindow } from '@/lib/ecg/chart/types';

const DIMS: ChartDims = {
  width: 800,
  height: 400,
  padding: { top: 16, right: 16, bottom: 32, left: 48 },
};

const WINDOW: TimeWindow = { fromTime: 0, toTime: 10 };

function createCtxStub(): CanvasRenderingContext2D {
  return {
    save: () => {},
    restore: () => {},
    beginPath: () => {},
    moveTo: () => {},
    lineTo: () => {},
    stroke: () => {},
    fill: () => {},
    fillText: () => {},
    strokeStyle: '',
    fillStyle: '',
    lineWidth: 1,
    font: '',
    textAlign: 'left',
    textBaseline: 'alphabetic',
  } as unknown as CanvasRenderingContext2D;
}

describe('drawMarkers', () => {
  it('no dibuja nada si markers está vacío', () => {
    const ctx = createCtxStub();
    const moveToSpy = vi.fn();
    ctx.moveTo = moveToSpy;

    drawMarkers(ctx, [], WINDOW, DIMS);

    expect(moveToSpy).not.toHaveBeenCalled();
  });

  it('dibuja un marcador por cada elemento de markers en la posición X esperada según timeToX', () => {
    const ctx = createCtxStub();
    const moveToSpy = vi.fn();
    ctx.moveTo = moveToSpy;

    const markers: Marker[] = [
      { id: '1', time: 2, label: null },
      { id: '2', time: 7, label: 'PVC' },
    ];

    drawMarkers(ctx, markers, WINDOW, DIMS);

    // Al menos una línea vertical trazada por marcador, en la X esperada.
    const expectedX1 = timeToX(2, WINDOW, DIMS);
    const expectedX2 = timeToX(7, WINDOW, DIMS);
    const xsUsed = moveToSpy.mock.calls.map((c) => c[0]);
    expect(xsUsed).toContain(expectedX1);
    expect(xsUsed).toContain(expectedX2);
  });

  it('pinta el texto del label vía fillText (nunca inserción de HTML)', () => {
    const ctx = createCtxStub();
    const fillTextSpy = vi.fn();
    ctx.fillText = fillTextSpy;

    const markers: Marker[] = [{ id: '1', time: 3, label: '<img onerror=alert(1)>' }];

    drawMarkers(ctx, markers, WINDOW, DIMS);

    expect(fillTextSpy).toHaveBeenCalled();
    const texts = fillTextSpy.mock.calls.map((c) => String(c[0]));
    expect(texts.some((t) => t.includes('<img onerror=alert(1)>'))).toBe(true);
  });
});
