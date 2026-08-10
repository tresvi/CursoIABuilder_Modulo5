/**
 * Tipos de la capa de lógica pura del gráfico ECG (FEAT-002, Block 1).
 * Todos son estructuras de datos planas: no dependen de Canvas ni del DOM.
 */

/** Ventana temporal visible, en segundos. `fromTime < toTime` cuando es válida. */
export type TimeWindow = { fromTime: number; toTime: number };

/**
 * Dimensiones del lienzo y su padding. El área de dibujo real es
 * `[padding.left, width - padding.right]` en X y `[padding.top, height - padding.bottom]` en Y.
 */
export type ChartDims = {
  width: number;
  height: number;
  padding: { top: number; right: number; bottom: number; left: number };
};

/** Rango de amplitud (mV) para el autoescalado del eje Y. */
export type YRange = { min: number; max: number };
