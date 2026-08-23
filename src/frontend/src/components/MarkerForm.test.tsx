import { describe, it, expect, vi } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import { MarkerForm } from './MarkerForm';

/**
 * Tests de MarkerForm (FEAT-003a, Block 4).
 */
describe('MarkerForm', () => {
  it('AC-02: con open=true y time fijado, el campo de tiempo muestra el valor formateado y es de solo lectura', () => {
    render(
      <MarkerForm open={true} time={65.5} onConfirm={vi.fn()} onCancel={vi.fn()} />,
    );

    const timeField = screen.getByLabelText('Tiempo del marcador') as HTMLInputElement;
    expect(timeField).toHaveAttribute('readonly');
    expect(timeField.value).not.toBe('');
    expect(timeField.value).toBe('01:05.50');
  });

  it('AC-03: confirmar con una etiqueta llama a onConfirm con esa etiqueta', () => {
    const onConfirm = vi.fn();
    const onCancel = vi.fn();
    render(<MarkerForm open={true} time={10} onConfirm={onConfirm} onCancel={onCancel} />);

    const labelInput = screen.getByLabelText('Etiqueta');
    fireEvent.change(labelInput, { target: { value: 'Extrasístole' } });
    fireEvent.click(screen.getByRole('button', { name: 'Confirmar' }));

    expect(onConfirm).toHaveBeenCalledWith('Extrasístole');
    expect(onCancel).not.toHaveBeenCalled();
  });

  it('AC-04: cancelar llama a onCancel y no a onConfirm', () => {
    const onConfirm = vi.fn();
    const onCancel = vi.fn();
    render(<MarkerForm open={true} time={10} onConfirm={onConfirm} onCancel={onCancel} />);

    fireEvent.click(screen.getByRole('button', { name: 'Cancelar' }));

    expect(onCancel).toHaveBeenCalled();
    expect(onConfirm).not.toHaveBeenCalled();
  });

  it('AC-04: cerrar con Escape llama a onCancel y no a onConfirm', () => {
    const onConfirm = vi.fn();
    const onCancel = vi.fn();
    render(<MarkerForm open={true} time={10} onConfirm={onConfirm} onCancel={onCancel} />);

    fireEvent.keyDown(screen.getByRole('dialog'), { key: 'Escape' });

    expect(onCancel).toHaveBeenCalled();
    expect(onConfirm).not.toHaveBeenCalled();
  });

  it('el campo de etiqueta tiene maxLength=200', () => {
    render(<MarkerForm open={true} time={10} onConfirm={vi.fn()} onCancel={vi.fn()} />);

    const labelInput = screen.getByLabelText('Etiqueta') as HTMLInputElement;
    expect(labelInput).toHaveAttribute('maxLength', '200');
  });
});
