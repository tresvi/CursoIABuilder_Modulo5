import { useSignalStore } from '@/state/signalStore';
import { signalDurationSeconds } from '@/lib/ecg/duration';

/** Texto mostrado cuando no hay archivo cargado o la carga no trajo nombre. */
const NO_FILE = 'sin archivo';
/** Marcador de duración indefinida (señal ausente o con menos de 2 muestras). */
const NO_DURATION = '—';

/**
 * Encabezado del panel principal (FEAT-009, Block 2 — FR-09): título "Trazado ECG",
 * nombre del archivo cargado y duración de la señal.
 *
 * El título es `h2` a propósito: el `h1` de la app es "ECGViewer", en el `Sidebar`.
 * El nombre del archivo se interpola en JSX —React lo escapa— y nunca se usa para
 * construir rutas ni operaciones de filesystem (mitigación R-02 del threat model).
 */
export function TopBar() {
  const signal = useSignalStore((s) => s.signal);
  const fileName = useSignalStore((s) => s.fileName);

  // Sin señal (estado inicial o tras un error de carga, que deja `signal` en `null`)
  // no hay archivo del que informar, aunque quedara un nombre en el store.
  const durationSeconds = signal ? signalDurationSeconds(signal) : null;
  const displayName = signal ? (fileName ?? NO_FILE) : NO_FILE;
  const displayDuration =
    durationSeconds === null ? NO_DURATION : `${durationSeconds.toFixed(1)} s`;

  return (
    <section
      aria-label="Resumen de la señal"
      className="mb-4 flex flex-col gap-1 border-b border-slate-300 pb-3"
    >
      <h2 className="text-xl font-semibold text-slate-800">Trazado ECG</h2>
      <p className="text-sm text-slate-600">
        <span aria-label="Archivo cargado" className="font-medium">
          {displayName}
        </span>
        <span aria-hidden="true"> · </span>
        <span aria-label="Duración de la señal" className="font-mono">
          {displayDuration}
        </span>
      </p>
    </section>
  );
}
