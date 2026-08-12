import '@testing-library/jest-dom';
import { vi } from 'vitest';

/**
 * Mock global del contexto 2D de Canvas para jsdom (FEAT-002, Block 3).
 *
 * jsdom no implementa `HTMLCanvasElement.prototype.getContext`, así que ECGChart
 * (y App a través de él) romperían al pedir el contexto. Devolvemos un stub cuyas
 * funciones son `vi.fn()` para poder aseverar qué métodos de dibujo se invocaron.
 *
 * Se tipa SIN `any`: el stub implementa el subconjunto de `CanvasRenderingContext2D`
 * que usan `drawChart`/`drawOverlay`; el resto de propiedades (fillStyle, strokeStyle,
 * lineWidth, font, textAlign…) son asignaciones simples sobre el objeto plano.
 */
function createContext2DStub(): CanvasRenderingContext2D {
  const stub: Partial<CanvasRenderingContext2D> = {
    beginPath: vi.fn(),
    closePath: vi.fn(),
    moveTo: vi.fn(),
    lineTo: vi.fn(),
    stroke: vi.fn(),
    fill: vi.fn(),
    fillRect: vi.fn(),
    strokeRect: vi.fn(),
    clearRect: vi.fn(),
    fillText: vi.fn(),
    strokeText: vi.fn(),
    save: vi.fn(),
    restore: vi.fn(),
    setLineDash: vi.fn(),
    scale: vi.fn(),
    translate: vi.fn(),
    rect: vi.fn(),
  };
  // El stub cubre solo las funciones usadas por la capa de render; el cast está
  // justificado por eso (no es `any`: se parte de un `Partial` tipado).
  return stub as unknown as CanvasRenderingContext2D;
}

HTMLCanvasElement.prototype.getContext = vi.fn(function (
  this: HTMLCanvasElement,
  contextId: string,
): RenderingContext | null {
  return contextId === '2d' ? createContext2DStub() : null;
}) as typeof HTMLCanvasElement.prototype.getContext;
