import { describe, it, expect, vi } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import { ConfirmDialog } from './ConfirmDialog';

/**
 * Tests de ConfirmDialog (FEAT-003b, Block 4).
 */
describe('ConfirmDialog', () => {
  it('confirmar llama a onConfirm', () => {
    const onConfirm = vi.fn();
    const onCancel = vi.fn();

    render(
      <ConfirmDialog
        open
        title="Eliminar marcador"
        description="¿Eliminar el marcador seleccionado?"
        onConfirm={onConfirm}
        onCancel={onCancel}
      />,
    );

    fireEvent.click(screen.getByRole('button', { name: /confirmar/i }));

    expect(onConfirm).toHaveBeenCalledTimes(1);
    expect(onCancel).not.toHaveBeenCalled();
  });

  it('cancelar llama a onCancel y no a onConfirm', () => {
    const onConfirm = vi.fn();
    const onCancel = vi.fn();

    render(
      <ConfirmDialog
        open
        title="Eliminar marcador"
        description="¿Eliminar el marcador seleccionado?"
        onConfirm={onConfirm}
        onCancel={onCancel}
      />,
    );

    fireEvent.click(screen.getByRole('button', { name: /cancelar/i }));

    expect(onCancel).toHaveBeenCalledTimes(1);
    expect(onConfirm).not.toHaveBeenCalled();
  });

  it('cerrar con Escape llama a onCancel y no a onConfirm', () => {
    const onConfirm = vi.fn();
    const onCancel = vi.fn();

    render(
      <ConfirmDialog
        open
        title="Eliminar marcador"
        description="¿Eliminar el marcador seleccionado?"
        onConfirm={onConfirm}
        onCancel={onCancel}
      />,
    );

    fireEvent.keyDown(screen.getByRole('dialog'), { key: 'Escape' });

    expect(onCancel).toHaveBeenCalledTimes(1);
    expect(onConfirm).not.toHaveBeenCalled();
  });

  it('mitigación XSS: description con marcado HTML se renderiza como texto literal, no se interpreta', () => {
    const malicious = '<img src=x onerror=alert(1)>';

    const { container } = render(
      <ConfirmDialog
        open
        title="Eliminar marcador"
        description={malicious}
        onConfirm={vi.fn()}
        onCancel={vi.fn()}
      />,
    );

    expect(screen.getByText(malicious)).toBeInTheDocument();
    expect(container.querySelector('img')).toBeNull();
  });
});
