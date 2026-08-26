import { describe, it, expect, beforeEach, vi } from 'vitest';
import { act, render, screen, within, fireEvent, waitFor } from '@testing-library/react';
import App from './App';
import { useMarkersStore } from '@/state/markersStore';
import { useSignalStore } from '@/state/signalStore';
import { useViewStore } from '@/state/viewStore';
import { applyFilter as applyFilterApi } from '@/lib/api/filters';
import type { ECGSample } from '@/lib/ecg/types';

/**
 * Mock del cliente HTTP de filtros (mismo patrón que `signalStore.test.ts`): los
 * tests nunca llaman al backend; se espía la función exportada por `filters.ts`.
 */
vi.mock('@/lib/api/filters', async (importOriginal) => {
  const actual = await importOriginal<typeof import('@/lib/api/filters')>();
  return { ...actual, applyFilter: vi.fn() };
});

/**
 * Deja los stores y el mock del cliente de filtros en su estado inicial. Se llama
 * en el `beforeEach` de TODOS los bloques: cada test arranca limpio sin depender
 * del orden de ejecución.
 */
function resetAll(): void {
  useSignalStore.getState().reset();
  useViewStore.getState().reset();
  useMarkersStore.setState({ markers: [], formState: null });
  vi.mocked(applyFilterApi).mockReset();
}

describe('App — smoke de montaje', () => {
  beforeEach(() => {
    resetAll();
  });

  it('renderiza el heading y monta CsvUpload + ChartToolbar + ECGChart sin errores', () => {
    render(<App />);

    // Heading principal de la aplicación (RF-01), ahora en el sidebar del shell (FEAT-009).
    const sidebar = screen.getByRole('complementary', { name: 'Navegación de ECGViewer' });
    expect(within(sidebar).getByRole('heading', { name: /ECGViewer/i })).toBeInTheDocument();

    // CsvUpload está montado: su input de carga con aria-label está presente.
    expect(screen.getByLabelText('Cargar archivo CSV de ECG')).toBeInTheDocument();

    // ChartToolbar está montada: sus tres controles nativos con aria-label están presentes.
    expect(screen.getByLabelText('Activar herramienta de zoom')).toBeInTheDocument();
    expect(screen.getByLabelText('Restablecer zoom')).toBeInTheDocument();
    expect(screen.getByLabelText('Mostrar u ocultar rejilla')).toBeInTheDocument();

    // ECGChart está montado: sin señal cargada, muestra el estado vacío (AC-02).
    expect(screen.getByText('Cargá una señal para visualizarla.')).toBeInTheDocument();
  });

  it('muestra las tres secciones del sidebar ("Archivo", "Herramientas", "Filtros")', () => {
    render(<App />);

    const sidebar = screen.getByRole('complementary', { name: 'Navegación de ECGViewer' });

    const nav = within(sidebar).getByRole('navigation', { name: 'Secciones' });

    expect(within(nav).getByText('Archivo')).toBeInTheDocument();
    expect(within(nav).getByText('Herramientas')).toBeInTheDocument();
    expect(within(nav).getByText('Filtros')).toBeInTheDocument();
  });

  it('monta MarkerForm (Block 5): sin formState abierto, el diálogo no se muestra', () => {
    render(<App />);

    expect(screen.queryByRole('dialog')).not.toBeInTheDocument();
  });

  it('monta MarkerForm (Block 5): con formState abierto en el store, App renderiza el diálogo de MarkerForm', () => {
    useMarkersStore.setState({ formState: { mode: 'create', time: 12 } });

    render(<App />);

    expect(screen.getByRole('dialog')).toBeInTheDocument();
    expect(screen.getByText('Nuevo marcador')).toBeInTheDocument();
  });
});

/** Devuelve el `<details>` de una sección del sidebar por su título. */
function sidebarSection(title: string): HTMLElement {
  const sidebar = screen.getByRole('complementary', { name: 'Navegación de ECGViewer' });
  const summary = within(sidebar).getByText(title);
  const details = summary.closest('details');
  if (!details) throw new Error(`No se encontró la sección "${title}" en el sidebar`);
  return details;
}

/** Muestras uniformes a `fs` Hz (Nyquist predecible), patrón de FilterPanel.test. */
function uniformSamples(count: number, fs: number): ECGSample[] {
  const samples: ECGSample[] = [];
  for (let i = 0; i < count; i++) {
    samples.push({ t: i / fs, mV: 0.1 });
  }
  return samples;
}

function loadSignal(fs = 250, count = 1000): void {
  useSignalStore.setState({
    signal: { samples: uniformSamples(count, fs) },
    previousSignal: null,
    status: 'loaded',
    error: null,
    fileName: 'ECG_test.csv',
  });
}

describe('App — secciones "Herramientas" y "Filtros" del sidebar (FEAT-009, Block 3)', () => {
  beforeEach(() => {
    resetAll();
  });

  it('la sección "Herramientas" contiene Rejilla, Zoom, Restablecer zoom, Regla, Recorte y Marcar (AC-03)', () => {
    render(<App />);

    const tools = within(sidebarSection('Herramientas'));

    expect(tools.getByLabelText('Mostrar u ocultar rejilla')).toBeInTheDocument();
    expect(tools.getByLabelText('Activar herramienta de zoom')).toBeInTheDocument();
    expect(tools.getByLabelText('Restablecer zoom')).toBeInTheDocument();
    expect(tools.getByLabelText('Activar herramienta de regla')).toBeInTheDocument();
    expect(tools.getByLabelText('Activar herramienta de recorte')).toBeInTheDocument();
    expect(tools.getByLabelText('Activar herramienta de marcador')).toBeInTheDocument();
  });

  it('la sección "Filtros" contiene el selector de tipo de filtro y sus controles (AC-04)', () => {
    loadSignal();
    render(<App />);

    const filters = within(sidebarSection('Filtros'));

    expect(filters.getByLabelText('Tipo de filtro')).toBeInTheDocument();
    expect(filters.getByLabelText('Frecuencia de corte (Hz)')).toBeInTheDocument();
    expect(filters.getByLabelText('Aplicar filtro')).toBeInTheDocument();
    expect(filters.getByLabelText('Revertir')).toBeInTheDocument();
  });

  it('activar Zoom desde el sidebar deja activeTool en \'zoom\' igual que antes (AC-11)', () => {
    render(<App />);

    const tools = within(sidebarSection('Herramientas'));
    fireEvent.click(tools.getByLabelText('Activar herramienta de zoom'));

    expect(useViewStore.getState().activeTool).toBe('zoom');
    expect(tools.getByLabelText('Activar herramienta de zoom')).toHaveAttribute(
      'aria-pressed',
      'true',
    );
  });

  it('aplicar un filtro desde el sidebar invoca el mismo flujo de signalStore.applyFilter (AC-12)', async () => {
    loadSignal();
    const originalSignal = useSignalStore.getState().signal;
    const filtered = { samples: uniformSamples(1000, 250) };
    vi.mocked(applyFilterApi).mockResolvedValueOnce({ ok: true, signal: filtered });

    render(<App />);

    const filters = within(sidebarSection('Filtros'));
    fireEvent.change(filters.getByLabelText('Tipo de filtro'), { target: { value: 'HighPass' } });
    fireEvent.click(filters.getByLabelText('Aplicar filtro'));

    await waitFor(() => {
      expect(applyFilterApi).toHaveBeenCalledTimes(1);
    });
    expect(applyFilterApi).toHaveBeenCalledWith(originalSignal, 'HighPass', { cutoff: 1 });
    await waitFor(() => {
      expect(useSignalStore.getState().signal).toBe(filtered);
    });
    expect(useSignalStore.getState().previousSignal).toBe(originalSignal);
  });

  it('sin señal cargada, los controles de filtro del sidebar están deshabilitados', () => {
    render(<App />);

    const filters = within(sidebarSection('Filtros'));

    expect(filters.getByLabelText('Tipo de filtro')).toBeDisabled();
    expect(filters.getByLabelText('Aplicar filtro')).toBeDisabled();
    expect(filters.getByLabelText('Revertir')).toBeDisabled();
  });

  it('con la sección "Herramientas" colapsada, la herramienta activa se mantiene', async () => {
    render(<App />);

    const section = sidebarSection('Herramientas');
    fireEvent.click(within(section).getByLabelText('Activar herramienta de regla'));
    expect(useViewStore.getState().activeTool).toBe('ruler');

    // Colapsa la sección con el toggle nativo de <details>.
    fireEvent.click(within(section).getByText('Herramientas'));
    expect(section).not.toHaveAttribute('open');

    // jsdom despacha el evento `toggle` de <details> en un macrotask
    // (`setTimeout(..., 0)`): hay que drenarlo antes de aserir, o un handler que
    // reseteara la herramienta al colapsar pasaría inadvertido.
    await act(async () => {
      await new Promise((resolve) => setTimeout(resolve, 0));
    });

    // La herramienta sigue activa: no se desactiva en silencio al colapsar.
    await waitFor(() => {
      expect(useViewStore.getState().activeTool).toBe('ruler');
    });
  });
});
