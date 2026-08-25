# RCA FIX-002: Regla — limpiar overlay en cada arrastre + selección rectangular

| Field | Value |
|-------|-------|
| Ticket | FIX-002 |
| Date | 2026-08-25 |

## Síntoma

Al medir con la herramienta "Regla" activa, cada posición del mouse durante el arrastre deja su
línea y tooltip dibujados encima de los anteriores en el canvas overlay, en vez de reemplazar la
medición previa. El resultado visual es una acumulación de líneas y textos superpuestos a medida
que el usuario mueve el mouse. Además, el usuario pidió que la selección se muestre como un
rectángulo (como ya hacen Zoom y Recorte), no como una línea diagonal entre los dos puntos.

## Causa raíz

`drawRuler` (`src/frontend/src/components/render/drawOverlay.ts:45-77`) dibuja directamente sobre
el contexto del canvas overlay sin llamar a `clearOverlay` antes, a diferencia de `drawSelection`
(usada por Zoom y Recorte), que sí limpia el overlay como primer paso (`drawOverlay.ts:22`,
`clearOverlay(ctx, dims)`). Como `onMouseMove` en `ECGChart.tsx` (línea ~134) invoca `drawRuler` en
cada evento de movimiento del mouse durante el arrastre, sin limpiar el overlay antes, cada llamada
agrega su propia línea+tooltip al canvas en vez de reemplazar el dibujo anterior.

Este comportamiento ya contradice el AC-03 actual del PRD ("dejar visible el resultado de la última
medición" — no de todas las intermedias), así que la acumulación es un defecto de implementación,
no una ambigüedad del PRD.

Separadamente, el pedido de cambiar la forma de línea a rectángulo es una decisión de diseño
explícita del usuario, no derivada de un bug — pero como el PRD actual especifica literalmente
"línea + tooltip" (FR-02/FR-03), ese cambio requiere actualizar el PRD antes de tocar código (ya
resuelto en PRD loop 2 de `prd-FEAT-004.md`, ver DEFINE de este ticket).

## Affected component

- `src/frontend/src/components/render/drawOverlay.ts`: `drawRuler` (falta el `clearOverlay` inicial
  y dibuja una línea en vez de un rectángulo).
- `src/frontend/src/components/ECGChart.tsx`: `onMouseMove`, invoca `drawRuler` — no necesita
  cambios propios más allá de pasarle los mismos argumentos, ya que el fix vive dentro de
  `drawRuler`.

## Related PRD

- `docs/daw/prd/prd-FEAT-004.md`: FR-02/FR-03/AC-02/AC-03. **Ya actualizado** (PRD loop 2) en la
  fase DEFINE de este ticket: se reemplazó "línea + tooltip" por "rectángulo + tooltip" y se
  documentó explícitamente que no debe acumular dibujos previos de la misma medición.

## Gap in the PRD

Sí — ya resuelto (ver arriba). El usuario aprobó la actualización antes de continuar con el
fix-plan.

## Confirmación

Análisis confirmado por el usuario el 2026-08-25.
