import { useState } from 'react';
import { useMarkersStore } from '@/state/markersStore';
import { formatMarkerTime } from '@/lib/ecg/chart/format';
import { ConfirmDialog } from '@/components/ConfirmDialog';

/**
 * Panel colapsable con la lista de marcadores (FEAT-003a, Block 6).
 * El orden cronológico se deriva acá (no en el store, ver `markersStore`) para no
 * pagar el costo de un `sort()` en cada `addMarker`.
 * `label` se renderiza vía interpolación JSX estándar, nunca `dangerouslySetInnerHTML`
 * — mitigación de XSS obligatoria (docs/daw/security/threat-FEAT-003a.md).
 *
 * Botones "Editar"/"Eliminar" por ítem (FEAT-003b, Block 4): "Editar" llama
 * `openEditForm` (el `MarkerForm` autosuficiente, montado en `App.tsx`, se abre solo).
 * "Eliminar" fija `deletingId` (estado local, no del store: es solo "qué ConfirmDialog
 * está abierto en esta lista", nada que otro componente necesite leer), que controla un
 * único `ConfirmDialog` renderizado una vez para toda la lista.
 */
export function MarkerList() {
  const markers = useMarkersStore((s) => s.markers);
  const sortedMarkers = [...markers].sort((a, b) => a.time - b.time);
  const [deletingId, setDeletingId] = useState<string | null>(null);

  const deletingMarker = markers.find((m) => m.id === deletingId);

  const handleConfirmDelete = () => {
    if (deletingId !== null) useMarkersStore.getState().removeMarker(deletingId);
    setDeletingId(null);
  };

  const handleCancelDelete = () => {
    setDeletingId(null);
  };

  return (
    <details open className="rounded-md border border-slate-300 bg-white p-3">
      <summary className="cursor-pointer text-sm font-medium text-slate-700">
        Marcadores ({sortedMarkers.length})
      </summary>

      <ul className="mt-2 flex flex-col gap-1">
        {sortedMarkers.map((marker) => (
          <li
            key={marker.id}
            className="flex items-center gap-3 border-b border-slate-100 py-1 text-sm text-slate-700 last:border-b-0"
          >
            <span className="font-mono text-slate-500">{formatMarkerTime(marker.time)}</span>
            <span className="flex-1">{marker.label ?? 'Sin etiqueta'}</span>
            <button
              type="button"
              aria-label={`Editar marcador en ${formatMarkerTime(marker.time)}`}
              onClick={() => useMarkersStore.getState().openEditForm(marker.id)}
              className="rounded-md border border-slate-300 bg-white px-2 py-1 text-xs font-medium text-slate-700 hover:bg-slate-50"
            >
              Editar
            </button>
            <button
              type="button"
              aria-label={`Eliminar marcador en ${formatMarkerTime(marker.time)}`}
              onClick={() => setDeletingId(marker.id)}
              className="rounded-md border border-red-300 bg-white px-2 py-1 text-xs font-medium text-red-700 hover:bg-red-50"
            >
              Eliminar
            </button>
          </li>
        ))}
      </ul>

      <ConfirmDialog
        open={deletingId !== null}
        title="Eliminar marcador"
        description={`¿Eliminar el marcador "${deletingMarker?.label ?? 'sin etiqueta'}"?`}
        onConfirm={handleConfirmDelete}
        onCancel={handleCancelDelete}
      />
    </details>
  );
}
