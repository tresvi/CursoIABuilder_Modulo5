import { describe, it, expect, beforeEach } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import { ChartToolbar } from './ChartToolbar';
import { useViewStore } from '@/state/viewStore';

const ZOOM_LABEL = 'Activar herramienta de zoom';
const RESET_LABEL = 'Restablecer zoom';
const GRID_LABEL = 'Mostrar u ocultar rejilla';
const MARK_LABEL = 'Activar herramienta de marcador';
const RULER_LABEL = 'Activar herramienta de regla';
const CROP_LABEL = 'Activar herramienta de recorte';

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

  it('el toggle "Marcar" activa la herramienta y al volver a clickear la desactiva (AC-01)', () => {
    render(<ChartToolbar />);
    const markToggle = screen.getByLabelText(MARK_LABEL);

    expect(markToggle).toHaveAttribute('aria-pressed', 'false');
    expect(useViewStore.getState().activeTool).toBe('none');

    fireEvent.click(markToggle);
    expect(markToggle).toHaveAttribute('aria-pressed', 'true');
    expect(useViewStore.getState().activeTool).toBe('mark');

    fireEvent.click(markToggle);
    expect(markToggle).toHaveAttribute('aria-pressed', 'false');
    expect(useViewStore.getState().activeTool).toBe('none');
  });

  it('activar "Marcar" mientras "Zoom" está activo desactiva "Zoom" (exclusión mutua)', () => {
    render(<ChartToolbar />);
    const zoomToggle = screen.getByLabelText(ZOOM_LABEL);
    const markToggle = screen.getByLabelText(MARK_LABEL);

    fireEvent.click(zoomToggle);
    expect(zoomToggle).toHaveAttribute('aria-pressed', 'true');
    expect(useViewStore.getState().activeTool).toBe('zoom');

    fireEvent.click(markToggle);
    expect(zoomToggle).toHaveAttribute('aria-pressed', 'false');
    expect(markToggle).toHaveAttribute('aria-pressed', 'true');
    expect(useViewStore.getState().activeTool).toBe('mark');
  });

  it('el toggle "Regla" activa la herramienta y al volver a clickear la desactiva (AC-01)', () => {
    render(<ChartToolbar />);
    const rulerToggle = screen.getByLabelText(RULER_LABEL);

    expect(rulerToggle).toHaveAttribute('aria-pressed', 'false');
    expect(useViewStore.getState().activeTool).toBe('none');

    fireEvent.click(rulerToggle);
    expect(rulerToggle).toHaveAttribute('aria-pressed', 'true');
    expect(useViewStore.getState().activeTool).toBe('ruler');

    fireEvent.click(rulerToggle);
    expect(rulerToggle).toHaveAttribute('aria-pressed', 'false');
    expect(useViewStore.getState().activeTool).toBe('none');
  });

  it('activar "Regla" mientras "Zoom" o "Marcar" está activa desactiva la otra (exclusión mutua)', () => {
    render(<ChartToolbar />);
    const zoomToggle = screen.getByLabelText(ZOOM_LABEL);
    const markToggle = screen.getByLabelText(MARK_LABEL);
    const rulerToggle = screen.getByLabelText(RULER_LABEL);

    fireEvent.click(zoomToggle);
    expect(useViewStore.getState().activeTool).toBe('zoom');

    fireEvent.click(rulerToggle);
    expect(zoomToggle).toHaveAttribute('aria-pressed', 'false');
    expect(rulerToggle).toHaveAttribute('aria-pressed', 'true');
    expect(useViewStore.getState().activeTool).toBe('ruler');

    fireEvent.click(markToggle);
    expect(rulerToggle).toHaveAttribute('aria-pressed', 'false');
    expect(markToggle).toHaveAttribute('aria-pressed', 'true');
    expect(useViewStore.getState().activeTool).toBe('mark');

    fireEvent.click(rulerToggle);
    expect(markToggle).toHaveAttribute('aria-pressed', 'false');
    expect(rulerToggle).toHaveAttribute('aria-pressed', 'true');
    expect(useViewStore.getState().activeTool).toBe('ruler');
  });

  it('el toggle "Recorte" activa la herramienta y al volver a clickear la desactiva (AC-01)', () => {
    render(<ChartToolbar />);
    const cropToggle = screen.getByLabelText(CROP_LABEL);

    expect(cropToggle).toHaveAttribute('aria-pressed', 'false');
    expect(useViewStore.getState().activeTool).toBe('none');

    fireEvent.click(cropToggle);
    expect(cropToggle).toHaveAttribute('aria-pressed', 'true');
    expect(useViewStore.getState().activeTool).toBe('crop');

    fireEvent.click(cropToggle);
    expect(cropToggle).toHaveAttribute('aria-pressed', 'false');
    expect(useViewStore.getState().activeTool).toBe('none');
  });

  it('activar "Recorte" mientras "Zoom", "Marcar" o "Regla" está activa desactiva la otra (exclusión mutua, AC-01)', () => {
    render(<ChartToolbar />);
    const zoomToggle = screen.getByLabelText(ZOOM_LABEL);
    const markToggle = screen.getByLabelText(MARK_LABEL);
    const rulerToggle = screen.getByLabelText(RULER_LABEL);
    const cropToggle = screen.getByLabelText(CROP_LABEL);

    fireEvent.click(zoomToggle);
    expect(useViewStore.getState().activeTool).toBe('zoom');

    fireEvent.click(cropToggle);
    expect(zoomToggle).toHaveAttribute('aria-pressed', 'false');
    expect(cropToggle).toHaveAttribute('aria-pressed', 'true');
    expect(useViewStore.getState().activeTool).toBe('crop');

    fireEvent.click(markToggle);
    expect(cropToggle).toHaveAttribute('aria-pressed', 'false');
    expect(markToggle).toHaveAttribute('aria-pressed', 'true');
    expect(useViewStore.getState().activeTool).toBe('mark');

    fireEvent.click(cropToggle);
    expect(markToggle).toHaveAttribute('aria-pressed', 'false');
    expect(cropToggle).toHaveAttribute('aria-pressed', 'true');
    expect(useViewStore.getState().activeTool).toBe('crop');

    fireEvent.click(rulerToggle);
    expect(cropToggle).toHaveAttribute('aria-pressed', 'false');
    expect(rulerToggle).toHaveAttribute('aria-pressed', 'true');
    expect(useViewStore.getState().activeTool).toBe('ruler');
  });
});
