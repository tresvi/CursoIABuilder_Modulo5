import { describe, it, expect, beforeEach } from 'vitest';
import { useMarkersStore } from './markersStore';

/**
 * Tests del markersStore (FEAT-003a, Block 2). Estado de marcadores desacoplado
 * de viewStore/signalStore (ADR-001). Se resetea el store antes de cada test.
 */
describe('markersStore', () => {
  beforeEach(() => {
    useMarkersStore.getState().reset();
  });

  it('parte de los defaults', () => {
    expect(useMarkersStore.getState().markers).toEqual([]);
  });

  it('addMarker agrega un marcador con id no vacío y único entre dos llamadas', () => {
    useMarkersStore.getState().addMarker(1, 'a');
    useMarkersStore.getState().addMarker(2, 'b');
    const { markers } = useMarkersStore.getState();
    expect(markers).toHaveLength(2);
    expect(markers[0].id).toBeTruthy();
    expect(markers[1].id).toBeTruthy();
    expect(markers[0].id).not.toBe(markers[1].id);
  });

  it('addMarker con label "  " (solo espacios) guarda label: null', () => {
    useMarkersStore.getState().addMarker(5, '   ');
    expect(useMarkersStore.getState().markers[0].label).toBeNull();
  });

  it('addMarker con label null guarda label: null', () => {
    useMarkersStore.getState().addMarker(5, null);
    expect(useMarkersStore.getState().markers[0].label).toBeNull();
  });

  it('addMarker con label con contenido lo conserva trimeado', () => {
    useMarkersStore.getState().addMarker(5, 'evento');
    expect(useMarkersStore.getState().markers[0].label).toBe('evento');
  });

  it('reset vacía markers', () => {
    useMarkersStore.getState().addMarker(1, 'a');
    useMarkersStore.getState().reset();
    expect(useMarkersStore.getState().markers).toEqual([]);
  });
});
