import { describe, it, expect } from 'vitest';
import { render, screen } from '@testing-library/react';
import App from './App';

describe('App — smoke de montaje', () => {
  it('renderiza el heading y monta CsvUpload + ChartToolbar + ECGChart sin errores', () => {
    render(<App />);

    // Heading principal de la aplicación (RF-01).
    expect(
      screen.getByRole('heading', { name: /ECGViewer/i }),
    ).toBeInTheDocument();

    // CsvUpload está montado: su input de carga con aria-label está presente.
    expect(
      screen.getByLabelText('Cargar archivo CSV de ECG'),
    ).toBeInTheDocument();

    // ChartToolbar está montada: sus tres controles nativos con aria-label están presentes.
    expect(
      screen.getByLabelText('Activar herramienta de zoom'),
    ).toBeInTheDocument();
    expect(screen.getByLabelText('Restablecer zoom')).toBeInTheDocument();
    expect(
      screen.getByLabelText('Mostrar u ocultar rejilla'),
    ).toBeInTheDocument();

    // ECGChart está montado: sin señal cargada, muestra el estado vacío (AC-02).
    expect(
      screen.getByText('Cargá una señal para visualizarla.'),
    ).toBeInTheDocument();
  });
});
