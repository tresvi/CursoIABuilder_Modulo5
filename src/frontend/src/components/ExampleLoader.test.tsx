import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { ExampleLoader } from './ExampleLoader';
import { EXAMPLE_SAMPLES } from '@/lib/ecg/samples';
import { parseCsv } from '@/lib/ecg/parseCsv';
import { useSignalStore } from '@/state/signalStore';

/** CSV válido de un canal, con el mismo contrato que acepta "Abrir CSV". */
const VALID_CSV = 'tiempo,mV\n0,-0.085\n0.002,-0.05\n0.004,0.12';

/** CSV multicanal: lo rechaza `parseCsv` (mismo camino que "Abrir CSV"). */
const MULTICHANNEL_CSV = 'tiempo,mV1,mV2\n0,-0.085,0.1\n0.002,-0.05,0.2';

function okResponse(text: string) {
  return { ok: true, status: 200, text: () => Promise.resolve(text) } as unknown as Response;
}

function selectEl(): HTMLSelectElement {
  return screen.getByLabelText('Cargar ejemplo') as HTMLSelectElement;
}

beforeEach(() => {
  useSignalStore.getState().reset();
});

afterEach(() => {
  vi.unstubAllGlobals();
});

describe('ExampleLoader — carga de señales de ejemplo (FEAT-009, Block 5)', () => {
  it('al elegir un ejemplo, lo carga y grafica por el mismo flujo que "Abrir CSV" (AC-07)', async () => {
    // Fetch diferido: permite aserir el estado "cargando" antes de resolver.
    let resolveFetch: (res: Response) => void = () => {};
    const requestedUrls: string[] = [];
    const fetchMock = vi.fn((input: RequestInfo | URL) => {
      requestedUrls.push(String(input));
      return new Promise<Response>((resolve) => {
        resolveFetch = resolve;
      });
    });
    vi.stubGlobal('fetch', fetchMock);

    render(<ExampleLoader showError />);
    const sample = EXAMPLE_SAMPLES[0];
    fireEvent.change(selectEl(), { target: { value: sample.id } });

    // Ruta literal del catálogo, nunca construida con la entrada del usuario (R-07).
    expect(fetchMock).toHaveBeenCalledTimes(1);
    expect(requestedUrls).toEqual([sample.path]);
    // Mientras carga, el control queda deshabilitado.
    await waitFor(() => expect(selectEl()).toBeDisabled());

    resolveFetch(okResponse(VALID_CSV));

    await waitFor(() => expect(useSignalStore.getState().status).toBe('loaded'));

    const parsed = parseCsv(VALID_CSV);
    expect(parsed.ok).toBe(true);
    const state = useSignalStore.getState();
    // Misma señal que produce el flujo de "Abrir CSV" para el mismo texto.
    expect(state.signal?.samples).toEqual(parsed.ok ? parsed.signal.samples : null);
    expect(state.fileName).toBe('ECG_20_Seg_FILTRADO.csv');
    expect(state.error).toBeNull();

    // Tras cargar, el select vuelve al placeholder y se rehabilita.
    await waitFor(() => expect(selectEl()).toBeEnabled());
    expect(selectEl().value).toBe('');
  });

  it('ofrece exactamente las 3 señales del catálogo (AC-07)', () => {
    vi.stubGlobal('fetch', vi.fn());
    render(<ExampleLoader showError />);

    const options = Array.from(selectEl().options);
    // Placeholder + las 3 del catálogo, en el orden del catálogo.
    expect(options.filter((o) => o.value !== '')).toHaveLength(3);
    expect(options.filter((o) => o.value !== '').map((o) => o.value)).toEqual(
      EXAMPLE_SAMPLES.map((s) => s.id),
    );
    expect(EXAMPLE_SAMPLES.map((s) => s.id)).toEqual([
      'ECG_20_Seg_FILTRADO',
      'ECG_20_Seg_NO_FILTRADO',
      'ECG_20_Seg_ESPANTOSO',
    ]);
    for (const sample of EXAMPLE_SAMPLES) {
      expect(screen.getByRole('option', { name: sample.label })).toBeInTheDocument();
    }
  });

  it('si el fetch falla, muestra el mensaje de error y no deja señal cargada (AC-09)', async () => {
    // (a) El servidor responde 404: `res.ok === false`.
    vi.stubGlobal('fetch', vi.fn().mockResolvedValue({ ok: false, status: 404 } as Response));
    const { unmount } = render(<ExampleLoader showError />);
    fireEvent.change(selectEl(), { target: { value: EXAMPLE_SAMPLES[0].id } });

    const alert = await screen.findByRole('alert');
    expect(alert).toHaveTextContent('No se pudo leer el archivo. Intente nuevamente.');
    expect(useSignalStore.getState().signal).toBeNull();
    expect(useSignalStore.getState().status).toBe('error');
    expect(useSignalStore.getState().error).toBe('read-error');

    unmount();
    useSignalStore.getState().reset();

    // (b) La promesa de fetch rechaza (fallo de red): mismo tratamiento.
    vi.stubGlobal('fetch', vi.fn().mockRejectedValue(new Error('network error')));
    render(<ExampleLoader showError />);
    fireEvent.change(selectEl(), { target: { value: EXAMPLE_SAMPLES[1].id } });

    expect(await screen.findByRole('alert')).toHaveTextContent(
      'No se pudo leer el archivo. Intente nuevamente.',
    );
    expect(useSignalStore.getState().signal).toBeNull();
    expect(useSignalStore.getState().error).toBe('read-error');
  });

  it('el alert desaparece en cuanto el store sale del estado de error (sin mensaje obsoleto)', async () => {
    vi.stubGlobal('fetch', vi.fn().mockResolvedValue({ ok: false, status: 404 } as Response));
    render(<ExampleLoader showError />);
    fireEvent.change(selectEl(), { target: { value: EXAMPLE_SAMPLES[0].id } });

    expect(await screen.findByRole('alert')).toHaveTextContent(
      'No se pudo leer el archivo. Intente nuevamente.',
    );

    // Una carga exitosa posterior (p. ej. "Abrir CSV") deja el store en `loaded`: el
    // mensaje del intento fallido no puede sobrevivir al lado de una señal cargada.
    useSignalStore.getState().loadFromText(VALID_CSV, 'ecg.csv');

    await waitFor(() => expect(screen.queryByRole('alert')).toBeNull());
    expect(useSignalStore.getState().status).toBe('loaded');
  });

  it('con showError={false} no renderiza su propia alerta aunque el store quede en error', async () => {
    vi.stubGlobal('fetch', vi.fn().mockResolvedValue({ ok: false, status: 404 } as Response));
    render(<ExampleLoader showError={false} />);
    fireEvent.change(selectEl(), { target: { value: EXAMPLE_SAMPLES[0].id } });

    // El error igual se registra: el mensaje lo muestra el dueño del contexto
    // (`CsvUpload` dentro de la sección "Archivo"), no este componente.
    await waitFor(() => expect(useSignalStore.getState().error).toBe('read-error'));
    expect(screen.queryByRole('alert')).toBeNull();
  });

  it('si el contenido descargado es inválido, propaga el error del parser sin dejar señal (R-08)', async () => {
    vi.stubGlobal('fetch', vi.fn().mockResolvedValue(okResponse(MULTICHANNEL_CSV)));
    render(<ExampleLoader showError />);

    fireEvent.change(selectEl(), { target: { value: EXAMPLE_SAMPLES[2].id } });

    await waitFor(() => expect(useSignalStore.getState().status).toBe('error'));
    const state = useSignalStore.getState();
    // El texto descargado pasa por el mismo `parseCsv` que "Abrir CSV": el error es
    // el del parser, no un genérico de red, y no queda señal parcial.
    expect(state.error).toEqual({ kind: 'multichannel', channels: 3 });
    expect(state.signal).toBeNull();
    expect(state.fileName).toBeNull();
    expect(await screen.findByRole('alert')).toHaveTextContent(
      'El archivo tiene más de un canal; solo se soporta un canal.',
    );
  });
  it('no muestra el error de otro control: sólo el que originó su propio intento', async () => {
    vi.stubGlobal('fetch', vi.fn().mockResolvedValue({ ok: false, status: 404 } as Response));
    render(<ExampleLoader showError />);
    fireEvent.change(selectEl(), { target: { value: EXAMPLE_SAMPLES[0].id } });

    // (a) El fallo propio sí se anuncia.
    expect(await screen.findByRole('alert')).toHaveTextContent(
      'No se pudo leer el archivo. Intente nuevamente.',
    );

    // (b) Sin volver a tocar el `<select>`, otro control ("Abrir CSV") mete en el store
    //     un error distinto: la transición es `error` -> `error`, así que no alcanza con
    //     mirar si el store salió de `error`.
    useSignalStore.getState().loadFromText(MULTICHANNEL_CSV, 'otro.csv');
    await waitFor(() =>
      expect(useSignalStore.getState().error).toEqual({ kind: 'multichannel', channels: 3 }),
    );

    // El loader no originó ese error: no puede adueñarse de su mensaje.
    expect(screen.queryByText('El archivo tiene más de un canal; solo se soporta un canal.')).toBeNull();
    expect(screen.queryByRole('alert')).toBeNull();
  });
});
