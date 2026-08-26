import { describe, it, expect } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import { SidebarSection } from './SidebarSection';

describe('SidebarSection', () => {
  it('sin children renderiza el título sin lanzar', () => {
    expect(() => render(<SidebarSection title="Archivo" />)).not.toThrow();

    expect(screen.getByText('Archivo')).toBeInTheDocument();

    // Sin children se renderiza solo el <summary>: no hay contenedor de contenido
    // (si lo hubiera, su padding dejaría una banda vacía visible).
    const details = screen.getByText('Archivo').closest('details');
    expect(details).not.toBeNull();
    expect(details?.querySelector('div')).toBeNull();
  });

  it('colapsa y despliega su contenido con el toggle nativo', () => {
    render(
      <SidebarSection title="Herramientas" defaultOpen>
        <button type="button">Zoom</button>
      </SidebarSection>,
    );

    const summary = screen.getByText('Herramientas');
    const details = summary.closest('details');
    expect(details).not.toBeNull();
    expect(details).toHaveAttribute('open');

    // Colapsa
    fireEvent.click(summary);
    expect(details).not.toHaveAttribute('open');

    // Despliega de nuevo
    fireEvent.click(summary);
    expect(details).toHaveAttribute('open');
  });
});
