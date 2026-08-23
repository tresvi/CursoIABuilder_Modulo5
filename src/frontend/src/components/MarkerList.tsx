import { useMarkersStore } from '@/state/markersStore';
import { formatMarkerTime } from '@/lib/ecg/chart/format';

/**
 * Panel colapsable con la lista de marcadores (FEAT-003a, Block 6).
 * El orden cronológico se deriva acá (no en el store, ver `markersStore`) para no
 * pagar el costo de un `sort()` en cada `addMarker`.
 * `label` se renderiza vía interpolación JSX estándar, nunca `dangerouslySetInnerHTML`
 * — mitigación de XSS obligatoria (docs/daw/security/threat-FEAT-003a.md).
 */
export function MarkerList() {
  const markers = useMarkersStore((s) => s.markers);
  const sortedMarkers = [...markers].sort((a, b) => a.time - b.time);

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
            <span>{marker.label ?? 'Sin etiqueta'}</span>
          </li>
        ))}
      </ul>
    </details>
  );
}
