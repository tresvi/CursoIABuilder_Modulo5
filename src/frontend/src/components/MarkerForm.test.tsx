import { describe, it, expect, beforeEach } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import { MarkerForm } from './MarkerForm';
import { useMarkersStore } from '@/state/markersStore';

/**
 * Tests de MarkerForm (FEAT-003a Block 4, reescritos en FEAT-003b Block 2 para el
 * contrato sin props: `MarkerForm` lee `formState`/`markers` directamente del store).
 */
describe('MarkerForm', () => {
  beforeEach(() => {
    useMarkersStore.setState({ markers: [], formState: null });
  });

  describe('modo create', () => {
    it('AC-02 (regresión): con formState create, el campo de tiempo muestra el valor formateado y es de solo lectura', () => {
      useMarkersStore.setState({ formState: { mode: 'create', time: 65.5 } });
      render(<MarkerForm />);

      const timeField = screen.getByLabelText('Tiempo del marcador') as HTMLInputElement;
      expect(timeField).toHaveAttribute('readonly');
      expect(timeField.value).toBe('01:05.50');
      expect(screen.getByText('Nuevo marcador')).toBeInTheDocument();
      expect((screen.getByLabelText('Etiqueta') as HTMLInputElement).value).toBe('');
    });

    it('AC-03 (regresión): confirmar con una etiqueta llama a addMarker con esa etiqueta y cierra el form', () => {
      useMarkersStore.setState({ formState: { mode: 'create', time: 10 } });
      render(<MarkerForm />);

      const labelInput = screen.getByLabelText('Etiqueta');
      fireEvent.change(labelInput, { target: { value: 'Extrasístole' } });
      fireEvent.click(screen.getByRole('button', { name: 'Confirmar' }));

      const markers = useMarkersStore.getState().markers;
      expect(markers).toHaveLength(1);
      expect(markers[0]).toMatchObject({ time: 10, label: 'Extrasístole' });
      expect(useMarkersStore.getState().formState).toBeNull();
    });

    it('AC-04 (regresión): cancelar llama solo a closeForm, sin crear marcador', () => {
      useMarkersStore.setState({ formState: { mode: 'create', time: 10 } });
      render(<MarkerForm />);

      fireEvent.click(screen.getByRole('button', { name: 'Cancelar' }));

      expect(useMarkersStore.getState().formState).toBeNull();
      expect(useMarkersStore.getState().markers).toHaveLength(0);
    });

    it('AC-04 (regresión): cerrar con Escape llama solo a closeForm, sin crear marcador', () => {
      useMarkersStore.setState({ formState: { mode: 'create', time: 10 } });
      render(<MarkerForm />);

      fireEvent.keyDown(screen.getByRole('dialog'), { key: 'Escape' });

      expect(useMarkersStore.getState().formState).toBeNull();
      expect(useMarkersStore.getState().markers).toHaveLength(0);
    });
  });

  describe('modo edit', () => {
    it('AC-01: con un marcador existente, el formulario abre con la etiqueta prellenada con el valor actual', () => {
      useMarkersStore.setState({
        markers: [{ id: 'm1', time: 30, label: 'Original' }],
        formState: { mode: 'edit', markerId: 'm1' },
      });
      render(<MarkerForm />);

      expect(screen.getByText('Editar marcador')).toBeInTheDocument();
      const timeField = screen.getByLabelText('Tiempo del marcador') as HTMLInputElement;
      expect(timeField).toHaveAttribute('readonly');
      expect(timeField.value).toBe('00:30.00');
      expect((screen.getByLabelText('Etiqueta') as HTMLInputElement).value).toBe('Original');
    });

    it('AC-01b: con un marcador sin etiqueta, el campo de etiqueta parte vacío', () => {
      useMarkersStore.setState({
        markers: [{ id: 'm1', time: 30, label: null }],
        formState: { mode: 'edit', markerId: 'm1' },
      });
      render(<MarkerForm />);

      expect((screen.getByLabelText('Etiqueta') as HTMLInputElement).value).toBe('');
    });

    it('AC-02: confirmar en modo edición con una nueva etiqueta llama a updateMarker(markerId, label)', () => {
      useMarkersStore.setState({
        markers: [{ id: 'm1', time: 30, label: 'Original' }],
        formState: { mode: 'edit', markerId: 'm1' },
      });
      render(<MarkerForm />);

      const labelInput = screen.getByLabelText('Etiqueta');
      fireEvent.change(labelInput, { target: { value: 'Editada' } });
      fireEvent.click(screen.getByRole('button', { name: 'Confirmar' }));

      const markers = useMarkersStore.getState().markers;
      expect(markers).toHaveLength(1);
      expect(markers[0]).toMatchObject({ id: 'm1', time: 30, label: 'Editada' });
      expect(useMarkersStore.getState().formState).toBeNull();
    });

    it('AC-03: cancelar en modo edición llama solo a closeForm; updateMarker no se invoca y el marcador no cambia', () => {
      useMarkersStore.setState({
        markers: [{ id: 'm1', time: 30, label: 'Original' }],
        formState: { mode: 'edit', markerId: 'm1' },
      });
      render(<MarkerForm />);

      const labelInput = screen.getByLabelText('Etiqueta');
      fireEvent.change(labelInput, { target: { value: 'Cambio no confirmado' } });
      fireEvent.click(screen.getByRole('button', { name: 'Cancelar' }));

      expect(useMarkersStore.getState().formState).toBeNull();
      expect(useMarkersStore.getState().markers[0]).toMatchObject({ id: 'm1', label: 'Original' });
    });

    it('auto-cierre: con formState edit apuntando a un id inexistente, el formulario no se muestra y closeForm se invoca', () => {
      useMarkersStore.setState({
        markers: [{ id: 'm1', time: 30, label: 'Original' }],
        formState: { mode: 'edit', markerId: 'no-existe' },
      });
      render(<MarkerForm />);

      expect(screen.queryByRole('dialog')).not.toBeInTheDocument();
      expect(useMarkersStore.getState().formState).toBeNull();
    });
  });

  it('el campo de etiqueta tiene maxLength=200 en modo create', () => {
    useMarkersStore.setState({ formState: { mode: 'create', time: 10 } });
    render(<MarkerForm />);

    const labelInput = screen.getByLabelText('Etiqueta') as HTMLInputElement;
    expect(labelInput).toHaveAttribute('maxLength', '200');
  });

  it('el campo de etiqueta tiene maxLength=200 en modo edit', () => {
    useMarkersStore.setState({
      markers: [{ id: 'm1', time: 30, label: 'Original' }],
      formState: { mode: 'edit', markerId: 'm1' },
    });
    render(<MarkerForm />);

    const labelInput = screen.getByLabelText('Etiqueta') as HTMLInputElement;
    expect(labelInput).toHaveAttribute('maxLength', '200');
  });

  it('con formState null, el diálogo no se muestra', () => {
    render(<MarkerForm />);
    expect(screen.queryByRole('dialog')).not.toBeInTheDocument();
  });
});
