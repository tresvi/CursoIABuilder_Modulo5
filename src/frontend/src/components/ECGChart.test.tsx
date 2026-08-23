import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { render, screen, fireEvent, act } from '@testing-library/react';
import { ECGChart, DIMS } from './ECGChart';
import { xToTime, yToMv, computeYRange } from '@/lib/ecg/chart/scale';
import { drawChart } from './render/drawChart';
import { drawSelection, drawRuler, clearOverlay } from './render/drawOverlay';
import { useSignalStore } from '@/state/signalStore';
import { useViewStore } from '@/state/viewStore';
import { useMarkersStore } from '@/state/markersStore';
import type { ECGSample } from '@/lib/ecg/types';
import { formatMarkerTime } from '@/lib/ecg/chart/format';

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
    drawRuler: vi.fn(actual.drawRuler),
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

describe('ECGChart — FEAT-004 Block 4 (herramienta "Regla")', () => {
  it('AC-02: arrastrar con Regla activa dibuja drawRuler en cada mousemove con Δt/Δamplitud correctos', () => {
    loadSignal(); // ventana [0, 10], yRange [-1, 1]
    useViewStore.setState({ activeTool: 'ruler' });

    render(<ECGChart />);
    const container = getContainer();

    fireEvent.mouseDown(container, { clientX: 100, clientY: 50 });
    fireEvent.mouseMove(container, { clientX: 250, clientY: 150 });

    const visibleWindow = useViewStore.getState().visibleWindow!;
    const yRange = computeYRange(SAMPLES);
    const expectedDeltaT = xToTime(250, visibleWindow, DIMS) - xToTime(100, visibleWindow, DIMS);
    const expectedDeltaAmplitude = yToMv(150, yRange, DIMS) - yToMv(50, yRange, DIMS);

    expect(drawRuler).toHaveBeenCalledWith(
      expect.anything(),
      100,
      50,
      250,
      150,
      DIMS,
      expectedDeltaT,
      expectedDeltaAmplitude,
    );
  });

  it('AC-03: soltar el mouse tras un arrastre válido con Regla activa NO llama a clearOverlay', () => {
    loadSignal();
    useViewStore.setState({ activeTool: 'ruler' });

    render(<ECGChart />);
    const container = getContainer();

    fireEvent.mouseDown(container, { clientX: 100, clientY: 50 });
    fireEvent.mouseMove(container, { clientX: 250, clientY: 150 });
    vi.mocked(clearOverlay).mockClear();
    fireEvent.mouseUp(container, { clientX: 250, clientY: 150 });

    expect(clearOverlay).not.toHaveBeenCalled();
  });

  it('AC-04: un segundo arrastre con Regla activa limpia el overlay en el onMouseDown correspondiente', () => {
    loadSignal();
    useViewStore.setState({ activeTool: 'ruler' });

    render(<ECGChart />);
    const container = getContainer();

    // Primer arrastre, queda visible.
    fireEvent.mouseDown(container, { clientX: 100, clientY: 50 });
    fireEvent.mouseMove(container, { clientX: 250, clientY: 150 });
    fireEvent.mouseUp(container, { clientX: 250, clientY: 150 });

    vi.mocked(clearOverlay).mockClear();
    vi.mocked(drawRuler).mockClear();

    // Segundo arrastre: onMouseDown debe limpiar el overlay antes de dibujar de nuevo.
    fireEvent.mouseDown(container, { clientX: 120, clientY: 60 });
    expect(clearOverlay).toHaveBeenCalled();

    fireEvent.mouseMove(container, { clientX: 300, clientY: 200 });
    expect(drawRuler).toHaveBeenCalledWith(
      expect.anything(),
      120,
      60,
      300,
      200,
      DIMS,
      expect.any(Number),
      expect.any(Number),
    );
  });

  it('AC-05: cambiar activeTool fuera de "ruler" limpia el overlay vía useEffect, sin interacción de mouse', () => {
    loadSignal();
    useViewStore.setState({ activeTool: 'ruler' });

    render(<ECGChart />);
    vi.mocked(clearOverlay).mockClear();

    act(() => {
      useViewStore.setState({ activeTool: 'none' });
    });

    expect(clearOverlay).toHaveBeenCalled();
  });

  it('AC-06: un arrastre menor a MIN_DRAG_PX con Regla activa limpia el overlay en mouseup (no deja medición)', () => {
    loadSignal();
    useViewStore.setState({ activeTool: 'ruler' });

    render(<ECGChart />);
    const container = getContainer();

    fireEvent.mouseDown(container, { clientX: 100, clientY: 50 });
    vi.mocked(clearOverlay).mockClear();
    fireEvent.mouseUp(container, { clientX: 101, clientY: 51 }); // desplazamiento < MIN_DRAG_PX

    expect(clearOverlay).toHaveBeenCalled();
  });

  it('AC-06: un arrastre puramente horizontal (deltaX grande, deltaY≈0) con Regla activa NO limpia el overlay — es una medición válida de Δt', () => {
    loadSignal();
    useViewStore.setState({ activeTool: 'ruler' });

    render(<ECGChart />);
    const container = getContainer();

    fireEvent.mouseDown(container, { clientX: 100, clientY: 50 });
    fireEvent.mouseMove(container, { clientX: 250, clientY: 50 });
    vi.mocked(clearOverlay).mockClear();
    fireEvent.mouseUp(container, { clientX: 250, clientY: 50 }); // deltaX=150 (>=MIN_DRAG_PX), deltaY=0

    expect(clearOverlay).not.toHaveBeenCalled();
  });

  it('Regresión: un arrastre con Marcar activo sigue sin dibujar drawSelection ni drawRuler en mousemove', () => {
    loadSignal();
    useViewStore.setState({ activeTool: 'mark' });

    render(<ECGChart />);
    const container = getContainer();

    fireEvent.mouseDown(container, { clientX: 100, clientY: 50 });
    fireEvent.mouseMove(container, { clientX: 250, clientY: 150 });

    expect(drawSelection).not.toHaveBeenCalled();
    expect(drawRuler).not.toHaveBeenCalled();
  });

  it('sin señal cargada (visibleWindow/signal nulos) un arrastre con Regla activa no dibuja ni deja medición', () => {
    // Una sola muestra: visibleWindow queda null (guarda de inicialización de vista).
    loadSignal([{ t: 0, mV: 0 }]);
    useViewStore.setState({ activeTool: 'ruler' });

    render(<ECGChart />);
    const container = getContainer();

    fireEvent.mouseDown(container, { clientX: 100, clientY: 50 });
    fireEvent.mouseMove(container, { clientX: 250, clientY: 150 });
    fireEvent.mouseUp(container, { clientX: 250, clientY: 150 });

    expect(drawRuler).not.toHaveBeenCalled();
  });
});

describe('ECGChart — FEAT-005 Block 5 (herramienta "Recorte")', () => {
  it('AC-02: con Recorte activo, arrastrar dibuja el rectángulo de selección (mismo mecanismo que Zoom)', () => {
    loadSignal();
    useViewStore.setState({ activeTool: 'crop' });

    render(<ECGChart />);
    const container = getContainer();

    fireEvent.mouseDown(container, { clientX: 100 });
    fireEvent.mouseMove(container, { clientX: 250 });

    expect(drawSelection).toHaveBeenCalled();
  });

  it('AC-03: soltar el mouse tras un arrastre suficiente con Recorte activo abre el ConfirmDialog con el rango correcto', () => {
    loadSignal(); // ventana [0, 10]
    useViewStore.setState({ activeTool: 'crop' });

    render(<ECGChart />);
    const container = getContainer();

    fireEvent.mouseDown(container, { clientX: 100 });
    fireEvent.mouseMove(container, { clientX: 250 });
    fireEvent.mouseUp(container, { clientX: 250 });

    const dialog = screen.getByRole('dialog');
    expect(dialog).toBeInTheDocument();

    const visibleWindow = useViewStore.getState().visibleWindow!;
    const expectedFrom = xToTime(100, visibleWindow, DIMS);
    const expectedTo = xToTime(250, visibleWindow, DIMS);

    expect(screen.getByText(/Confirmar recorte/i)).toBeInTheDocument();
    // Verificamos el texto interpolado exacto vía formatMarkerTime.
    expect(
      screen.getByText(
        new RegExp(
          `${formatMarkerTime(expectedFrom).replace('.', '\\.')}.*${formatMarkerTime(expectedTo).replace('.', '\\.')}`,
        ),
      ),
    ).toBeInTheDocument();
  });

  it('AC-04: un clic sin arrastre (< MIN_DRAG_PX) con Recorte activo no abre el diálogo ni altera signal', () => {
    loadSignal();
    useViewStore.setState({ activeTool: 'crop' });
    const originalSignal = useSignalStore.getState().signal;

    render(<ECGChart />);
    const container = getContainer();

    fireEvent.mouseDown(container, { clientX: 200 });
    fireEvent.mouseUp(container, { clientX: 200 });

    expect(screen.queryByRole('dialog')).toBeNull();
    expect(useSignalStore.getState().signal).toBe(originalSignal);
  });

  it('AC-04: un clic sin arrastre con Recorte activo limpia el overlay (no deja un rectángulo de selección "pegado")', () => {
    loadSignal();
    useViewStore.setState({ activeTool: 'crop' });

    render(<ECGChart />);
    const container = getContainer();

    fireEvent.mouseDown(container, { clientX: 200 });
    vi.mocked(clearOverlay).mockClear();
    fireEvent.mouseUp(container, { clientX: 200 }); // desplazamiento < MIN_DRAG_PX

    expect(clearOverlay).toHaveBeenCalled();
  });

  it('AC-05: confirmar el diálogo reemplaza signal en useSignalStore, llama removeMarkersOutside en useMarkersStore, y cierra el diálogo', () => {
    loadSignal(); // ventana [0, 10]
    useViewStore.setState({ activeTool: 'crop' });
    useMarkersStore.getState().addMarker(1, 'dentro');
    useMarkersStore.getState().addMarker(9, 'fuera');

    const removeSpy = vi.spyOn(useMarkersStore.getState(), 'removeMarkersOutside');

    render(<ECGChart />);
    const container = getContainer();

    // Arrastre [100, 600] → rango temporal ~[0.7, 7.5]s, deja 3 de las 6 muestras
    // (t=2,4,6) dentro — suficiente para que cropSignal no devuelva null.
    fireEvent.mouseDown(container, { clientX: 100 });
    fireEvent.mouseMove(container, { clientX: 600 });
    fireEvent.mouseUp(container, { clientX: 600 });

    const dialog = screen.getByRole('dialog');
    expect(dialog).toBeInTheDocument();

    const confirmButton = screen.getByRole('button', { name: 'Confirmar' });
    fireEvent.click(confirmButton);

    expect(useSignalStore.getState().signal).not.toBe(SAMPLES);
    expect(useSignalStore.getState().signal!.samples.length).toBeLessThan(SAMPLES.length);
    expect(removeSpy).toHaveBeenCalledTimes(1);
    expect(screen.queryByRole('dialog')).toBeNull();
  });

  it('AC-06: cancelar el diálogo deja signal sin cambios y cierra el diálogo', () => {
    loadSignal();
    useViewStore.setState({ activeTool: 'crop' });
    const originalSignal = useSignalStore.getState().signal;

    render(<ECGChart />);
    const container = getContainer();

    fireEvent.mouseDown(container, { clientX: 100 });
    fireEvent.mouseMove(container, { clientX: 250 });
    fireEvent.mouseUp(container, { clientX: 250 });

    expect(screen.getByRole('dialog')).toBeInTheDocument();

    const cancelButton = screen.getByRole('button', { name: 'Cancelar' });
    fireEvent.click(cancelButton);

    expect(useSignalStore.getState().signal).toBe(originalSignal);
    expect(screen.queryByRole('dialog')).toBeNull();
  });

  it('AC-07: tras confirmar el recorte, visibleWindow/fullWindow en useViewStore reflejan la extensión completa de la señal acotada', () => {
    loadSignal(); // ventana [0, 10], muestras en t=0,2,4,6,8,10
    useViewStore.setState({ activeTool: 'crop' });

    render(<ECGChart />);
    const container = getContainer();

    // Arrastre que recorta aproximadamente al rango [2, 8] (dejando fuera t=0 y t=10).
    fireEvent.mouseDown(container, { clientX: 200 });
    fireEvent.mouseMove(container, { clientX: 600 });
    fireEvent.mouseUp(container, { clientX: 600 });

    const confirmButton = screen.getByRole('button', { name: 'Confirmar' });
    fireEvent.click(confirmButton);

    const croppedSignal = useSignalStore.getState().signal!;
    const t0 = croppedSignal.samples[0].t;
    const tN = croppedSignal.samples[croppedSignal.samples.length - 1].t;

    expect(useViewStore.getState().fullWindow).toEqual({ fromTime: t0, toTime: tN });
    expect(useViewStore.getState().visibleWindow).toEqual({ fromTime: t0, toTime: tN });
  });
});
