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

  it('updateMarker reemplaza la etiqueta del marcador con ese id, sin tocar los demás', () => {
    useMarkersStore.getState().addMarker(1, 'a');
    useMarkersStore.getState().addMarker(2, 'b');
    const [first, second] = useMarkersStore.getState().markers;
    useMarkersStore.getState().updateMarker(first.id, 'nuevo');
    const markers = useMarkersStore.getState().markers;
    expect(markers.find((m) => m.id === first.id)?.label).toBe('nuevo');
    expect(markers.find((m) => m.id === second.id)?.label).toBe('b');
  });

  it('updateMarker con label solo-espacios guarda label: null', () => {
    useMarkersStore.getState().addMarker(1, 'a');
    const [marker] = useMarkersStore.getState().markers;
    useMarkersStore.getState().updateMarker(marker.id, '   ');
    expect(useMarkersStore.getState().markers[0].label).toBeNull();
  });

  it('updateMarker con un id inexistente no modifica markers (no-op)', () => {
    useMarkersStore.getState().addMarker(1, 'a');
    const before = useMarkersStore.getState().markers;
    useMarkersStore.getState().updateMarker('id-inexistente', 'nuevo');
    expect(useMarkersStore.getState().markers).toEqual(before);
  });

  it('removeMarker quita el marcador con ese id, sin tocar los demás', () => {
    useMarkersStore.getState().addMarker(1, 'a');
    useMarkersStore.getState().addMarker(2, 'b');
    const [first, second] = useMarkersStore.getState().markers;
    useMarkersStore.getState().removeMarker(first.id);
    const markers = useMarkersStore.getState().markers;
    expect(markers).toHaveLength(1);
    expect(markers[0].id).toBe(second.id);
  });

  it('removeMarker con un id inexistente no modifica markers (no-op)', () => {
    useMarkersStore.getState().addMarker(1, 'a');
    const before = useMarkersStore.getState().markers;
    useMarkersStore.getState().removeMarker('id-inexistente');
    expect(useMarkersStore.getState().markers).toEqual(before);
  });

  it('openCreateForm/openEditForm/closeForm fijan formState al valor esperado', () => {
    useMarkersStore.getState().openCreateForm(10);
    expect(useMarkersStore.getState().formState).toEqual({ mode: 'create', time: 10 });

    useMarkersStore.getState().openEditForm('marker-1');
    expect(useMarkersStore.getState().formState).toEqual({ mode: 'edit', markerId: 'marker-1' });

    useMarkersStore.getState().closeForm();
    expect(useMarkersStore.getState().formState).toBeNull();
  });

  it('reset() también deja formState en null', () => {
    useMarkersStore.getState().openCreateForm(10);
    useMarkersStore.getState().reset();
    expect(useMarkersStore.getState().formState).toBeNull();
  });

  it('removeMarkersOutside conserva solo los marcadores dentro del rango', () => {
    useMarkersStore.getState().addMarker(1, 'antes');
    useMarkersStore.getState().addMarker(5, 'dentro');
    useMarkersStore.getState().addMarker(20, 'despues');
    useMarkersStore.getState().removeMarkersOutside({ fromTime: 2, toTime: 10 });
    const markers = useMarkersStore.getState().markers;
    expect(markers).toHaveLength(1);
    expect(markers[0].label).toBe('dentro');
  });

  it('removeMarkersOutside conserva un marcador exactamente en el borde (límites inclusivos)', () => {
    useMarkersStore.getState().addMarker(2, 'borde-inicio');
    useMarkersStore.getState().addMarker(10, 'borde-fin');
    useMarkersStore.getState().addMarker(11, 'fuera');
    useMarkersStore.getState().removeMarkersOutside({ fromTime: 2, toTime: 10 });
    const markers = useMarkersStore.getState().markers;
    expect(markers).toHaveLength(2);
    expect(markers.map((m) => m.label).sort()).toEqual(['borde-fin', 'borde-inicio']);
  });

  it('removeMarkersOutside con markers: [] sigue siendo []', () => {
    useMarkersStore.getState().removeMarkersOutside({ fromTime: 0, toTime: 100 });
    expect(useMarkersStore.getState().markers).toEqual([]);
  });
});
