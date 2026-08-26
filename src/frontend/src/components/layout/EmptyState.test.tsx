import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { render, screen } from '@testing-library/react';
import { EmptyState } from './EmptyState';
import { EXAMPLE_SAMPLES } from '@/lib/ecg/samples';
import { useSignalStore } from '@/state/signalStore';

/**
 * Tests del estado vacío del panel principal (FEAT-009, Block 6 — FR-05/FR-07).
 *
 * `fetch` se stubea SIEMPRE (aunque el control no lo dispare al montarse) para que
 * ningún test pueda salir a la red real (regla de AGENTS.md).
 */
beforeEach(() => {
  useSignalStore.getState().reset();
  vi.stubGlobal('fetch', vi.fn());
});

afterEach(() => {
  vi.unstubAllGlobals();
});

describe('EmptyState — call-to-action del panel principal (FEAT-009, Block 6)', () => {
  it('el botón "Cargar ejemplo" ofrece las 3 señales de ejemplo (AC-05, FR-07)', () => {
    render(<EmptyState />);

    const loader = screen.getByLabelText('Cargar ejemplo') as HTMLSelectElement;
    expect(loader).toBeInTheDocument();

    // Placeholder aparte, las opciones son exactamente las 3 del catálogo, en orden.
    const options = Array.from(loader.options).filter((option) => option.value !== '');
    expect(options).toHaveLength(3);
    expect(options.map((option) => option.value)).toEqual(EXAMPLE_SAMPLES.map((s) => s.id));
    expect(options.map((option) => option.textContent)).toEqual(
      EXAMPLE_SAMPLES.map((s) => s.label),
    );
  });

  it('muestra el mensaje de instrucción de la referencia visual (AC-05)', () => {
    render(<EmptyState />);

    expect(screen.getByRole('region', { name: 'Sin señal cargada' })).toBeInTheDocument();
    expect(screen.getByText(/Cargá un archivo CSV de ECG monocanal/i)).toBeInTheDocument();
  });

  it('el call-to-action lleva el rótulo visible "Cargar ejemplo" (AC-05)', () => {
    render(<EmptyState />);

    // La referencia (`docs/UI/UI_Without_any_ECG_Loaded.PNG`) muestra el rótulo, no
    // sólo el placeholder del `<select>`.
    const label = screen.getByText('Cargar ejemplo');
    // Mismo patrón que `FileSection`: un `<p>`, no un encabezado — un h3 acá saltaría
    // el orden h1 "ECGViewer" → h2 "Trazado ECG" (heading-order de axe, WCAG 1.3.1).
    expect(label.tagName).toBe('P');
    expect(screen.queryByRole('heading', { name: 'Cargar ejemplo' })).not.toBeInTheDocument();
    // El rótulo y el control forman un grupo propio (mismo patrón que `FileSection`),
    // no dos hijos sueltos del estado vacío separados por el `gap` de la columna.
    const group = label.parentElement as HTMLElement;
    expect(group).toContainElement(screen.getByLabelText('Cargar ejemplo'));
    expect(group.childElementCount).toBe(2);
  });
});
