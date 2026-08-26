import { describe, it, expect } from 'vitest';
import { render, screen } from '@testing-library/react';
import { AppLayout } from './AppLayout';

describe('AppLayout', () => {
  it('renderiza el sidebar y el panel principal en un shell de dos columnas', () => {
    render(
      <AppLayout sidebar={<p>contenido del sidebar</p>}>
        <p>contenido principal</p>
      </AppLayout>,
    );

    // Columna 1: el sidebar se renderiza en un landmark propio (<aside>).
    const sidebar = screen.getByRole('complementary', { name: 'Navegación de ECGViewer' });
    expect(sidebar).toBeInTheDocument();
    expect(sidebar).toHaveTextContent('contenido del sidebar');

    // Columna 2: el panel principal se renderiza en <main>.
    const main = screen.getByRole('main');
    expect(main).toBeInTheDocument();
    expect(main).toHaveTextContent('contenido principal');

    // Ambas columnas son hermanas dentro de un mismo contenedor flex (AC-01).
    expect(sidebar.parentElement).toBe(main.parentElement);
    expect(sidebar.parentElement?.className).toContain('flex');
  });
});
