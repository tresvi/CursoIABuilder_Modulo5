import { ECGChart } from '@/components/ECGChart';
import { MarkerForm } from '@/components/MarkerForm';
import { MarkerList } from '@/components/MarkerList';
import { MetricsPanel } from '@/components/MetricsPanel';
import { useSignalStore } from '@/state/signalStore';
import { EmptyState } from './EmptyState';

/**
 * Contenido del panel principal (FEAT-009, Block 6 — FR-05/FR-06).
 *
 * Decide entre los dos estados de la referencia visual según `signalStore.signal`:
 * sin señal, el `EmptyState` con el call-to-action
 * (`docs/UI/UI_Without_any_ECG_Loaded.PNG`); con señal, el trazado a la izquierda y la
 * tarjeta "Métricas" a la derecha, con los marcadores debajo
 * (`docs/UI/UI_With_ECG_Loaded.PNG`).
 *
 * `status === 'error'` no necesita una rama propia: `setError` deja `signal` en `null`,
 * así que prevalece el estado vacío y el mensaje lo muestra el componente que originó
 * la carga (`CsvUpload`, en el sidebar).
 *
 * Sólo se reubican componentes: ni el Canvas 2D de `ECGChart` ni el cálculo de
 * métricas cambian (NFR-01, Principio V de AGENTS.md). `MetricsPanel` sigue
 * devolviendo `null` cuando no hay ventana visible — las métricas se calculan sobre la
 * ventana visible, nunca sobre todo el archivo—, y por eso el título "Métricas" y su
 * columna los aporta este panel: así la tarjeta queda reservada y el layout no salta.
 */
export function MainPanel() {
  const signal = useSignalStore((s) => s.signal);

  return (
    <div className="flex flex-col gap-6">
      {signal === null ? (
        <EmptyState />
      ) : (
        <>
          <div className="grid grid-cols-1 items-start gap-6 xl:grid-cols-[minmax(0,1fr)_16rem]">
            <div className="min-w-0 overflow-x-auto">
              <ECGChart />
            </div>

            {/* Un `<div>`, no un `<section>` con `aria-label`: `MetricsPanel` ya es
                `<section aria-label="Métricas cardíacas">`, así que nombrar también el
                envoltorio dejaría dos landmarks `region` anidados y casi homónimos para
                una sola tarjeta. Este envoltorio existe por layout (reservar la columna
                del grid), no por estructura, y el `<h3>` ya da el nombre visible. */}
            <div className="flex w-full min-w-0 flex-col gap-2">
              <h3 className="text-sm font-semibold text-slate-700">Métricas</h3>
              <MetricsPanel />
            </div>
          </div>

          <MarkerList />
        </>
      )}

      {/* `MarkerForm` queda FUERA de la rama con señal: es un diálogo controlado por
          `markersStore.formState`, no parte del layout, y desmontarlo con la señal
          cerraría en silencio un formulario abierto. Se monta una sola vez, como hasta
          ahora en `App.tsx` (FEAT-003b, Block 5). */}
      <MarkerForm />
    </div>
  );
}
