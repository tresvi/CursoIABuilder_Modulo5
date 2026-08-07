import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import { CsvUpload } from './CsvUpload';
import { useSignalStore } from '@/state/signalStore';

const ARIA_LABEL = 'Cargar archivo CSV de ECG';

function getInput(): HTMLInputElement {
  return screen.getByLabelText(ARIA_LABEL) as HTMLInputElement;
}

/**
 * Crea un `File` con un método `text()` que resuelve al contenido.
 * jsdom 25 no implementa `Blob.prototype.text()`, así que lo proveemos aquí
 * (el componente usa el `file.text()` estándar, disponible en navegadores reales).
 */
function makeCsvFile(content: string, name = 'ecg.csv'): File {
  const file = new File([content], name, { type: 'text/csv' });
  Object.defineProperty(file, 'text', {
    value: () => Promise.resolve(content),
    configurable: true,
    writable: true,
  });
  return file;
}

beforeEach(() => {
  useSignalStore.getState().reset();
});

afterEach(() => {
  vi.restoreAllMocks();
});

describe('CsvUpload — AC-01 (selección dispara lectura y parseo)', () => {
  it('al seleccionar un archivo válido lee el contenido y puebla el store', async () => {
    render(<CsvUpload />);
    const csv = 'tiempo,mV\n0,-0.085\n0.002,-0.05';
    const file = makeCsvFile(csv);
    const textSpy = vi.spyOn(file, 'text');

    fireEvent.change(getInput(), { target: { files: [file] } });

    // Se disparó la lectura del archivo.
    await screen.findByText(/Señal cargada/i);
    expect(textSpy).toHaveBeenCalledTimes(1);
    // Se pobló el store con la señal parseada.
    const state = useSignalStore.getState();
    expect(state.status).toBe('loaded');
    expect(state.signal).not.toBeNull();
    expect(state.signal?.samples).toHaveLength(2);
  });
});

describe('CsvUpload — AC-02 / AC-03 (CSV válido: señal en store + éxito visible)', () => {
  it('deja la señal ordenada en el store y muestra la indicación de éxito', async () => {
    render(<CsvUpload />);
    const csv = 'tiempo,mV\n0,-0.085\n0.002,-0.05\n0.004,0.1';
    const file = makeCsvFile(csv);

    fireEvent.change(getInput(), { target: { files: [file] } });

    // Indicación de éxito visible (FR-06, AC-03) con el número de muestras.
    await screen.findByText(/3 muestras/i);
    const state = useSignalStore.getState();
    expect(state.signal?.samples).toEqual([
      { t: 0, mV: -0.085 },
      { t: 0.002, mV: -0.05 },
      { t: 0.004, mV: 0.1 },
    ]);
  });
});

describe('CsvUpload — AC-04 (CSV inválido: error visible y sin señal)', () => {
  it('muestra mensaje de error y no deja señal en el store ante un valor no numérico', async () => {
    render(<CsvUpload />);
    const csv = 'tiempo,mV\n0,-0.085\n0.002,abc';
    const file = makeCsvFile(csv);

    fireEvent.change(getInput(), { target: { files: [file] } });

    await screen.findByText(/no numérico/i);
    const state = useSignalStore.getState();
    expect(state.status).toBe('error');
    expect(state.signal).toBeNull();
  });
});

describe('CsvUpload — AC-05 (multicanal: mensaje de un solo canal)', () => {
  it('muestra "solo se soporta un canal" y no procesa un CSV de 3+ columnas', async () => {
    render(<CsvUpload />);
    const csv = 'tiempo,mV1,mV2\n0,-0.085,0.1\n0.002,-0.05,0.2';
    const file = makeCsvFile(csv);

    fireEvent.change(getInput(), { target: { files: [file] } });

    await screen.findByText(/solo se soporta un canal/i);
    const state = useSignalStore.getState();
    expect(state.signal).toBeNull();
  });
});

describe('CsvUpload — file-too-large (R1: guardia de tamaño antes de leer)', () => {
  it('muestra el mensaje de tamaño y NO lee ni parsea cuando el archivo supera 25 MB', async () => {
    render(<CsvUpload />);
    const file = makeCsvFile('x', 'big.csv');
    Object.defineProperty(file, 'size', { value: 26 * 1024 * 1024 });
    const textSpy = vi.spyOn(file, 'text');

    fireEvent.change(getInput(), { target: { files: [file] } });

    await screen.findByText(/25 MB/i);
    // No se leyó el archivo.
    expect(textSpy).not.toHaveBeenCalled();
    expect(useSignalStore.getState().signal).toBeNull();
  });
});

describe('CsvUpload — read-error (fallo de file.text)', () => {
  it('muestra el mensaje de lectura y no ingresa señal cuando file.text() rechaza', async () => {
    render(<CsvUpload />);
    const file = makeCsvFile('whatever');
    vi.spyOn(file, 'text').mockRejectedValue(new Error('boom'));

    fireEvent.change(getInput(), { target: { files: [file] } });

    await screen.findByText(/no se pudo leer/i);
    expect(useSignalStore.getState().signal).toBeNull();
  });
});

describe('CsvUpload — R2 (XSS: mensaje fijo, sin bytes crudos ni HTML)', () => {
  it('no refleja el contenido crudo del archivo ni inyecta HTML en el mensaje de error', async () => {
    const { container } = render(<CsvUpload />);
    const payload = '<img src=x onerror=alert(1)>';
    const csv = `tiempo,mV\n0,${payload}`;
    const file = makeCsvFile(csv);

    fireEvent.change(getInput(), { target: { files: [file] } });

    // Se muestra el mensaje fijo por tipo (non-numeric), no el contenido del archivo.
    await screen.findByText(/no numérico/i);
    // El payload crudo NO aparece en el DOM (ni como texto ni como HTML inyectado).
    expect(screen.queryByText(new RegExp(payload))).toBeNull();
    expect(container.querySelector('img')).toBeNull();
    expect(container.innerHTML).not.toContain('onerror=alert(1)');
  });
});
