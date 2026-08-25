import { describe, it, expect, vi } from 'vitest';
import { drawRuler } from './drawOverlay';
import type { ChartDims } from '@/lib/ecg/chart/types';

const DIMS: ChartDims = {
  width: 800,
  height: 400,
  padding: { top: 16, right: 16, bottom: 32, left: 48 },
};

function createCtxStub(): CanvasRenderingContext2D {
  return {
    save: () => {},
    restore: () => {},
    clearRect: () => {},
    beginPath: () => {},
    moveTo: () => {},
    lineTo: () => {},
    stroke: () => {},
    fill: () => {},
    fillRect: () => {},
    strokeRect: () => {},
    fillText: () => {},
    strokeStyle: '',
    fillStyle: '',
    lineWidth: 1,
    font: '',
    textAlign: 'left',
    textBaseline: 'alphabetic',
  } as unknown as CanvasRenderingContext2D;
}

describe('drawRuler', () => {
  it('dibuja un rectángulo entre los dos puntos dados', () => {
    const ctx = createCtxStub();
    const fillRectSpy = vi.fn();
    const strokeRectSpy = vi.fn();
    ctx.fillRect = fillRectSpy;
    ctx.strokeRect = strokeRectSpy;

    drawRuler(ctx, 10, 20, 100, 200, DIMS, 0.5, 1.2);

    expect(fillRectSpy).toHaveBeenCalledWith(10, 20, 90, 180);
    expect(strokeRectSpy).toHaveBeenCalledWith(10, 20, 90, 180);
  });

  it('normaliza el rectángulo cuando el arrastre va de derecha a izquierda / abajo hacia arriba', () => {
    const ctx = createCtxStub();
    const fillRectSpy = vi.fn();
    ctx.fillRect = fillRectSpy;

    drawRuler(ctx, 100, 200, 10, 20, DIMS, 0.5, 1.2);

    expect(fillRectSpy).toHaveBeenCalledWith(10, 20, 90, 180);
  });

  it('limpia el overlay antes de dibujar, para no acumular mediciones anteriores (FIX-002)', () => {
    const ctx = createCtxStub();
    const callOrder: string[] = [];
    ctx.clearRect = () => {
      callOrder.push('clearRect');
    };
    ctx.fillRect = () => {
      callOrder.push('fillRect');
    };
    ctx.strokeRect = () => {
      callOrder.push('strokeRect');
    };

    drawRuler(ctx, 10, 20, 100, 200, DIMS, 0.5, 1.2);

    expect(callOrder[0]).toBe('clearRect');
    expect(callOrder).toContain('fillRect');
    expect(callOrder).toContain('strokeRect');
  });

  it('reusa el color/grosor de trazo de drawSelection, sin definir una paleta nueva', () => {
    const ctx = createCtxStub();

    drawRuler(ctx, 10, 20, 100, 200, DIMS, 0.5, 1.2);

    expect(ctx.lineWidth).toBe(1);
    expect(String(ctx.strokeStyle)).not.toBe('');
  });

  it('pinta el texto Δt/ΔmV con fillText, con el valor absoluto y formato esperado', () => {
    const ctx = createCtxStub();
    const fillTextSpy = vi.fn();
    ctx.fillText = fillTextSpy;

    drawRuler(ctx, 10, 20, 100, 200, DIMS, 0.5, 1.2);

    const texts = fillTextSpy.mock.calls.map((c) => String(c[0]));
    expect(texts).toContain('Δt: 0.500s');
    expect(texts).toContain('ΔmV: 1.20mV');
  });

  it('con deltaT/deltaAmplitude negativos muestra el valor absoluto (sin signo negativo)', () => {
    const ctx = createCtxStub();
    const fillTextSpy = vi.fn();
    ctx.fillText = fillTextSpy;

    drawRuler(ctx, 10, 20, 100, 200, DIMS, -0.5, -1.2);

    const texts = fillTextSpy.mock.calls.map((c) => String(c[0]));
    expect(texts).toContain('Δt: 0.500s');
    expect(texts).toContain('ΔmV: 1.20mV');
    expect(texts.some((t) => t.includes('-'))).toBe(false);
  });
});
