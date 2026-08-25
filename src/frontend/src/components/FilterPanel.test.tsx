import { describe, it, expect, beforeEach, vi } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import { FilterPanel } from './FilterPanel';
import { useSignalStore } from '@/state/signalStore';
import type { ECGSample } from '@/lib/ecg/types';

/** Genera muestras uniformes a `fs` Hz, útil para calcular Nyquist de forma predecible. */
function uniformSamples(count: number, fs: number): ECGSample[] {
  const samples: ECGSample[] = [];
  for (let i = 0; i < count; i++) {
    samples.push({ t: i / fs, mV: 0.1 });
  }
  return samples;
}

/**
 * Tests de FilterPanel (FEAT-007b, Block 7). Se manipula useSignalStore
 * directamente vía setState (patrón de MetricsPanel.test/ChartToolbar.test),
 * en vez de mockear el módulo completo.
 */
describe('FilterPanel', () => {
  beforeEach(() => {
    useSignalStore.getState().reset();
    vi.restoreAllMocks();
  });

  function loadSignal(fs = 250, count = 1000) {
    const samples = uniformSamples(count, fs);
    useSignalStore.setState({ signal: { samples }, previousSignal: null, status: 'loaded', error: null });
  }

  it('AC-01: muestra las 7 opciones del combo de tipo de filtro', () => {
    loadSignal();
    render(<FilterPanel />);

    const select = screen.getByLabelText('Tipo de filtro') as HTMLSelectElement;
    const optionValues = Array.from(select.options).map((o) => o.value);
    expect(optionValues).toEqual([
      'LowPass',
      'HighPass',
      'BandPass',
      'Notch',
      'MovingAverage',
      'MovingMedian',
      'SavitzkyGolay',
    ]);
  });

  it('AC-02: seleccionar "Pasa Bajo" muestra el campo de corte prellenado con 49.5', () => {
    loadSignal();
    render(<FilterPanel />);

    fireEvent.change(screen.getByLabelText('Tipo de filtro'), { target: { value: 'LowPass' } });

    expect(screen.getByLabelText('Frecuencia de corte (Hz)')).toHaveValue(49.5);
  });

  it('AC-03: seleccionar "Notch" muestra los campos prellenados con 50/60', () => {
    loadSignal();
    render(<FilterPanel />);

    fireEvent.change(screen.getByLabelText('Tipo de filtro'), { target: { value: 'Notch' } });

    expect(screen.getByLabelText('Frecuencia de corte baja (Hz)')).toHaveValue(50);
    expect(screen.getByLabelText('Frecuencia de corte alta (Hz)')).toHaveValue(60);
  });

  it('AC-04: seleccionar "Media Móvil"/"Mediana Móvil" muestra la ventana prellenada con 5/7', () => {
    loadSignal();
    render(<FilterPanel />);

    fireEvent.change(screen.getByLabelText('Tipo de filtro'), { target: { value: 'MovingAverage' } });
    expect(screen.getByLabelText('Ventana')).toHaveValue(5);

    fireEvent.change(screen.getByLabelText('Tipo de filtro'), { target: { value: 'MovingMedian' } });
    expect(screen.getByLabelText('Ventana')).toHaveValue(7);
  });

  it('AC-05: seleccionar "Savitzky-Golay" muestra los campos Ventana y Grado de Polinomio vacíos', () => {
    loadSignal();
    render(<FilterPanel />);

    fireEvent.change(screen.getByLabelText('Tipo de filtro'), { target: { value: 'SavitzkyGolay' } });

    expect(screen.getByLabelText('Ventana')).toHaveValue(null);
    expect(screen.getByLabelText('Grado de polinomio')).toHaveValue(null);
    expect(screen.getByLabelText('Aplicar filtro')).toBeDisabled();
  });

  it('AC-07/AC-08: "Aplicar filtro" deshabilitado mientras "Revertir" lo está, y "Revertir" se habilita tras un applyFilter exitoso', async () => {
    loadSignal();
    const applyFilterMock = vi.fn().mockResolvedValue({ ok: true });
    useSignalStore.setState({ applyFilter: applyFilterMock });

    const { rerender } = render(<FilterPanel />);

    expect(screen.getByLabelText('Revertir')).toBeDisabled();
    fireEvent.change(screen.getByLabelText('Tipo de filtro'), { target: { value: 'LowPass' } });
    expect(screen.getByLabelText('Aplicar filtro')).not.toBeDisabled();

    fireEvent.click(screen.getByLabelText('Aplicar filtro'));
    expect(applyFilterMock).toHaveBeenCalledWith('LowPass', { cutoff: 49.5 });

    // Simula lo que applyFilter real haría: setear previousSignal en el store.
    useSignalStore.setState({ previousSignal: useSignalStore.getState().signal });

    rerender(<FilterPanel />);
    expect(screen.getByLabelText('Revertir')).not.toBeDisabled();
  });

  it('AC-11: ingresar una frecuencia que excede Nyquist deshabilita "Aplicar filtro" y muestra un mensaje', () => {
    loadSignal(250); // Nyquist = 125 Hz
    render(<FilterPanel />);

    fireEvent.change(screen.getByLabelText('Tipo de filtro'), { target: { value: 'LowPass' } });
    fireEvent.change(screen.getByLabelText('Frecuencia de corte (Hz)'), { target: { value: '200' } });

    expect(screen.getByLabelText('Aplicar filtro')).toBeDisabled();
    expect(screen.getByText(/nyquist/i)).toBeInTheDocument();
  });

  it('AC-12: ingresar low >= high deshabilita "Aplicar filtro"', () => {
    loadSignal();
    render(<FilterPanel />);

    fireEvent.change(screen.getByLabelText('Tipo de filtro'), { target: { value: 'Notch' } });
    fireEvent.change(screen.getByLabelText('Frecuencia de corte baja (Hz)'), { target: { value: '60' } });
    fireEvent.change(screen.getByLabelText('Frecuencia de corte alta (Hz)'), { target: { value: '50' } });

    expect(screen.getByLabelText('Aplicar filtro')).toBeDisabled();
  });

  it('AC-13: ingresar una ventana no entera/no positiva deshabilita "Aplicar filtro"', () => {
    loadSignal();
    render(<FilterPanel />);

    fireEvent.change(screen.getByLabelText('Tipo de filtro'), { target: { value: 'MovingAverage' } });
    fireEvent.change(screen.getByLabelText('Ventana'), { target: { value: '0' } });

    expect(screen.getByLabelText('Aplicar filtro')).toBeDisabled();
  });

  it('AC-14: para Savitzky-Golay, grado >= ventana deshabilita "Aplicar filtro"', () => {
    loadSignal();
    render(<FilterPanel />);

    fireEvent.change(screen.getByLabelText('Tipo de filtro'), { target: { value: 'SavitzkyGolay' } });
    fireEvent.change(screen.getByLabelText('Ventana'), { target: { value: '5' } });
    fireEvent.change(screen.getByLabelText('Grado de polinomio'), { target: { value: '5' } });

    expect(screen.getByLabelText('Aplicar filtro')).toBeDisabled();
  });

  it('sin señal cargada, el combo y ambos botones están deshabilitados', () => {
    render(<FilterPanel />);

    expect(screen.getByLabelText('Tipo de filtro')).toBeDisabled();
    expect(screen.getByLabelText('Aplicar filtro')).toBeDisabled();
    expect(screen.getByLabelText('Revertir')).toBeDisabled();
  });

  it('cuando applyFilter del store devuelve error, se muestra el mensaje en role="alert" sin desmontar el resto del panel', async () => {
    loadSignal();
    const applyFilterMock = vi.fn().mockResolvedValue({ ok: false, error: 'Frecuencia inválida' });
    useSignalStore.setState({ applyFilter: applyFilterMock });

    render(<FilterPanel />);

    fireEvent.change(screen.getByLabelText('Tipo de filtro'), { target: { value: 'LowPass' } });
    fireEvent.click(screen.getByLabelText('Aplicar filtro'));

    const alert = await screen.findByRole('alert');
    expect(alert).toHaveTextContent('Frecuencia inválida');
    // El resto del panel sigue montado.
    expect(screen.getByLabelText('Tipo de filtro')).toBeInTheDocument();
  });
});
