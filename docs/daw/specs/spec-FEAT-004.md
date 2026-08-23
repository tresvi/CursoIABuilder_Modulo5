# Spec FEAT-004: Herramienta Regla — medir Δt/Δamplitud (RF-08)

| Field | Value |
|-------|-------|
| Ticket | FEAT-004 |
| PRD | docs/daw/prd/prd-FEAT-004.md |
| Tier | FEATURE |
| Date | 2026-08-23 |
| Spec loops | 0 |

## Summary

Se agrega una tercera herramienta mutuamente excluyente, `'ruler'`, a `ChartTool` en `viewStore`.
Reusa el mecanismo de overlay ya existente (`drawOverlay.ts`, canvas separado del base) para dibujar,
mientras se arrastra, una línea entre el punto inicial y la posición actual del cursor más un
tooltip con Δt/Δamplitud (nueva función `drawRuler`). Se agrega `yToMv` (inversa de `mvToY`, mismo
patrón con el que se creó `xToTime` en FEAT-003a) para convertir la posición Y del arrastre a mV.

**Decisión de diseño clave** (resuelve el gap que el Impact Scan marcó como "requiere estado
nuevo"): no hace falta persistir la medición en ningún store. El canvas overlay es un dibujo
imperativo que permanece visible hasta que algo lo redibuja o lo limpia — no se resetea solo entre
renders de React. Por lo tanto, "dejar visible la medición tras soltar" (AC-03) es simplemente **no
llamar a `clearOverlay()` en `onMouseUp` cuando la herramienta es `'ruler'`**, y "ocultar al cambiar
de herramienta" (AC-05) es un `useEffect` que limpia el overlay cuando `activeTool` deja de ser
`'ruler'`. Cero estado nuevo en `viewStore` más allá del valor del enum.

## Coverage: PRD → blocks

| Requirement | Covered by |
|---|---|
| FR-01 | Block 1, Block 3 |
| FR-02 | Block 1, Block 2, Block 4 |
| FR-03 | Block 4 |
| FR-04 | Block 4 |
| FR-05 | Block 4 |
| NFR-01 | Strategy: `drawRuler` se invoca sobre el canvas *overlay* (separado del base), exactamente el mismo mecanismo que ya usa `drawSelection` para Zoom (FEAT-002) — nunca se toca `drawChart`/el canvas base durante el arrastre o al dejar la medición visible, por lo que no hay redibujado adicional del lienzo principal. |

## Dependencies between blocks

Secuencial: Block 1 → Block 2 → Block 3 → Block 4. Block 2 consume `yToMv` de Block 1; Block 4
consume `'ruler'` de Block 1, `drawRuler` de Block 2, y el botón de Block 3 para poder activar la
herramienta en los tests de integración.

## Block 1 — `viewStore`: `ChartTool` + `yToMv`

**Files**
- `src/frontend/src/state/viewStore.ts` (modified) — `ChartTool` pasa a
  `'none' | 'zoom' | 'mark' | 'ruler'`.
- `src/frontend/src/lib/ecg/chart/scale.ts` (modified) — exporta
  `yToMv(y: number, yRange: YRange, dims: ChartDims): number`, inversa de `mvToY` (mismo patrón que
  `xToTime` es inversa de `timeToX`, ya en este archivo).
- `src/frontend/src/lib/ecg/chart/scale.test.ts` (modified) — tests de `yToMv`.

**Logic**
`yToMv` invierte la fórmula de `mvToY` (interpolación lineal entre `yRange.min`/`yRange.max` y el
alto útil del canvas, con el eje invertido: Y menor → mV mayor, igual que `mvToY` lo hace en el
sentido contrario). Clampea a `yRange.min`/`yRange.max` en los bordes del área útil, mismo criterio
que `xToTime` clampea a `window.fromTime`/`window.toTime`.

**Error handling**
- Si `y` cae fuera del área útil del canvas (antes de `dims.padding.top` o después de
  `dims.height - dims.padding.bottom`), `yToMv` clampea el resultado a `yRange.max`/`yRange.min`
  respectivamente — nunca devuelve una amplitud fuera del rango visible.
- Sin condiciones de error en `ChartTool`: es una ampliación de un union type, sin lógica de
  ejecución propia.

**Required tests**
- [ ] `yToMv` es la inversa de `mvToY` para varios puntos dentro del área útil (round-trip).
- [ ] `yToMv` clampea correctamente en los bordes del canvas (top → `yRange.max`, bottom →
      `yRange.min`).
- [ ] `yToMv` no divide por cero cuando `yRange` es degenerado (`min === max`).

**Completion criterion**
`npm run typecheck` limpio; tests de `scale.test.ts` verdes.

## Block 2 — `drawOverlay.ts`: `drawRuler`

**Files**
- `src/frontend/src/components/render/drawOverlay.ts` (modified) — agrega
  `drawRuler(ctx, x0, y0, x1, y1, dims, deltaT, deltaAmplitude)`.
- `src/frontend/src/components/render/drawOverlay.test.ts` (new) — no existía test previo para este
  archivo; se crea desde cero.

**Logic**
`drawRuler` dibuja, sobre el canvas overlay (nunca el base): una línea entre `(x0,y0)` y `(x1,y1)`
(mismo estilo de trazo que usa `drawSelection` para el rectángulo de Zoom — reusar color/grosor, no
inventar una paleta nueva), y un tooltip de texto cerca de `(x1,y1)` con el contenido
`` `Δt: ${Math.abs(deltaT).toFixed(3)}s` `` en una línea y `` `ΔmV: ${Math.abs(deltaAmplitude).toFixed(2)}mV` ``
en la siguiente, pintado con `ctx.fillText` (nunca inserción de HTML — no aplica mitigación XSS
aquí porque no hay texto de usuario involucrado, solo números calculados, pero se mantiene la
convención de texto vía `fillText` establecida en `drawMarkers.ts`, FEAT-003a). Se usan valores
absolutos: la Regla mide una diferencia, no una dirección de arrastre.

**Error handling**
- Sin condiciones de error: la función es puramente de dibujo, recibe números ya calculados por el
  caller (Block 4) y no valida su rango — cualquier `NaN`/`Infinity` sería un bug del caller, no de
  esta función.

**Required tests**
- [ ] `drawRuler` dibuja una línea entre los dos puntos dados (verificar llamadas a `ctx.moveTo`/
      `ctx.lineTo` con las coordenadas esperadas).
- [ ] `drawRuler` pinta el texto `Δt`/`ΔmV` con `ctx.fillText`, con el valor absoluto y el formato
      esperado (3 y 2 decimales respectivamente).
- [ ] `drawRuler` con `deltaT`/`deltaAmplitude` negativos muestra el valor absoluto (sin signo
      negativo en el texto).

**Completion criterion**
Tests de `drawOverlay.test.ts` verdes.

## Block 3 — Botón "Regla" en `ChartToolbar`

**Files**
- `src/frontend/src/components/ChartToolbar.tsx` (modified) — nuevo botón toggle.
- `src/frontend/src/components/ChartToolbar.test.tsx` (modified).

**Logic**
Sigue el patrón exacto de los botones "Zoom"/"Marcar" ya existentes: `isRulerActive` derivado de
`activeTool === 'ruler'`, `handleToggleRuler` que llama
`setActiveTool(isRulerActive ? 'none' : 'ruler')`, botón `<button aria-label="Activar herramienta de
regla" aria-pressed={isRulerActive}>` con las mismas clases `cn(...)` condicionales.

**Error handling**
- Sin condiciones de error: alternar `activeTool` es una asignación de un enum interno, sin entrada
  externa ni posibilidad de fallo (mismo criterio ya aceptado para "Marcar" en FEAT-003a).

**Required tests**
- [ ] AC-01: clic en el botón "Regla" alterna `activeTool` a `'ruler'` y de vuelta a `'none'`.
- [ ] Activar "Regla" mientras "Zoom" o "Marcar" está activa desactiva la otra (exclusión mutua ya
      garantizada por `activeTool` ser un único valor — test de regresión, no lógica nueva).

**Completion criterion**
Tests de `ChartToolbar.test.tsx` verdes.

## Block 4 — Integración en `ECGChart`: arrastre, medición en vivo, persistencia visual

**Files**
- `src/frontend/src/components/ECGChart.tsx` (modified) — nuevo `dragStartYRef` (análogo a
  `dragStartXRef`, para poder calcular Δamplitud); nuevo `rulerYRangeRef` (calculado una sola vez en
  `onMouseDown` con `computeYRange(signal.samples)`, reusado durante el arrastre para no recalcularlo
  en cada `onMouseMove`); guards de los tres handlers extendidos para admitir `'ruler'`; nuevo
  `useEffect` que limpia el overlay cuando `activeTool` deja de ser `'ruler'`.
- `src/frontend/src/components/ECGChart.test.tsx` (modified).

**Logic**
- `onMouseDown`: guard pasa a `if (activeTool !== 'zoom' && activeTool !== 'mark' && activeTool !==
  'ruler') return;`. Además de `dragStartXRef.current = relativeX(...)` (ya existente), si
  `activeTool === 'ruler'` también fija `dragStartYRef.current = relativeY(event.clientY, overlay)`
  (nueva función `relativeY`, análoga a `relativeX` ya existente) y
  `rulerYRangeRef.current = computeYRange(signal.samples)`.
- `onMouseMove`: guard pasa a `if (activeTool !== 'zoom' && activeTool !== 'ruler') return;` — **se
  agrega `'ruler'` aquí, a diferencia de `'mark'` que nunca entró a este handler (comportamiento
  intencional y ya establecido en FEAT-003a: Marcar no tiene preview en vivo, Regla sí, igual que
  Zoom)**. Con `activeTool === 'ruler'`: calcula `deltaT = xToTime(x, visibleWindow, DIMS) -
  xToTime(dragStartXRef.current, visibleWindow, DIMS)` y `deltaAmplitude = yToMv(y, yRange, DIMS) -
  yToMv(dragStartYRef.current, yRange, DIMS)` (usando `rulerYRangeRef.current`), y llama a
  `drawRuler(ctx, dragStartXRef.current, dragStartYRef.current, x, y, DIMS, deltaT,
  deltaAmplitude)` en vez de `drawSelection`.
- `onMouseUp`: hoy llama a `clearOverlay()` incondicionalmente antes de la lógica por herramienta —
  pasa a condicionarse: `if (activeTool !== 'ruler') clearOverlay(ctx, DIMS);`. Con
  `activeTool === 'ruler'`: si el desplazamiento (en X o Y) es menor a `MIN_DRAG_PX`, SÍ se limpia el
  overlay (AC-06: un clic sin arrastre no deja medición) y no se hace nada más; si el desplazamiento
  es mayor o igual, NO se limpia — el último dibujo de `onMouseMove` (o uno final recalculado con las
  coordenadas de `mouseup`, para no depender de que `mousemove` haya disparado exactamente en la
  posición final) queda visible tal cual, sin estado adicional en ningún store (AC-03).
  `dragStartXRef.current`/`dragStartYRef.current` se resetean a `null` en todos los casos, igual
  patrón que ya existe.
- **Nuevo `useEffect`**: `useEffect(() => { if (activeTool !== 'ruler') clearOverlay(ctx, DIMS); },
  [activeTool])` — cubre AC-05 (cambiar de herramienta o desactivar Regla oculta la medición
  visible), sin depender de que el usuario suelte el mouse para que se dispare.

**Error handling**
- Si `visibleWindow` o `signal` son `null`, la herramienta "Regla" no calcula ni dibuja nada (mismo
  guard que ya existe para Zoom/Marcar en este archivo).
- Sin condiciones de error adicionales.

**Required tests**
- [ ] AC-02: arrastrar con "Regla" activa dibuja `drawRuler` en cada `mousemove` con el Δt/Δamplitud
      correcto calculado desde el punto inicial hasta la posición actual (mock de `drawRuler`,
      verificar los argumentos de la llamada).
- [ ] AC-03: soltar el mouse tras un arrastre válido con "Regla" activa NO llama a `clearOverlay`
      (a diferencia de Zoom, que sí lo hace).
- [ ] AC-04: medir de nuevo (segundo arrastre) con "Regla" activa reemplaza el dibujo anterior —
      verificar que `drawRuler` se llama de nuevo con las nuevas coordenadas (el propio mecanismo de
      "dibujar encima" del canvas cubre el reemplazo visual, no hace falta limpiar explícitamente
      antes del segundo arrastre porque `drawRuler` repinta sobre el mismo canvas... **excepción**:
      si el segundo arrastre resulta en una línea más corta que la anterior, quedarían restos del
      dibujo previo sin limpiar — por eso `onMouseDown` con `'ruler'` SÍ debe llamar a
      `clearOverlay(ctx, DIMS)` antes de empezar el nuevo arrastre, como hace Zoom hoy implícitamente
      al limpiar el overlay en su propio ciclo. Este test verifica exactamente eso: `clearOverlay` se
      llama en `onMouseDown` cuando `activeTool === 'ruler'`.
- [ ] AC-05: cambiar `activeTool` de `'ruler'` a otro valor (o a `'none'`) dispara `clearOverlay` vía
      el nuevo `useEffect`, sin necesidad de interacción de mouse.
- [ ] AC-06: un arrastre con desplazamiento menor a `MIN_DRAG_PX` (o un clic sin arrastre) con
      "Regla" activa no deja ninguna medición visible — `clearOverlay` se llama en `onMouseUp`.
- [ ] Regresión: los tests existentes de Zoom y Marcar (FEAT-002/003a) — en particular "arrastre con
      Marcar activo no dibuja `drawSelection`" — siguen pasando sin cambios de comportamiento; el
      guard de `onMouseMove` para `'mark'` sigue sin existir (Marcar sigue sin preview en vivo).
- [ ] Sin señal cargada (`visibleWindow`/`signal` nulos), un arrastre con "Regla" activa no llama a
      `drawRuler` ni deja ninguna medición visible.

**Completion criterion**
`ECGChart.test.tsx` verde; ningún test de FEAT-001/002/003a/003b queda roto; `npm run typecheck`
limpio.

## Final verification

- `npm run typecheck`, `npm run lint`, `npm run test` (suite completa) en verde.
- AC-01 a AC-06 del PRD FEAT-004 verificados por al menos un test automatizado cada uno.
- NFR-01 verificado manualmente: medir repetidamente con "Regla" activa no degrada el frame rate por
  debajo del umbral ya validado en FEAT-002 (el canvas base nunca se toca durante el arrastre).
- Ningún test de FEAT-001/FEAT-002/FEAT-003a/FEAT-003b queda roto (regresión cero).
