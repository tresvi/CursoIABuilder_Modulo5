import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { act, render, screen, within } from '@testing-library/react';
import { MainPanel } from './MainPanel';
import { useMarkersStore } from '@/state/markersStore';
import { useSignalStore } from '@/state/signalStore';
import { useViewStore } from '@/state/viewStore';
import type { ECGSample } from '@/lib/ecg/types';

/**
 * Muestras sintéticas con QRS regulares (picos gaussianos angostos) cada `periodS`
 * segundos a `fs` Hz — mismo generador que `MetricsPanel.test.tsx`, para que
 * `detectRPeaks` encuentre latidos y las métricas den valores numéricos reales.
 */
function syntheticQrsSamples(durationS: number, periodS: number, fs = 250): ECGSample[] {
  const samples: ECGSample[] = [];
  const n = Math.round(durationS * fs);
  for (let i = 0; i < n; i++) {
    const t = i / fs;
    const phase = t % periodS;
    const distToPeak = Math.min(phase, periodS - phase);
    const mV = 0.1 + Math.exp(-(distToPeak * distToPeak) / (2 * 0.01 * 0.01));
    samples.push({ t, mV });
  }
  return samples;
}

/** Carga una señal en el store sin pasar por la UI (patrón de `App.test.tsx`). */
function loadSignal(durationS = 10): void {
  useSignalStore.setState({
    signal: { samples: syntheticQrsSamples(durationS, 0.8) },
    previousSignal: null,
    status: 'loaded',
    error: null,
    fileName: 'ECG_test.csv',
  });
}

beforeEach(() => {
  useSignalStore.getState().reset();
  useViewStore.getState().reset();
  useMarkersStore.setState({ markers: [], formState: null });
  // Ningún test sale a la red: el `ExampleLoader` del estado vacío usa `fetch`.
  vi.stubGlobal('fetch', vi.fn());
});

afterEach(() => {
  vi.unstubAllGlobals();
});

describe('MainPanel — panel principal (FEAT-009, Block 6)', () => {
  it('sin señal muestra el estado vacío con el mensaje y "Cargar ejemplo" (AC-05)', () => {
    render(<MainPanel />);

    const empty = screen.getByRole('region', { name: 'Sin señal cargada' });
    expect(within(empty).getByText(/Cargá un archivo CSV de ECG monocanal/i)).toBeInTheDocument();
    expect(within(empty).getByLabelText('Cargar ejemplo')).toBeInTheDocument();

    // Sin señal no hay trazado ni tarjeta de métricas en el panel.
    expect(screen.queryByLabelText('Gráfico ECG')).not.toBeInTheDocument();
    expect(screen.queryByRole('heading', { name: 'Métricas' })).not.toBeInTheDocument();
    expect(screen.queryByRole('region', { name: /Métricas/ })).not.toBeInTheDocument();
  });

  it('con señal muestra el trazado y la tarjeta "Métricas" con BPM, SDNN, RMSSD y pNN50 (AC-06)', () => {
    loadSignal();
    useViewStore.getState().initForSignal(0, 10);

    render(<MainPanel />);

    // El estado vacío desaparece y aparece el Canvas 2D existente (sin tocar su lógica).
    expect(screen.queryByRole('region', { name: 'Sin señal cargada' })).not.toBeInTheDocument();
    expect(screen.getByLabelText('Gráfico ECG')).toBeInTheDocument();

    // Tarjeta "Métricas" a la derecha del trazado, con las 4 métricas HRV. El nombre
    // de la tarjeta lo da su encabezado visible; el envoltorio es sólo layout.
    const heading = screen.getByRole('heading', { name: 'Métricas' });
    const card = heading.parentElement as HTMLElement;
    expect(within(card).getByLabelText('BPM')).toBeInTheDocument();
    expect(within(card).getByLabelText('SDNN')).toBeInTheDocument();
    expect(within(card).getByLabelText('RMSSD')).toBeInTheDocument();
    expect(within(card).getByLabelText('pNN50')).toBeInTheDocument();
    // Valores calculados sobre la ventana visible, no "N/A": RR ~800 ms → ~75 bpm.
    expect(within(card).getByLabelText('BPM')).toHaveTextContent(/^7[4-6]$/);

    // Paneles inferiores de la referencia visual: marcadores debajo del trazado.
    expect(screen.getByText(/^Marcadores \(0\)$/)).toBeInTheDocument();
  });

  it('con señal pero sin ventana visible mantiene la columna de métricas sin romper el layout', () => {
    loadSignal();

    render(<MainPanel />);

    // `ECGChart` fija la ventana al montarse con una señal; se la deja en `null` para
    // reproducir el caso documentado (p. ej. entre la carga y el primer dibujo).
    act(() => {
      useViewStore.setState({ visibleWindow: null });
    });
    expect(useViewStore.getState().visibleWindow).toBeNull();
    // `MetricsPanel` devuelve `null` en ese caso: su lógica no cambia.

    // La tarjeta sigue reservando la columna: el layout no salta.
    const heading = screen.getByRole('heading', { name: 'Métricas' });
    const card = heading.parentElement as HTMLElement;
    expect(heading).toBeInTheDocument();
    // Pero sin ventana visible no hay valores que mostrar.
    expect(within(card).queryByLabelText('BPM')).not.toBeInTheDocument();
    // El trazado sigue presente: no se cae al estado vacío.
    expect(screen.getByLabelText('Gráfico ECG')).toBeInTheDocument();
    expect(screen.queryByRole('region', { name: 'Sin señal cargada' })).not.toBeInTheDocument();
  });

  it('tras un error de carga vuelve al estado vacío', () => {
    loadSignal();
    useViewStore.getState().initForSignal(0, 10);

    const { rerender } = render(<MainPanel />);
    expect(screen.getByLabelText('Gráfico ECG')).toBeInTheDocument();

    // `setError` deja `signal` en `null`: no queda una señal parcialmente cargada.
    useSignalStore.getState().setError('read-error');
    rerender(<MainPanel />);

    expect(screen.getByRole('region', { name: 'Sin señal cargada' })).toBeInTheDocument();
    expect(screen.queryByLabelText('Gráfico ECG')).not.toBeInTheDocument();
    expect(screen.queryByRole('heading', { name: 'Métricas' })).not.toBeInTheDocument();
    expect(screen.queryByRole('region', { name: /Métricas/ })).not.toBeInTheDocument();
  });

  it('la tarjeta de métricas expone un solo landmark, no uno anidado casi homónimo', () => {
    loadSignal();
    useViewStore.getState().initForSignal(0, 10);

    render(<MainPanel />);

    // `MetricsPanel` ya es `<section aria-label="Métricas cardíacas">`. Si el envoltorio
    // de la columna fuese también un `<section>` con nombre accesible, quien navega por
    // landmarks encontraría dos entradas consecutivas casi idénticas para una sola
    // tarjeta. El envoltorio existe por layout: es un `<div>`, no un landmark.
    expect(screen.getAllByRole('region', { name: /Métricas/ })).toHaveLength(1);

    const wrapper = screen.getByRole('heading', { name: 'Métricas' }).parentElement;
    expect(wrapper?.tagName).toBe('DIV');
    expect(wrapper).not.toHaveAttribute('aria-label');
  });
});
