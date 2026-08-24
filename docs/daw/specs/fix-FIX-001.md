# Fix-plan FIX-001: Cursores custom para Regla y Recorte

| Field | Value |
|-------|-------|
| Ticket | FIX-001 |
| Tier | FIX |
| RCA | docs/daw/specs/rca-FIX-001.md |
| Date | 2026-08-24 |
| Spec loops | 0 |

## Problem

Las herramientas "Regla" (`activeTool === 'ruler'`) y "Recorte" (`activeTool === 'crop'`) no cambian
la forma del cursor del mouse mientras están activas, a diferencia de "Zoom" (`activeTool ===
'zoom'`), que sí aplica `cursor-zoom-in`. Esto contradice AC-08/AC-11/AC-12 del PRD maestro
(`docs/daw/prd/PRD.md`) y, tras esta corrección, AC-07 de `prd-FEAT-004.md` y AC-08 de
`prd-FEAT-005.md` (ambos PRDs actualizados en la fase DEFINE de este ticket).

## Root cause

Ver `docs/daw/specs/rca-FIX-001.md`: al escribir los PRD de FEAT-004/FEAT-005, el requisito del PRD
maestro "el cursor toma forma de X" (cambio visual del puntero) se reinterpretó como "posición
actual del cursor" (seguimiento de coordenadas), perdiendo silenciosamente el requisito visual. El
código nunca lo implementó porque ningún PRD/spec de ticket se lo exigió explícitamente.

## Solución — pasos

1. `src/frontend/src/components/ECGChart.tsx:273-276` — extender la expresión `cn(...)` del
   `className` del contenedor del gráfico para agregar `activeTool === 'ruler' &&
   'cursor-crosshair'` y `activeTool === 'crop' && 'cursor-crosshair'`, junto a la condición
   existente de `'zoom'`. Decisión de diseño (confirmada con el usuario en PLAN): ambas herramientas
   usan `cursor-crosshair` (cruz), el cursor estándar de CSS/Tailwind para herramientas de
   precisión/medición — no se crea un cursor SVG custom para "tijera" ni para "regla", ya que
   ninguna de las dos formas tiene un keyword nativo de CSS y el usuario optó por la opción más
   simple (sin assets nuevos) en vez de diferenciar visualmente Regla de Recorte.

## Dependencies between steps

Ninguna — es un único cambio atómico en una sola línea de un único archivo.

## Error handling

No aplica — `activeTool` es un enum (`ChartTool`) ya validado por TypeScript en tiempo de
compilación; no hay ninguna condición de error nueva ni entrada externa involucrada.

## Tests

- [ ] **Regression test**: en `ECGChart.test.tsx`, agregar un test análogo al existente para Zoom
      (línea 109, `expect(container.className).toContain('cursor-zoom-in')` bajo `activeTool ===
      'zoom'`): con `activeTool === 'ruler'`, `container.className` debe contener
      `'cursor-crosshair'`; este test debe **fallar antes** del fix (el código actual no aplica
      ninguna clase de cursor para `'ruler'`) y **pasar después**.
- [ ] Mismo test para `activeTool === 'crop'` → `container.className` contiene `'cursor-crosshair'`.
- [ ] Regresión: el test existente de `cursor-zoom-in` bajo `activeTool === 'zoom'` (línea 109) sigue
      pasando sin cambios — la nueva condición no debe alterar el caso Zoom.
- [ ] Regresión: con `activeTool === 'mark'` o `activeTool === 'none'`, `container.className` NO
      contiene `cursor-crosshair` ni `cursor-zoom-in` (ningún cursor especial cuando no corresponde).

## Regression risk

**Low.** El cambio es una condición adicional dentro de una expresión `cn(...)` ya existente, sobre
un enum cerrado (`ChartTool`) sin relación con lógica de negocio, cálculo de señal, ni estado
persistente. El impact scan de PLAN confirmó: sin siblings, sin callers adicionales, sin exports
afectados, sin uso previo de `cursor-crosshair` en el proyecto (primera vez, pero es un utility
class estándar de Tailwind, disponible sin configuración adicional). Único riesgo teórico: que el
test existente de `cursor-zoom-in` (línea 109) deje de pasar si la nueva condición se escribe mal
(p. ej. aplicando `cursor-crosshair` también cuando `activeTool === 'zoom'`) — mitigado por el test
de regresión explícito arriba.

## Rollback plan

- Steps: trivial — revertir el commit de este fix (una sola línea modificada en `ECGChart.tsx` más
  los tests agregados en `ECGChart.test.tsx`). No hay migración de datos, no hay estado persistente
  afectado, no hay dependencia de ningún otro cambio.
- Indicators: si el nuevo cursor genera confusión visual reportada por usuarios (por ejemplo, no
  distinguir Regla de Recorte al ser el mismo `cursor-crosshair`), revertir y reabrir el ticket para
  evaluar cursores diferenciados (ya descartado en esta ronda, ver Solución).
