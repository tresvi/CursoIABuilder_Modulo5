/**
 * Catálogo de señales ECG de ejemplo (FEAT-009, FR-07) y su descarga.
 *
 * Los archivos se sirven como assets estáticos de Vite desde `public/samples/`; la
 * fuente de verdad es `ECGSamples/CSV/` (ver `public/samples/README.md`).
 */

export interface ExampleSample {
  /** Identificador estable; es el `value` del `<select>` de `ExampleLoader`. */
  id: string;
  /** Rótulo visible en el control. */
  label: string;
  /**
   * Ruta **literal** del asset. Nunca se construye concatenando la entrada del
   * usuario: es la lista blanca que elimina la superficie de path traversal (R-07).
   */
  path: string;
}

/** Resultado de traer un ejemplo: el texto crudo, todavía sin validar (lo valida `parseCsv`). */
export type FetchExampleResult = { ok: true; text: string } | { ok: false };

/**
 * Lista blanca de ejemplos disponibles. Agregar uno nuevo exige copiar el CSV a
 * `public/samples/` y sumar acá su entrada con la ruta escrita literal.
 */
export const EXAMPLE_SAMPLES: readonly ExampleSample[] = [
  {
    id: 'ECG_20_Seg_FILTRADO',
    label: 'ECG_20_Seg_FILTRADO',
    path: '/samples/ECG_20_Seg_FILTRADO.csv',
  },
  {
    id: 'ECG_20_Seg_NO_FILTRADO',
    label: 'ECG_20_Seg_NO_FILTRADO',
    path: '/samples/ECG_20_Seg_NO_FILTRADO.csv',
  },
  {
    id: 'ECG_20_Seg_ESPANTOSO',
    label: 'ECG_20_Seg_ESPANTOSO',
    path: '/samples/ECG_20_Seg_ESPANTOSO.csv',
  },
] as const;

/** Nombre de archivo del ejemplo, derivado de la ruta literal del catálogo (FR-09). */
export function exampleFileName(sample: ExampleSample): string {
  return sample.path.slice(sample.path.lastIndexOf('/') + 1);
}

/**
 * Trae el texto de un ejemplo del catálogo.
 *
 * Mitigación R-07: el id se busca en `EXAMPLE_SAMPLES` y la ruta del `fetch` sale del
 * catálogo, no del argumento. Un id desconocido devuelve `{ ok: false }` **sin emitir
 * ningún fetch**, así que ninguna entrada del usuario puede alcanzar la red.
 *
 * Falla segura: cualquier respuesta con `res.ok === false` (404, 5xx) o un rechazo de
 * la promesa (fallo de red) se colapsa en `{ ok: false }`; el llamador lo traduce a
 * `read-error`. El texto devuelto NO se considera confiable (R-08): debe pasar por
 * `parseCsv` antes de convertirse en señal.
 */
export async function fetchExampleSample(id: string): Promise<FetchExampleResult> {
  const sample = EXAMPLE_SAMPLES.find((candidate) => candidate.id === id);
  if (!sample) {
    return { ok: false };
  }
  try {
    const res = await fetch(sample.path);
    if (!res.ok) {
      return { ok: false };
    }
    return { ok: true, text: await res.text() };
  } catch {
    return { ok: false };
  }
}
