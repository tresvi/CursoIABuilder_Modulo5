import { describe, it, expect, beforeEach } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import { MarkerList } from './MarkerList';
import { useMarkersStore } from '@/state/markersStore';

/**
 * Tests de MarkerList (FEAT-003a, Block 6).
 */
describe('MarkerList', () => {
  beforeEach(() => {
    useMarkersStore.setState({ markers: [] });
  });

  it('AC-05: con marcadores en distinto orden de creación, la lista se muestra ordenada cronológicamente', () => {
    useMarkersStore.setState({
      markers: [
        { id: '2', time: 20, label: 'Segundo' },
        { id: '1', time: 5, label: 'Primero' },
        { id: '3', time: 30, label: 'Tercero' },
      ],
    });

    render(<MarkerList />);

    const items = screen.getAllByRole('listitem');
    expect(items).toHaveLength(3);
    expect(items[0]).toHaveTextContent('Primero');
    expect(items[1]).toHaveTextContent('Segundo');
    expect(items[2]).toHaveTextContent('Tercero');
  });

  it('un marcador con label: null se muestra con el texto "Sin etiqueta"', () => {
    useMarkersStore.setState({
      markers: [{ id: '1', time: 5, label: null }],
    });

    render(<MarkerList />);

    expect(screen.getByText('Sin etiqueta')).toBeInTheDocument();
  });

  it('el panel es colapsable (alternar <details open> oculta/muestra la lista)', () => {
    useMarkersStore.setState({
      markers: [{ id: '1', time: 5, label: 'Foo' }],
    });

    const { container } = render(<MarkerList />);

    const details = container.querySelector('details');
    expect(details).not.toBeNull();
    expect(details).toHaveAttribute('open');

    const summary = container.querySelector('summary');
    expect(summary).not.toBeNull();
    expect(summary?.textContent).toContain('1');

    // Alternar: un clic en el summary colapsa el panel (comportamiento nativo de <details>).
    fireEvent.click(summary as HTMLElement);
    expect(details).not.toHaveAttribute('open');

    // Un segundo clic lo vuelve a abrir.
    fireEvent.click(summary as HTMLElement);
    expect(details).toHaveAttribute('open');
  });

  it('mitigación XSS: un marcador con label con marcado HTML se renderiza como texto literal, no se interpreta', () => {
    const malicious = '<img src=x onerror=alert(1)>';
    useMarkersStore.setState({
      markers: [{ id: '1', time: 5, label: malicious }],
    });

    const { container } = render(<MarkerList />);

    // El texto literal debe estar presente...
    expect(screen.getByText(malicious)).toBeInTheDocument();
    // ...pero no debe haber ningún <img> real insertado en el DOM.
    expect(container.querySelector('img')).toBeNull();
  });
});
