import { describe, it, expect, beforeEach } from 'vitest';
import { render, screen } from '@testing-library/react';
import App from './App';
import { useMarkersStore } from '@/state/markersStore';

describe('App — smoke de montaje', () => {
  beforeEach(() => {
    useMarkersStore.setState({ markers: [], formState: null });
  });

  it('renderiza el heading y monta CsvUpload + ChartToolbar + ECGChart sin errores', () => {
    render(<App />);

    // Heading principal de la aplicación (RF-01).
    expect(
      screen.getByRole('heading', { name: /ECGViewer/i }),
    ).toBeInTheDocument();

    // CsvUpload está montado: su input de carga con aria-label está presente.
    expect(
      screen.getByLabelText('Cargar archivo CSV de ECG'),
    ).toBeInTheDocument();

    // ChartToolbar está montada: sus tres controles nativos con aria-label están presentes.
    expect(
      screen.getByLabelText('Activar herramienta de zoom'),
    ).toBeInTheDocument();
    expect(screen.getByLabelText('Restablecer zoom')).toBeInTheDocument();
    expect(
      screen.getByLabelText('Mostrar u ocultar rejilla'),
    ).toBeInTheDocument();

    // ECGChart está montado: sin señal cargada, muestra el estado vacío (AC-02).
    expect(
      screen.getByText('Cargá una señal para visualizarla.'),
    ).toBeInTheDocument();
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
