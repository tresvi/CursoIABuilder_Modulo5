import { describe, it, expect, beforeEach } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import { ChartToolbar } from './ChartToolbar';
import { useViewStore } from '@/state/viewStore';

const ZOOM_LABEL = 'Activar herramienta de zoom';
const RESET_LABEL = 'Restablecer zoom';
const GRID_LABEL = 'Mostrar u ocultar rejilla';

/**
 * Tests de ChartToolbar (FEAT-002, Block 4). Se resetea el viewStore antes de
 * cada test (patrón de CsvUpload.test / viewStore.test).
 */
describe('ChartToolbar', () => {
  beforeEach(() => {
    useViewStore.getState().reset();
  });

  it('el toggle "Zoom" activa la herramienta y al volver a clickear la desactiva (AC-03)', () => {
    render(<ChartToolbar />);
    const zoomToggle = screen.getByLabelText(ZOOM_LABEL);

    expect(zoomToggle).toHaveAttribute('aria-pressed', 'false');
    expect(useViewStore.getState().activeTool).toBe('none');

    fireEvent.click(zoomToggle);
    expect(zoomToggle).toHaveAttribute('aria-pressed', 'true');
    expect(useViewStore.getState().activeTool).toBe('zoom');

    fireEvent.click(zoomToggle);
    expect(zoomToggle).toHaveAttribute('aria-pressed', 'false');
    expect(useViewStore.getState().activeTool).toBe('none');
  });

  it('"Restablecer zoom" invoca resetZoom y la vista vuelve a fullWindow tras un zoom (AC-06)', () => {
    useViewStore.getState().initForSignal(0, 10);
    useViewStore.getState().setZoomWindow({ fromTime: 2, toTime: 5 });
    expect(useViewStore.getState().visibleWindow).toEqual({ fromTime: 2, toTime: 5 });

    render(<ChartToolbar />);
    fireEvent.click(screen.getByLabelText(RESET_LABEL));

    expect(useViewStore.getState().visibleWindow).toEqual({ fromTime: 0, toTime: 10 });
  });

  it('el toggle "Rejilla" alterna gridVisible (AC-07)', () => {
    render(<ChartToolbar />);
    const gridToggle = screen.getByLabelText(GRID_LABEL);

    // Default del store: gridVisible = true.
    expect(gridToggle).toHaveAttribute('aria-pressed', 'true');
    expect(useViewStore.getState().gridVisible).toBe(true);

    fireEvent.click(gridToggle);
    expect(gridToggle).toHaveAttribute('aria-pressed', 'false');
    expect(useViewStore.getState().gridVisible).toBe(false);

    fireEvent.click(gridToggle);
    expect(gridToggle).toHaveAttribute('aria-pressed', 'true');
    expect(useViewStore.getState().gridVisible).toBe(true);
  });

  it('"Restablecer zoom" sin señal cargada no lanza excepción (reset-sin-señal, sad path)', () => {
    expect(useViewStore.getState().fullWindow).toBeNull();
    render(<ChartToolbar />);

    expect(() => fireEvent.click(screen.getByLabelText(RESET_LABEL))).not.toThrow();
    expect(useViewStore.getState().visibleWindow).toBeNull();
  });
});
