import { useCallback, useState } from 'react';
import { EXAMPLE_SAMPLES, exampleFileName, fetchExampleSample } from '@/lib/ecg/samples';
import { signalErrorMessage } from '@/lib/ecg/signalErrorMessage';
import { useSignalStore, type SignalError } from '@/state/signalStore';

/** Valor del `<option>` placeholder: el control vuelve acá después de cada carga. */
const PLACEHOLDER = '';

export interface ExampleLoaderProps {
  /**
   * Si el componente renderiza su propia alerta de error. Es **requerida y sin valor
   * por defecto**: cada punto de montaje tiene que decidir explícitamente quién es el
   * dueño del mensaje, y `tsc --noEmit` no compila si alguien lo omite (misma guarda
   * de compilación que usa `DisabledMenuItem`). Con un default en `true`, un montaje
   * nuevo duplicaría la alerta en silencio.
   *
   * Va en `false` cuando otro componente del mismo contexto ya muestra el error del
   * store — es el caso de la sección "Archivo", donde el dueño del mensaje es
   * `CsvUpload` (Block 4, "Error handling"). Dos `role="alert"` con el mismo texto se
   * anuncian dos veces.
   */
  showError: boolean;
}

/**
 * Control "Cargar ejemplo" (FEAT-009, FR-07): `<select>` nativo con `aria-label`
 * (decisión de diseño 3, patrón de `FilterPanel`) que ofrece las 3 señales del
 * catálogo `EXAMPLE_SAMPLES`.
 *
 * Al elegir una: deshabilita el control mientras carga, trae el CSV con
 * `fetchExampleSample` (ruta literal de la lista blanca, R-07) y lo entrega a
 * `loadFromText`, es decir al MISMO `parseCsv` que usa "Abrir CSV" (R-08): el texto
 * descargado no se convierte en señal sin validar. Ante un fallo de red reutiliza
 * `setError('read-error')` en vez de una variante nueva de `SignalError` (decisión de
 * diseño 2), lo que además deja `signal` en `null`: nunca queda una señal parcial
 * (AC-09).
 *
 * El mensaje de error NO se copia a estado local: se deriva del store, así desaparece
 * solo en cuanto el store sale de `error` (una carga posterior exitosa no puede dejar
 * una alerta obsoleta al lado de la señal cargada).
 *
 * La atribución del error se hace **por valor, no por un flag booleano**: se guarda el
 * `SignalError` que quedó en el store inmediatamente después del intento propio, y la
 * alerta se deriva sólo mientras el error actual del store siga siendo ESE mismo valor.
 * Un flag que se enciende al fallar no se puede apagar cuando el store pasa de `error`
 * a `error` por causa ajena, y el control termina anunciando un fallo que no originó.
 *
 * **Limitación conocida:** la comparación distingue errores de tipos distintos (los del
 * parser son objetos nuevos en cada parseo, y `'read-error'` no es igual a
 * `{ kind: 'multichannel' }`), pero NO puede distinguir dos errores del mismo literal de
 * string: si otro control produce su propio `'read-error'`, este control lo toma como
 * propio. La solución de fondo es un token de secuencia (`errorSeq`) en `signalStore`
 * contra el que comparar el del intento propio; exige tocar `signalStore.ts`, fuera de
 * la lista de archivos del Block 5, y queda anotada en `docs/BACKLOG.md`.
 */
export function ExampleLoader({ showError }: ExampleLoaderProps) {
  const loadFromText = useSignalStore((s) => s.loadFromText);
  const setError = useSignalStore((s) => s.setError);
  const status = useSignalStore((s) => s.status);
  const error = useSignalStore((s) => s.error);

  const [isLoading, setIsLoading] = useState(false);
  /** Error que quedó en el store tras el último intento de ESTE control; `null` si no
   * falló (o si todavía no hubo intento). Es el valor con el que se atribuye la alerta. */
  const [attemptError, setAttemptError] = useState<SignalError | null>(null);

  const loadSample = useCallback(
    async (id: string) => {
      const sample = EXAMPLE_SAMPLES.find((candidate) => candidate.id === id);
      // Id fuera del catálogo: inalcanzable desde el `<select>`; se ignora sin tocar
      // el estado (la lista blanca real vive en `fetchExampleSample`, R-07).
      if (!sample) return;

      setIsLoading(true);
      // Cada intento empieza sin error propio atribuido.
      setAttemptError(null);
      try {
        const result = await fetchExampleSample(sample.id);
        if (!result.ok) {
          setError('read-error');
          setAttemptError(useSignalStore.getState().error);
          return;
        }
        // El texto viaja al store sin tocar: el parseo y la validación de dominio
        // son los de "Abrir CSV".
        loadFromText(result.text, exampleFileName(sample));
        // Si el CSV descargado no supera `parseCsv`, el error del parser también es
        // de este intento; si cargó bien, `error` es `null` y no hay nada que atribuir.
        setAttemptError(useSignalStore.getState().error);
      } finally {
        setIsLoading(false);
      }
    },
    [loadFromText, setError],
  );

  const handleChange = useCallback(
    (event: React.ChangeEvent<HTMLSelectElement>) => {
      const id = event.target.value;
      if (id === PLACEHOLDER) return;
      void loadSample(id);
    },
    [loadSample],
  );

  // El error del store es propio sólo mientras siga siendo el mismo valor que dejó el
  // intento de este control: un error ajeno (otro tipo, u otro objeto del parser) no
  // satisface la igualdad y deja de mostrarse sin necesidad de limpiar nada.
  const ownsError = attemptError !== null && error === attemptError;
  const errorText = ownsError && status === 'error' && error ? signalErrorMessage(error) : null;

  return (
    <div className="flex flex-col gap-2">
      <select
        aria-label="Cargar ejemplo"
        value={PLACEHOLDER}
        disabled={isLoading}
        onChange={handleChange}
        className="rounded-md border border-slate-300 bg-white px-2 py-1.5 text-sm text-slate-700 disabled:opacity-60"
      >
        <option value={PLACEHOLDER}>
          {isLoading ? 'Cargando…' : 'Elegí una señal de ejemplo…'}
        </option>
        {EXAMPLE_SAMPLES.map((sample) => (
          <option key={sample.id} value={sample.id}>
            {sample.label}
          </option>
        ))}
      </select>

      {showError && errorText && (
        <p
          role="alert"
          className="rounded-md border border-red-300 bg-red-50 px-3 py-1.5 text-sm font-medium text-red-800"
        >
          {errorText}
        </p>
      )}
    </div>
  );
}
