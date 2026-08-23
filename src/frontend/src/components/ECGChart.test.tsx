import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { render, screen, fireEvent, act } from '@testing-library/react';
import { ECGChart } from './ECGChart';
import { drawChart } from './render/drawChart';
import { drawSelection, clearOverlay } from './render/drawOverlay';
import { useSignalStore } from '@/state/signalStore';
import { useViewStore } from '@/state/viewStore';
import { useMarkersStore } from '@/state/markersStore';
import type { ECGSample } from '@/lib/ecg/types';

// Espiamos la capa de render conservando su implementación real (call-through),
// para poder aseverar TANTO las llamadas al ctx (drawChart real dibuja) COMO el
// número de invocaciones de drawChart/drawSelection (RNF-02, sin full-repaint).
vi.mock('./render/drawChart', async (importOriginal) => {
  const actual = await importOriginal<typeof import('./render/drawChart')>();
  return { ...actual, drawChart: vi.fn(actual.drawChart) };
});
vi.mock('./render/drawOverlay', async (importOriginal) => {
  const actual = await importOriginal<typeof import('./render/drawOverlay')>();
  return {
    ...actual,
    drawSelection: vi.fn(actual.drawSelection),
    clearOverlay: vi.fn(actual.clearOverlay),
  };
});

const SAMPLES: ECGSample[] = [
  { t: 0, mV: 0 },
  { t: 2, mV: 1 },
  { t: 4, mV: -1 },
  { t: 6, mV: 0.5 },
  { t: 8, mV: -0.5 },
  { t: 10, mV: 0 },
];

function loadSignal(samples: ECGSample[] = SAMPLES): void {
  useSignalStore.setState({ signal: { samples }, status: 'loaded', error: null });
}

/** Devuelve el ctx del lienzo base pasado en la última llamada a drawChart. */
function lastBaseCtx(): CanvasRenderingContext2D {
  const calls = vi.mocked(drawChart).mock.calls;
  return calls[calls.length - 1][0];
}

function getContainer(): HTMLElement {
  return screen.getByTestId('ecg-chart');
}

beforeEach(() => {
  useSignalStore.getState().reset();
  useViewStore.getState().reset();
  useMarkersStore.getState().reset();
  vi.clearAllMocks();
});

afterEach(() => {
  vi.restoreAllMocks();
});

describe('ECGChart — AC-01 (dibuja señal + ejes s/mV y sincroniza la vista)', () => {
  it('al montar con señal llama drawChart, dibuja la curva y ejes en s/mV, e inicializa la ventana completa', () => {
    loadSignal();
    render(<ECGChart />);

    // Se dibujó el lienzo base.
    expect(drawChart).toHaveBeenCalled();

    // initForSignal fijó la ventana al rango completo [t0, tN] = [0, 10].
    const view = useViewStore.getState();
    expect(view.fullWindow).toEqual({ fromTime: 0, toTime: 10 });
    expect(view.visibleWindow).toEqual({ fromTime: 0, toTime: 10 });

    // La curva se trazó: moveTo + lineTo sobre el ctx del lienzo base.
    const ctx = lastBaseCtx();
    expect(ctx.moveTo).toHaveBeenCalled();
    expect(ctx.lineTo).toHaveBeenCalled();

    // Los ejes reflejan las unidades: hay una etiqueta con 's' y otra con 'mV'.
    const texts = vi.mocked(ctx.fillText).mock.calls.map((c) => String(c[0]));
    expect(texts.some((t) => t.includes('s'))).toBe(true);
    expect(texts.some((t) => t.includes('mV'))).toBe(true);
  });
});

describe('ECGChart — AC-02 (estado vacío sin señal)', () => {
  it('sin señal muestra el estado vacío y no dibuja la curva', () => {
    render(<ECGChart />);

    expect(screen.getByText(/Cargá una señal/i)).toBeInTheDocument();
    expect(drawChart).not.toHaveBeenCalled();
    expect(screen.queryByTestId('ecg-chart')).toBeNull();
  });
});

describe('ECGChart — AC-04 (arrastre con Zoom acerca la vista + cursor lupa)', () => {
  it('con activeTool=zoom, un arrastre horizontal llama setZoomWindow con un rango válido', () => {
    loadSignal();
    useViewStore.setState({ activeTool: 'zoom' });
    const setZoomSpy = vi.spyOn(useViewStore.getState(), 'setZoomWindow');

    render(<ECGChart />);
    const container = getContainer();

    // El contenedor expone el cursor de lupa mientras el Zoom está activo.
    expect(container.className).toContain('cursor-zoom-in');

    fireEvent.mouseDown(container, { clientX: 100 });
    fireEvent.mouseMove(container, { clientX: 250 });
    fireEvent.mouseUp(container, { clientX: 400 });

    expect(setZoomSpy).toHaveBeenCalledTimes(1);
    const win = setZoomSpy.mock.calls[0][0];
    expect(win.fromTime).toBeLessThan(win.toTime);

    // La vista efectivamente se acercó (sub-rango dentro de [0, 10]).
    const visible = useViewStore.getState().visibleWindow;
    expect(visible).not.toBeNull();
    expect(visible!.fromTime).toBeGreaterThanOrEqual(0);
    expect(visible!.toTime).toBeLessThanOrEqual(10);
    expect(visible!.toTime - visible!.fromTime).toBeLessThan(10);
  });
});

describe('ECGChart — AC-05 (clic sin desplazamiento no modifica la vista)', () => {
  it('mousedown y mouseup en el mismo x no llama setZoomWindow ni cambia la ventana', () => {
    loadSignal();
    useViewStore.setState({ activeTool: 'zoom' });
    const setZoomSpy = vi.spyOn(useViewStore.getState(), 'setZoomWindow');

    render(<ECGChart />);
    const container = getContainer();

    fireEvent.mouseDown(container, { clientX: 200 });
    fireEvent.mouseUp(container, { clientX: 200 });

    expect(setZoomSpy).not.toHaveBeenCalled();
    expect(useViewStore.getState().visibleWindow).toEqual({ fromTime: 0, toTime: 10 });
  });
});

describe('ECGChart — AC-07 (rejilla se dibuja solo si gridVisible)', () => {
  it('con gridVisible=true traza más líneas que con gridVisible=false', () => {
    loadSignal();
    render(<ECGChart />); // gridVisible por defecto true

    const withGridArgs = vi.mocked(drawChart).mock.calls.at(-1);
    expect(withGridArgs?.[1].gridVisible).toBe(true);
    const withGridMoveTo = vi.mocked(lastBaseCtx().moveTo).mock.calls.length;

    act(() => {
      useViewStore.setState({ gridVisible: false });
    });

    const withoutGridArgs = vi.mocked(drawChart).mock.calls.at(-1);
    expect(withoutGridArgs?.[1].gridVisible).toBe(false);
    const withoutGridMoveTo = vi.mocked(lastBaseCtx().moveTo).mock.calls.length;

    expect(withGridMoveTo).toBeGreaterThan(withoutGridMoveTo);
  });
});

describe('ECGChart — RNF-02 (un mousemove no repinta el lienzo base)', () => {
  it('durante el arrastre solo redibuja el overlay (drawSelection), no drawChart', () => {
    loadSignal();
    useViewStore.setState({ activeTool: 'zoom' });

    render(<ECGChart />);
    const container = getContainer();

    const baseRepaintsBefore = vi.mocked(drawChart).mock.calls.length;

    fireEvent.mouseDown(container, { clientX: 100 });
    fireEvent.mouseMove(container, { clientX: 250 });

    expect(vi.mocked(drawChart).mock.calls.length).toBe(baseRepaintsBefore);
    expect(drawSelection).toHaveBeenCalled();
  });
});

describe('ECGChart — no-2d-context (getContext null no lanza)', () => {
  it('si getContext devuelve null el componente no lanza y no dibuja', () => {
    loadSignal();
    // `mockReturnValueOnce` (no `mockReturnValue`): el stub de `getContext` en
    // `test/setup.ts` ya es un `vi.fn()`; espiarlo con un retorno permanente y
    // depender de `vi.restoreAllMocks()` en el `afterEach` deja el spy devolviendo
    // `null` para el resto de los tests del archivo (el "original" que se restaura
    // es el propio spy, no el stub de setup). Limitarlo a una sola llamada alcanza
    // para este test (una única lectura de contexto en el render del lienzo base) y
    // no filtra estado hacia los tests siguientes.
    vi.spyOn(HTMLCanvasElement.prototype, 'getContext').mockReturnValueOnce(null);

    expect(() => render(<ECGChart />)).not.toThrow();
    expect(drawChart).not.toHaveBeenCalled();
  });
});

describe('ECGChart — clearOverlay al soltar', () => {
  it('limpia el overlay en mouseup', () => {
    loadSignal();
    useViewStore.setState({ activeTool: 'zoom' });

    render(<ECGChart />);
    const container = getContainer();

    fireEvent.mouseDown(container, { clientX: 100 });
    fireEvent.mouseUp(container, { clientX: 400 });

    expect(clearOverlay).toHaveBeenCalled();
  });
});

describe('ECGChart — guarda de inicialización de vista (muestras insuficientes o rango degenerado)', () => {
  it('con una sola muestra no llama a initForSignal (samples.length < 2)', () => {
    loadSignal([{ t: 0, mV: 0 }]);
    const initSpy = vi.spyOn(useViewStore.getState(), 'initForSignal');

    render(<ECGChart />);

    expect(initSpy).not.toHaveBeenCalled();
    expect(useViewStore.getState().visibleWindow).toBeNull();
  });

  it('con t0 >= tN (rango degenerado) no llama a initForSignal', () => {
    loadSignal([
      { t: 5, mV: 0 },
      { t: 5, mV: 1 },
    ]);
    const initSpy = vi.spyOn(useViewStore.getState(), 'initForSignal');

    render(<ECGChart />);

    expect(initSpy).not.toHaveBeenCalled();
    expect(useViewStore.getState().visibleWindow).toBeNull();
  });
});

describe('ECGChart — FEAT-003a Block 5 (herramienta "Marcar")', () => {
  it('AC-02: clic simple con Marcar activo abre el formulario de creación en markersStore con el tiempo correcto', () => {
    loadSignal(); // ventana [0, 10]
    useViewStore.setState({ activeTool: 'mark' });

    render(<ECGChart />);
    const container = getContainer();

    fireEvent.mouseDown(container, { clientX: 424 }); // left=48, drawWidth=800-48-16=736 → t≈5
    fireEvent.mouseUp(container, { clientX: 424 });

    // 424 px → t = (424 - 48) / 736 * 10 ≈ 5.11s. `MarkerForm` ya no se monta dentro de
    // `ECGChart` (FEAT-003b Block 3): la apertura se verifica contra `formState` del store.
    const formState = useMarkersStore.getState().formState;
    expect(formState).not.toBeNull();
    expect(formState?.mode).toBe('create');
    expect(formState?.mode === 'create' && formState.time).toBeCloseTo(5.108695652173913);
  });

  it('un arrastre (delta >= MIN_DRAG_PX) con Marcar activo NO abre el formulario', () => {
    loadSignal();
    useViewStore.setState({ activeTool: 'mark' });

    render(<ECGChart />);
    const container = getContainer();

    fireEvent.mouseDown(container, { clientX: 100 });
    fireEvent.mouseMove(container, { clientX: 250 });
    fireEvent.mouseUp(container, { clientX: 250 });

    expect(screen.queryByRole('dialog')).toBeNull();
  });

  it('un arrastre con Marcar activo NO dibuja el rectángulo de selección de zoom durante mousemove', () => {
    loadSignal();
    useViewStore.setState({ activeTool: 'mark' });

    render(<ECGChart />);
    const container = getContainer();

    fireEvent.mouseDown(container, { clientX: 100 });
    fireEvent.mouseMove(container, { clientX: 250 });

    expect(drawSelection).not.toHaveBeenCalled();
  });

  it('AC-03: agregar un marcador (confirmar, flujo cubierto por MarkerForm.test.tsx) redibuja el lienzo incluyéndolo', () => {
    loadSignal();
    useViewStore.setState({ activeTool: 'mark' });

    render(<ECGChart />);
    const container = getContainer();

    fireEvent.mouseDown(container, { clientX: 424 });
    fireEvent.mouseUp(container, { clientX: 424 });

    const formState = useMarkersStore.getState().formState;
    expect(formState?.mode).toBe('create');

    // `MarkerForm` (montado en `App.tsx`, Block 5) es quien confirma con
    // `addMarker`/`closeForm`; acá simulamos ese efecto para verificar que `ECGChart`
    // redibuja el lienzo base al cambiar `markers` (regresión de FEAT-003a, Block 5).
    act(() => {
      useMarkersStore.getState().addMarker(5.1, 'Extrasístole');
      useMarkersStore.getState().closeForm();
    });

    const markers = useMarkersStore.getState().markers;
    expect(markers).toHaveLength(1);
    expect(markers[0].label).toBe('Extrasístole');
    expect(useMarkersStore.getState().formState).toBeNull();

    const lastCall = vi.mocked(drawChart).mock.calls.at(-1);
    expect(lastCall?.[1].markers).toEqual(markers);
  });

  it('clic con Marcar activo y visibleWindow nulo (señal insuficiente) no abre el formulario', () => {
    // Una sola muestra: la guarda de inicialización de vista no llama a initForSignal,
    // por lo que visibleWindow queda en null aunque haya señal cargada (ver describe de
    // "guarda de inicialización de vista" más arriba).
    loadSignal([{ t: 0, mV: 0 }]);
    useViewStore.setState({ activeTool: 'mark' });

    render(<ECGChart />);
    const container = getContainer();

    fireEvent.mouseDown(container, { clientX: 424 });
    fireEvent.mouseUp(container, { clientX: 424 });

    expect(screen.queryByRole('dialog')).toBeNull();
  });
});

