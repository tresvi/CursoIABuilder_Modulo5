import { describe, it, expect, beforeEach } from 'vitest';
import { render, screen } from '@testing-library/react';
import { TopBar } from './TopBar';
import { useSignalStore } from '@/state/signalStore';

/** CSV de 20 s exactos (primera muestra en t=0, última en t=20). */
const CSV_20S = 'tiempo,mV\n0,0\n10,0.5\n20,-0.1';

/**
 * Tests del encabezado del panel principal (FEAT-009, Block 2). El store se
 * resetea antes de cada test (patrón de MetricsPanel.test/ChartToolbar.test).
 */
describe('TopBar', () => {
  beforeEach(() => {
    useSignalStore.getState().reset();
  });

  it('AC-10: con señal cargada muestra el nombre del archivo y la duración', () => {
    useSignalStore.getState().loadFromText(CSV_20S, 'ECG_20_Seg_FILTRADO.csv');

    render(<TopBar />);

    // El título del encabezado es h2: el h1 de la app vive en el Sidebar.
    expect(screen.getByRole('heading', { level: 2, name: 'Trazado ECG' })).toBeInTheDocument();
    expect(screen.getByLabelText('Archivo cargado')).toHaveTextContent(
      'ECG_20_Seg_FILTRADO.csv',
    );
    expect(screen.getByLabelText('Duración de la señal')).toHaveTextContent('20.0 s');
    expect(screen.getByLabelText('Resumen de la señal')).toHaveTextContent(
      'ECG_20_Seg_FILTRADO.csv · 20.0 s',
    );
  });

  it('AC-10: sin señal cargada muestra "sin archivo"', () => {
    const { unmount } = render(<TopBar />);

    expect(screen.getByLabelText('Archivo cargado')).toHaveTextContent('sin archivo');
    expect(screen.getByLabelText('Duración de la señal')).toHaveTextContent('—');

    unmount();

    // Sad path "sin nombre": hay señal cargada, pero `loadFromText` se invocó sin
    // el parámetro opcional `fileName`, así que el encabezado cae al texto de respaldo.
    useSignalStore.getState().loadFromText(CSV_20S);
    expect(useSignalStore.getState().signal).not.toBeNull();

    render(<TopBar />);

    expect(screen.getByLabelText('Archivo cargado')).toHaveTextContent('sin archivo');
    // La duración sí se muestra: la señal está presente, lo que falta es el nombre.
    expect(screen.getByLabelText('Duración de la señal')).toHaveTextContent('20.0 s');
  });

  it('con una señal de menos de 2 muestras muestra "—" como duración', () => {
    // Una sola fila de datos: señal válida para el parser, duración indefinida.
    useSignalStore.getState().loadFromText('tiempo,mV\n0,-0.085', 'una-muestra.csv');
    expect(useSignalStore.getState().signal?.samples).toHaveLength(1);

    render(<TopBar />);

    expect(screen.getByLabelText('Archivo cargado')).toHaveTextContent('una-muestra.csv');
    expect(screen.getByLabelText('Duración de la señal')).toHaveTextContent('—');
  });

  it('tras un error de carga vuelve a "sin archivo"', () => {
    useSignalStore.getState().loadFromText(CSV_20S, 'ECG_20_Seg_FILTRADO.csv');
    useSignalStore.getState().setError('read-error');

    render(<TopBar />);

    expect(screen.getByLabelText('Archivo cargado')).toHaveTextContent('sin archivo');
    expect(screen.getByLabelText('Duración de la señal')).toHaveTextContent('—');
  });
});
