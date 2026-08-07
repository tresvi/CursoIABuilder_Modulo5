import { describe, it, expect } from 'vitest';
import { render, screen } from '@testing-library/react';
import App from './App';

describe('App — smoke de montaje', () => {
  it('renderiza el heading de la app y monta CsvUpload', () => {
    render(<App />);

    // Heading principal de la aplicación (RF-01).
    expect(
      screen.getByRole('heading', { name: /ECGViewer/i }),
    ).toBeInTheDocument();

    // CsvUpload está montado: su input de carga con aria-label está presente.
    expect(
      screen.getByLabelText('Cargar archivo CSV de ECG'),
    ).toBeInTheDocument();
  });
});
