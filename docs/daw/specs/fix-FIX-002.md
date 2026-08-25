# Fix-plan FIX-002: Regla — limpiar overlay en cada arrastre + selección rectangular

| Field | Value |
|-------|-------|
| Ticket | FIX-002 |
| Tier | FIX |
| RCA | docs/daw/specs/rca-FIX-002.md |
| Date | 2026-08-25 |
| Spec loops | 0 |

## Problem

Al medir con "Regla" activa, cada evento `mousemove` durante el arrastre dibuja su propia
línea+tooltip sobre el canvas overlay sin borrar el dibujo anterior — los labels y líneas se
acumulan visualmente en vez de reemplazarse. Además, el usuario pidió que la selección se muestre
como un rectángulo (como Zoom/Recorte), no como una línea diagonal.

## Root cause

Ver `docs/daw/specs/rca-FIX-002.md`: `drawRuler` (`drawOverlay.ts:45-77`) no llama a `clearOverlay`
antes de dibujar, a diferencia de `drawSelection` que sí lo hace (`drawOverlay.ts:22`). El
`clearOverlay` que ya existe en `ECGChart.tsx` (`onMouseDown`, líneas ~103-109) solo limpia *entre
arrastres*, no *dentro* de un mismo arrastre — por eso el bug persiste pese a ese clear existente.

## Solución — pasos

1. `src/frontend/src/components/render/drawOverlay.ts:45-77` (`drawRuler`):
   - Agregar `clearOverlay(ctx, dims)` como primera línea del cuerpo de la función (mismo patrón
     que `drawSelection`, línea 22).
   - Reemplazar el dibujo de línea diagonal (`ctx.beginPath()/moveTo(x0,y0)/lineTo(x1,y1)/stroke()`)
     por un rectángulo entre `(x0,y0)` y `(x1,y1)`: `loX = Math.min(x0,x1)`, `loY = Math.min(y0,y1)`,
     `width = Math.abs(x1-x0)`, `height = Math.abs(y1-y0)`, luego `ctx.fillRect(loX, loY, width,
     height)` con `fillStyle = SELECTION_FILL` y `ctx.strokeRect(loX, loY, width, height)` con
     `strokeStyle = SELECTION_STROKE`/`lineWidth = 1` — mismo patrón visual que `drawSelection`
     (líneas 29-34), pero acotado a los dos ejes (X e Y) en vez de solo X con altura completa.
   - El dibujo del tooltip (Δt/ΔmV vía `fillText`, líneas 63-75) no cambia.
   - `ECGChart.tsx` no necesita cambios: el único call site (`onMouseMove`, línea 134) mantiene la
     misma firma `drawRuler(ctx, start, startY, x, y, DIMS, deltaT, deltaAmplitude)`.

## Dependencies between steps

Ninguna — es un único cambio atómico dentro de una sola función, en un solo archivo.

## Error handling

No aplica — `drawRuler` sigue siendo una función de dibujo puro que recibe números ya calculados
por el caller; no valida su rango (mismo criterio ya documentado en el JSDoc de `drawOverlay.ts`
desde FEAT-004: cualquier `NaN`/`Infinity` sería un bug del caller, no de esta función).

## Tests

- [ ] **Regression test (accumulation bug)**: en `drawOverlay.test.ts`, con `createCtxStub()`
      extendido para que `clearRect` sea un spy (`vi.fn()`), verificar que `drawRuler` llama a
      `ctx.clearRect` **antes** de `fillRect`/`strokeRect` (orden de llamadas, no solo presencia) —
      este test debe **fallar antes** del fix (hoy `drawRuler` nunca llama `clearRect`) y **pasar
      después**.
- [ ] Reemplazar el test existente "dibuja una línea entre los dos puntos dados"
      (`drawOverlay.test.ts`, actual línea 34) por "dibuja un rectángulo entre los dos puntos
      dados": verificar que `fillRect`/`strokeRect` se llaman con `(loX, loY, width, height)`
      derivados correctamente de `(10,20)`→`(100,200)` (`loX=10, loY=20, width=90, height=180`).
- [ ] Regresión: el test "reusa el color/grosor de trazo de drawSelection..." sigue pasando sin
      cambios (`strokeStyle`/`lineWidth` se siguen fijando igual).
- [ ] Regresión: los tests de tooltip ("pinta el texto Δt/ΔmV...", "con deltaT/deltaAmplitude
      negativos...") siguen pasando sin cambios — no tocan el dibujo de la línea/rectángulo.
- [ ] Regresión: suite completa de `ECGChart.test.tsx` (bloque "FEAT-004 Block 4 (herramienta
      Regla)") sigue pasando sin cambios — ninguno de esos tests depende de `moveTo`/`lineTo`
      internos de `drawRuler`, solo de que se llame con los argumentos correctos.

## Regression risk

**Low.** El cambio está contenido enteramente dentro de `drawRuler`, sin modificar su firma pública
ni el call site en `ECGChart.tsx`. El impact scan de PLAN confirmó: un único caller, ningún otro
sibling con el mismo patrón de rectángulo-entre-dos-Y-arbitrarios (se escribe una variante menor del
patrón de `drawSelection`, no una reutilización exacta), y ningún test de `ECGChart.test.tsx` se ve
afectado por depender solo de la firma de `drawRuler`, no de su implementación interna. Único riesgo
teórico: que el nuevo rectángulo tape visualmente más área que la línea anterior sobre puntos de la
señal — aceptable, es exactamente el efecto visual que pidió el usuario (selección "cuadrada").

## Rollback plan

- Steps: trivial — revertir el commit de este fix (cambios contenidos en `drawOverlay.ts` +
  `drawOverlay.test.ts`). No hay migración de datos, no hay estado persistente afectado, no hay
  dependencia de ningún otro cambio.
- Indicators: si el rectángulo genera confusión visual (por ejemplo, tapa la señal de forma que
  dificulta leer el gráfico durante la medición), revertir y reevaluar con un rectángulo con relleno
  más transparente o volver a la línea diagonal.
