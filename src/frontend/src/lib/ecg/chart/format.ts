/**
 * Formateo de tiempo compartido entre `MarkerForm` (Block 4) y `MarkerList`
 * (Block 6), para no duplicar la lógica de presentación del instante de un marcador.
 */

/** Formatea `time` (segundos) como `mm:ss.cc` (minutos:segundos.centésimas). */
export function formatMarkerTime(time: number): string {
  const totalCentis = Math.round(time * 100);
  const minutes = Math.floor(totalCentis / 6000);
  const seconds = Math.floor((totalCentis % 6000) / 100);
  const centis = totalCentis % 100;

  const mm = String(minutes).padStart(2, '0');
  const ss = String(seconds).padStart(2, '0');
  const cc = String(centis).padStart(2, '0');
  return `${mm}:${ss}.${cc}`;
}
