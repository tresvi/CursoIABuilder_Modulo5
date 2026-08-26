import type { SignalError } from '@/state/signalStore';

/**
 * Mapea un error de carga a un mensaje legible FIJO por tipo (mitigación R2 / XSS).
 * Nunca incrusta contenido crudo del archivo: solo texto constante y, a lo sumo,
 * un número de fila calculado por el parser. Sin `dangerouslySetInnerHTML`.
 *
 * Compartido por `CsvUpload` ("Abrir CSV") y `ExampleLoader` ("Cargar ejemplo") para
 * que un fallo de red al traer un ejemplo reuse el texto de `read-error` en vez de
 * agregar una variante nueva a `SignalError` (FEAT-009, decisión de diseño 2).
 */
export function signalErrorMessage(error: SignalError): string {
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
