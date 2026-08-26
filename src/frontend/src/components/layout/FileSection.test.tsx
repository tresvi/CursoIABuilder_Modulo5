import { describe, it, expect, beforeEach } from 'vitest';
import { render, screen, fireEvent, within } from '@testing-library/react';
import { FileSection } from './FileSection';
import { DisabledMenuItem } from './DisabledMenuItem';
import { useMarkersStore } from '@/state/markersStore';
import { useSignalStore } from '@/state/signalStore';
import { useViewStore } from '@/state/viewStore';

/** Ítems de RF-12/13/15: visibles en la sección pero deshabilitados (FR-08, AC-02). */
const DISABLED_ITEMS = ['Importar XLSX', 'Guardar', 'Guardar como CSV', 'Exportar XLSX'];

/** La sección "Archivo" como landmark, para aserir "dentro de la sección". */
function fileSection(): HTMLElement {
  return screen.getByRole('region', { name: 'Archivo' });
}

/**
 * Crea un `File` con un método `text()` que resuelve al contenido: jsdom no
 * implementa `Blob.prototype.text()` (mismo helper que `CsvUpload.test.tsx`).
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
  useViewStore.getState().reset();
  useMarkersStore.setState({ markers: [], formState: null });
});

describe('FileSection — acciones de la sección "Archivo" (FEAT-009, Block 4)', () => {
  it('muestra "Abrir CSV" habilitado y los cuatro ítems de RF-12/13/15 deshabilitados (AC-02 parcial: "Cargar ejemplo" se cubre en Block 5)', () => {
    render(<FileSection />);
    const section = within(fileSection());

    // "Abrir CSV": el control real habilitado es el input de archivo de CsvUpload.
    expect(section.getByText('Abrir CSV')).toBeInTheDocument();
    expect(section.getByLabelText('Cargar archivo CSV de ECG')).toBeEnabled();

    // "Abrir CSV" no es un encabezado: el outline del documento va h1 "ECGViewer"
    // (Sidebar) → h2 "Trazado ECG" (TopBar) y un h3 aquí lo rompería (heading-order,
    // WCAG 1.3.1). El input ya tiene nombre accesible propio.
    expect(section.queryByRole('heading')).toBeNull();

    // "Cargar ejemplo" (FR-07) lo monta el Block 5 en el hueco reservado de esta
    // sección; su aserción de "habilitado" se agrega ahí junto con `ExampleLoader`.

    for (const label of DISABLED_ITEMS) {
      const item = section.getByRole('button', { name: label });
      expect(item).toBeDisabled();
      expect(item).toHaveAttribute('aria-disabled', 'true');
      expect(item).toHaveAttribute('title', 'No disponible todavía');
    }

    // Exactamente 4 ítems deshabilitados: ningún control habilitado de más ni de menos.
    const disabled = section.getAllByRole('button').filter((b) => b.hasAttribute('disabled'));
    expect(disabled).toHaveLength(DISABLED_ITEMS.length);
  });

  it('un clic sobre un ítem deshabilitado no dispara ninguna acción ni cambia el estado (AC-08)', () => {
    render(<FileSection />);
    const section = within(fileSection());

    // Zustand reemplaza el objeto de estado en cada `set`: comparar por identidad
    // detecta cualquier mutación, aunque el valor final coincida.
    const signalBefore = useSignalStore.getState();
    const viewBefore = useViewStore.getState();
    const markersBefore = useMarkersStore.getState();

    // React solo suprime los eventos de MOUSE sobre elementos deshabilitados
    // (`shouldPreventMouseEvent`): un `onKeyDown`/`onFocus` sí se dispararía, así que
    // hay que ejercitar también esos caminos.
    for (const label of DISABLED_ITEMS) {
      const btn = section.getByRole('button', { name: label });
      fireEvent.click(btn);
      fireEvent.keyDown(btn, { key: 'Enter' });
      fireEvent.focus(btn);
    }

    expect(useSignalStore.getState()).toBe(signalBefore);
    expect(useViewStore.getState()).toBe(viewBefore);
    expect(useMarkersStore.getState()).toBe(markersBefore);

    // Y siguen visualmente deshabilitados tras el clic.
    for (const label of DISABLED_ITEMS) {
      expect(section.getByRole('button', { name: label })).toBeDisabled();
    }
  });

  it('un CSV multicanal muestra el mensaje de error dentro de la sección', async () => {
    render(<FileSection />);
    const section = within(fileSection());

    const file = makeCsvFile('tiempo,mV1,mV2\n0,-0.085,0.1\n0.002,-0.05,0.2');
    fireEvent.change(section.getByLabelText('Cargar archivo CSV de ECG'), {
      target: { files: [file] },
    });

    const alert = await section.findByRole('alert');
    expect(alert).toHaveTextContent(/solo se soporta un canal/i);
    expect(useSignalStore.getState().signal).toBeNull();
  });

  it('DisabledMenuItem no admite handlers en sus props (guarda de compilación de R-04)', () => {
    // Guarda de tipos, no de runtime: si alguien ensancha `DisabledMenuItemProps` con
    // `onClick?: () => void`, el `@ts-expect-error` queda sin usar y `tsc --noEmit`
    // (npm run build) falla. Ningún test conductual puede cubrir esto: React nunca
    // entrega eventos de mouse a un elemento deshabilitado.
    // @ts-expect-error DisabledMenuItem no acepta handlers: es la mitigación de R-04
    void (<DisabledMenuItem label="x" onClick={() => {}} />);
  });
});
