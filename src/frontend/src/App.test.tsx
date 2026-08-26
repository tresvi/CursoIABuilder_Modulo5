import { describe, it, expect, beforeEach } from 'vitest';
import { render, screen, within } from '@testing-library/react';
import App from './App';
import { useMarkersStore } from '@/state/markersStore';

describe('App — smoke de montaje', () => {
  beforeEach(() => {
    useMarkersStore.setState({ markers: [], formState: null });
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
