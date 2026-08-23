import { timeToX } from '@/lib/ecg/chart/scale';
import type { ChartDims, Marker, TimeWindow } from '@/lib/ecg/chart/types';

const MARKER_COLOR = '#dc2626';
const MARKER_LABEL_COLOR = '#7f1d1d';

/**
 * Dibuja los marcadores existentes sobre el lienzo BASE (FEAT-003a, Block 5): una línea
 * vertical + un indicador en el instante `time` de cada marcador, convertido a X vía
 * `timeToX`. El texto de `label` se pinta exclusivamente con `ctx.fillText` (API de texto
 * del Canvas) — nunca vía inserción de HTML, mitigación de XSS (threat-FEAT-003a.md).
 */
export function drawMarkers(
  ctx: CanvasRenderingContext2D,
  markers: Marker[],
  window: TimeWindow,
  dims: ChartDims,
): void {
  if (markers.length === 0) return;

  const top = dims.padding.top;
  const bottom = dims.height - dims.padding.bottom;

  ctx.save();
  ctx.strokeStyle = MARKER_COLOR;
  ctx.fillStyle = MARKER_COLOR;
  ctx.lineWidth = 1.5;

  for (const marker of markers) {
    const x = timeToX(marker.time, window, dims);

    ctx.beginPath();
    ctx.moveTo(x, top);
    ctx.lineTo(x, bottom);
    ctx.stroke();

    // Indicador triangular en el tope de la línea.
    ctx.beginPath();
    ctx.moveTo(x - 4, top);
    ctx.lineTo(x + 4, top);
    ctx.lineTo(x, top + 6);
    ctx.fill();
  }

  if (markers.some((m) => m.label)) {
    ctx.fillStyle = MARKER_LABEL_COLOR;
    ctx.font = '10px sans-serif';
    ctx.textAlign = 'center';
    ctx.textBaseline = 'bottom';
    for (const marker of markers) {
      if (!marker.label) continue;
      const x = timeToX(marker.time, window, dims);
      ctx.fillText(marker.label, x, top);
    }
  }

  ctx.restore();
}
