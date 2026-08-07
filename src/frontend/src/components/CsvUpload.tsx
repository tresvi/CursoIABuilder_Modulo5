import { useCallback, useId, useState } from 'react';
import { cn } from '@/lib/utils';
import { useSignalStore, type SignalError } from '@/state/signalStore';

/** Límite de tamaño de archivo antes de leer/parsear (mitigación R1 del threat model). */
const MAX_FILE_SIZE = 25 * 1024 * 1024; // 25 MB

/**
 * Mapea un error de carga a un mensaje legible FIJO por tipo (mitigación R2 / XSS).
 * Nunca incrusta contenido crudo del archivo: solo texto constante y, a lo sumo,
 * un número de fila calculado por el parser. Sin `dangerouslySetInnerHTML`.
 */
function errorMessage(error: SignalError): string {
  if (error === 'file-too-large') {
    return 'El archivo supera el tamaño máximo permitido de 25 MB.';
  }
  if (error === 'read-error') {
    return 'No se pudo leer el archivo. Intente nuevamente.';
  }
  switch (error.kind) {
    case 'too-few-columns':
      return 'El archivo debe tener dos columnas: tiempo y mV.';
    case 'multichannel':
      return 'El archivo tiene más de un canal; solo se soporta un canal.';
    case 'non-numeric':
      return `El archivo contiene un valor no numérico en la fila ${error.row}.`;
    case 'no-data':
      return 'El archivo no contiene filas de datos.';
    case 'inconsistent-columns':
      return `El archivo tiene filas con distinta cantidad de columnas (fila ${error.row}).`;
  }
}

/**
 * UI de carga de la señal ECG (RF-01, FR-01/FR-06). Input de archivo nativo estilado
 * con `aria-label` + zona de arrastre; valida tamaño antes de leer, lee el `File` con
 * `file.text()` y delega el parseo en el store. Renderiza éxito o error (texto fijo).
 */
export function CsvUpload() {
  const status = useSignalStore((s) => s.status);
  const signal = useSignalStore((s) => s.signal);
  const error = useSignalStore((s) => s.error);
  const loadFromText = useSignalStore((s) => s.loadFromText);
  const setError = useSignalStore((s) => s.setError);

  const [isDragging, setIsDragging] = useState(false);
  const inputId = useId();

  const handleFile = useCallback(
    async (file: File) => {
      // (1) Guardia de tamaño ANTES de leer o parsear (R1).
      if (file.size > MAX_FILE_SIZE) {
        setError('file-too-large');
        return;
      }
      // (2) Lectura del archivo; ante fallo, error de lectura genérico.
      let text: string;
      try {
        text = await file.text();
      } catch {
        setError('read-error');
        return;
      }
      // (3) Parseo/validación de dominio en el store.
      loadFromText(text);
    },
    [loadFromText, setError],
  );

  const handleInputChange = useCallback(
    (event: React.ChangeEvent<HTMLInputElement>) => {
      const file = event.target.files?.[0];
      if (file) {
        void handleFile(file);
      }
    },
    [handleFile],
  );

  const handleDrop = useCallback(
    (event: React.DragEvent<HTMLDivElement>) => {
      event.preventDefault();
      setIsDragging(false);
      const file = event.dataTransfer.files?.[0];
      if (file) {
        void handleFile(file);
      }
    },
    [handleFile],
  );

  const handleDragOver = useCallback((event: React.DragEvent<HTMLDivElement>) => {
    event.preventDefault();
    setIsDragging(true);
  }, []);

  const handleDragLeave = useCallback(() => {
    setIsDragging(false);
  }, []);

  return (
    <section className="mx-auto flex max-w-xl flex-col gap-4">
      <div
        onDrop={handleDrop}
        onDragOver={handleDragOver}
        onDragLeave={handleDragLeave}
        className={cn(
          'flex flex-col items-center gap-3 rounded-lg border-2 border-dashed p-8 text-center transition-colors',
          isDragging ? 'border-sky-500 bg-sky-50' : 'border-slate-300 bg-slate-50',
        )}
      >
        <p className="text-sm text-slate-600">
          Arrastrá un archivo CSV de ECG aquí, o seleccionalo:
        </p>
        <label
          htmlFor={inputId}
          className="cursor-pointer text-sm font-medium text-sky-700 underline"
        >
          Elegir archivo
        </label>
        <input
          id={inputId}
          type="file"
          accept=".csv,text/csv"
          aria-label="Cargar archivo CSV de ECG"
          onChange={handleInputChange}
          className="block w-full text-sm text-slate-700 file:mr-3 file:rounded file:border-0 file:bg-sky-600 file:px-3 file:py-1.5 file:text-white hover:file:bg-sky-700"
        />
      </div>

      {status === 'loaded' && signal && (
        <p
          role="status"
          className="rounded-md border border-emerald-300 bg-emerald-50 px-4 py-2 text-sm font-medium text-emerald-800"
        >
          Señal cargada: {signal.samples.length} muestras.
        </p>
      )}

      {status === 'error' && error && (
        <p
          role="alert"
          className="rounded-md border border-red-300 bg-red-50 px-4 py-2 text-sm font-medium text-red-800"
        >
          {errorMessage(error)}
        </p>
      )}
    </section>
  );
}
