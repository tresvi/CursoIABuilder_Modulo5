import { describe, it, expect, beforeEach } from 'vitest';
import { useViewStore } from './viewStore';

/**
 * Tests del viewStore (FEAT-002, Block 2). Estado de vista desacoplado de la señal.
 * Se resetea el store antes de cada test (patrón de CsvUpload.test).
 */
describe('viewStore', () => {
  beforeEach(() => {
    useViewStore.getState().reset();
  });

  it('parte de los defaults', () => {
    const s = useViewStore.getState();
    expect(s.visibleWindow).toBeNull();
    expect(s.fullWindow).toBeNull();
    expect(s.gridVisible).toBe(true);
    expect(s.activeTool).toBe('none');
  });

  it('initForSignal setea fullWindow y visibleWindow al rango completo', () => {
    useViewStore.getState().initForSignal(0, 10);
    const s = useViewStore.getState();
    expect(s.fullWindow).toEqual({ fromTime: 0, toTime: 10 });
    expect(s.visibleWindow).toEqual({ fromTime: 0, toTime: 10 });
  });

  it('setZoomWindow válido (dentro de fullWindow, from<to) actualiza visibleWindow', () => {
    useViewStore.getState().initForSignal(0, 10);
    useViewStore.getState().setZoomWindow({ fromTime: 2, toTime: 5 });
    expect(useViewStore.getState().visibleWindow).toEqual({ fromTime: 2, toTime: 5 });
  });

  it('setZoomWindow con fromTime>=toTime es ignorado (invalid-window)', () => {
    useViewStore.getState().initForSignal(0, 10);
    useViewStore.getState().setZoomWindow({ fromTime: 3, toTime: 7 });
    useViewStore.getState().setZoomWindow({ fromTime: 6, toTime: 6 });
    expect(useViewStore.getState().visibleWindow).toEqual({ fromTime: 3, toTime: 7 });
    useViewStore.getState().setZoomWindow({ fromTime: 8, toTime: 4 });
    expect(useViewStore.getState().visibleWindow).toEqual({ fromTime: 3, toTime: 7 });
  });

  it('setZoomWindow con borde inferior fuera de fullWindow lo clampea a fullWindow.fromTime', () => {
    useViewStore.getState().initForSignal(0, 10);
    // fromTime<fullWindow.fromTime pero intersección no vacía: se recorta el borde inferior.
    useViewStore.getState().setZoomWindow({ fromTime: -3, toTime: 8 });
    expect(useViewStore.getState().visibleWindow).toEqual({ fromTime: 0, toTime: 8 });
  });

  it('setZoomWindow totalmente fuera de fullWindow (intersección vacía) es no-op', () => {
    useViewStore.getState().initForSignal(0, 10);
    useViewStore.getState().setZoomWindow({ fromTime: 20, toTime: 30 });
    expect(useViewStore.getState().visibleWindow).toEqual({ fromTime: 0, toTime: 10 });
  });

  it('setZoomWindow sin señal (fullWindow null) setea visibleWindow directo sin clampear', () => {
    // Sin initForSignal: fullWindow es null, no hay límites que aplicar.
    useViewStore.getState().setZoomWindow({ fromTime: 2, toTime: 5 });
    expect(useViewStore.getState().visibleWindow).toEqual({ fromTime: 2, toTime: 5 });
  });

  it('resetZoom vuelve visibleWindow a fullWindow tras un zoom', () => {
    useViewStore.getState().initForSignal(0, 10);
    useViewStore.getState().setZoomWindow({ fromTime: 2, toTime: 5 });
    useViewStore.getState().resetZoom();
    expect(useViewStore.getState().visibleWindow).toEqual({ fromTime: 0, toTime: 10 });
  });

  it('resetZoom sin señal (fullWindow null) es no-op sin excepción (reset-without-signal)', () => {
    expect(() => useViewStore.getState().resetZoom()).not.toThrow();
    expect(useViewStore.getState().visibleWindow).toBeNull();
  });

  it("setActiveTool('zoom') marca activo y setActiveTool('none') desactiva", () => {
    useViewStore.getState().setActiveTool('zoom');
    expect(useViewStore.getState().activeTool).toBe('zoom');
    useViewStore.getState().setActiveTool('none');
    expect(useViewStore.getState().activeTool).toBe('none');
  });

  it('toggleGrid alterna gridVisible (true → false → true)', () => {
    expect(useViewStore.getState().gridVisible).toBe(true);
    useViewStore.getState().toggleGrid();
    expect(useViewStore.getState().gridVisible).toBe(false);
    useViewStore.getState().toggleGrid();
    expect(useViewStore.getState().gridVisible).toBe(true);
  });

  it('reset vuelve todo a los defaults', () => {
    useViewStore.getState().initForSignal(0, 10);
    useViewStore.getState().setActiveTool('zoom');
    useViewStore.getState().toggleGrid();
    useViewStore.getState().reset();
    const s = useViewStore.getState();
    expect(s.visibleWindow).toBeNull();
    expect(s.fullWindow).toBeNull();
    expect(s.gridVisible).toBe(true);
    expect(s.activeTool).toBe('none');
  });
});
