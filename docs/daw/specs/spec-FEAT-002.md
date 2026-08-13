# Spec FEAT-002: Gráfico ECG — visualización, zoom y rejilla (RF-02/06/07)

| Field | Value |
|-------|-------|
| Ticket | FEAT-002 |
| PRD | docs/daw/prd/prd-FEAT-002.md |
| Tier | FEATURE |
| Date | 2026-08-09 |
| Spec loops | 0 |

## Summary

Se implementa el gráfico ECG en **Canvas 2D propio** (sin librería de charting) sobre el front de
FEAT-001. Una capa de **lógica pura** (`lib/ecg/chart/`) resuelve el mapeo tiempo→X / amplitud→Y,
los ticks de ejes, el cálculo del rango de zoom desde el arrastre y la decimación por píxel. Un
**`viewStore` Zustand separado** guarda la ventana visible, la rejilla y la herramienta activa. El
componente **`ECGChart`** dibuja sobre un lienzo base (señal/ejes/rejilla) y un lienzo superpuesto
(overlay) para la interacción de zoom (cursor lupa), y una **`ChartToolbar`** expone los controles.
`App` monta ambos junto a `CsvUpload`.

## Decisiones de diseño (de PLAN)

- **`viewStore` separado de `signalStore`** (coherente con ADR-001; no contamina `reset()` ni los
  tests de `CsvUpload`). Sync señal→vista **orquestado por `ECGChart`**: deriva `[t0, tN]` de la
  señal y llama `viewStore.initForSignal(t0, tN)`.
- **Fuente del "rango completo" en `resetZoom`**: `viewStore` guarda `fullWindow` (seteado en
  `initForSignal`); `resetZoom` hace `visibleWindow = fullWindow`. El store no importa `signalStore`.
- **Rendimiento (RNF-01/02)**: lienzo base separado del overlay (la señal no se redibuja en cada
  `mousemove`; solo el overlay) + **decimación por píxel**.
- **Sin dependencias nuevas** (Canvas 2D nativo). El mock de `getContext` en tests se tipa sin `any`.

## Coverage: PRD → blocks

| Requirement | Covered by |
|---|---|
| FR-01 (dibujar señal + ejes s/mV autoescalados) | Block 1 (mapeo/ticks) + Block 3 (Canvas) |
| FR-02 (estado vacío sin señal) | Block 3 |
| FR-03 (toolbar toggle Zoom) | Block 2 (activeTool) + Block 4 (control) |
| FR-04 (arrastre zoom: lupa + selección + acercar) | Block 1 (px→rango) + Block 2 (setZoomWindow) + Block 3 (overlay) |
| FR-05 (restablecer zoom) | Block 2 (resetZoom) + Block 4 (botón) |
| FR-06 (mostrar/ocultar rejilla) | Block 2 (gridVisible) + Block 3 (dibujo) + Block 4 (toggle) |
| NFR-01 (render < 0.1 s p95, 30k muestras) | Strategy: decimación por píxel (≤ ~2 vértices por columna) → el trabajo por frame es O(ancho en px), no O(nº muestras). Test de rendimiento sobre el pipeline de construcción del path en Block 1. |
| NFR-02 (≥10 fps, sin full-repaint) | Strategy: lienzo base (señal/ejes/rejilla) redibuja solo ante cambio de señal/ventana/rejilla; el overlay redibuja en `mousemove` durante el arrastre. Test en Block 3: un `mousemove` de arrastre NO invoca el render del lienzo base. |

## Dependencies between blocks

- **Block 1** (lógica pura) — sin dependencias.
- **Block 2** (`viewStore`) depende de Block 1 (tipo `TimeWindow`).
- **Block 3** (`ECGChart` + render) depende de Block 1 y Block 2.
- **Block 4** (`ChartToolbar` + integración) depende de Block 2 y Block 3.
- Orden: **1 → 2 → 3 → 4**.

---

## Block 1 — Lógica pura de render

**Files**
- `src/frontend/src/lib/ecg/chart/types.ts` (new) — `TimeWindow = { fromTime: number; toTime: number }`, `ChartDims = { width: number; height: number; padding: {...} }`, `YRange = { min: number; max: number }`.
- `src/frontend/src/lib/ecg/chart/scale.ts` (new) — `timeToX(t, window, dims)`, `mvToY(mv, yRange, dims)`, `computeYRange(samples)`, `niceTicks(min, max, count)`.
- `src/frontend/src/lib/ecg/chart/zoom.ts` (new) — `pixelRangeToWindow(x0, x1, window, dims): TimeWindow | null` — convierte el arrastre a un rango temporal, clampeado a la ventana actual; devuelve `null` si el ancho es despreciable (< umbral en px).
- `src/frontend/src/lib/ecg/chart/decimate.ts` (new) — `decimate(samples, window, widthPx): ECGSample[]` — reduce a ≤ ~2 vértices por columna de píxel dentro de la ventana.
- `src/frontend/src/lib/ecg/chart/chart.test.ts` (new) — tests unitarios (Vitest).

**Logic**
Funciones puras, sin Canvas ni DOM. `computeYRange` recorre las muestras (autoescala Y). `niceTicks`
produce marcas "redondas". `pixelRangeToWindow` normaliza `x0/x1` (orden), mapea a tiempo y clampea a
`[window.fromTime, window.toTime]`. `decimate` agrupa por columna de píxel y conserva min/max.

**Input validation** (FR-04, mitigación R2)
- `pixelRangeToWindow`: normaliza el orden de `x0/x1`; si `|x1-x0| < MIN_DRAG_PX` → `null`; el rango resultante se clampea a la ventana; garantiza `fromTime < toTime`.
- `computeYRange`/`decimate` con `samples` vacío o de 1 elemento → resultado seguro (rango degenerado manejado, ver errores).

**Error handling** (cada uno con test — F-SPEC-16)
- `degenerate-drag`: arrastre de ancho despreciable → `pixelRangeToWindow` devuelve `null` (no hay zoom).
- `empty-signal-range`: `computeYRange([])` → devuelve un `YRange` por defecto (p. ej. `{min:-1,max:1}`) sin lanzar; `decimate([], …)` → `[]`.

**Required tests**
- [ ] `timeToX`/`mvToY` mapean correctamente extremos y punto medio dado un `window`/`dims` — **valida AC-01** (base).
- [ ] `computeYRange` autoescala al min/max de la señal (incluye negativos) — **valida AC-01**.
- [ ] `niceTicks` devuelve marcas dentro del rango y "redondas".
- [ ] `pixelRangeToWindow` con arrastre válido → ventana clampeada con `fromTime<toTime` — **valida AC-04** (base).
- [ ] `pixelRangeToWindow` con arrastre despreciable → `null` — **valida AC-05** (sad path).
- [ ] `computeYRange([])` → rango por defecto sin excepción; `decimate([], …)` → `[]` (sad path).
- [ ] **Rendimiento (NFR-01):** construir el path decimado para 30.000 muestras a un ancho típico (p. ej. 1000 px), 20 veces, p95 < 0.1 s.

**Completion criterion**
Todos los tests de `chart.test.ts` verdes; `tsc --noEmit` limpio; sin `any`.

---

## Block 2 — viewStore (estado de vista)

**Files**
- `src/frontend/src/state/viewStore.ts` (new) — store Zustand.
- `src/frontend/src/state/viewStore.test.ts` (new) — tests.

**Logic**
Estado: `visibleWindow: TimeWindow | null`, `fullWindow: TimeWindow | null`, `gridVisible: boolean`
(default `true`), `activeTool: 'none' | 'zoom'` (default `'none'`). Acciones:
- `initForSignal(fromTime, toTime)`: setea `fullWindow` y `visibleWindow` al rango completo.
- `setZoomWindow(win)`: valida `win.fromTime < win.toTime` y que quede dentro de `fullWindow`; si es válido, setea `visibleWindow`; si no, no-op.
- `resetZoom()`: `visibleWindow = fullWindow` (no-op si `fullWindow` es `null`).
- `toggleGrid()`, `setActiveTool(tool)`, `reset()` (limpia todo a los defaults).

**Input validation** (FR-03, FR-04, FR-05)
- `setZoomWindow`: rechaza `fromTime >= toTime` y rangos fuera de `fullWindow` (clamp o no-op).
- `setActiveTool`: solo `'none' | 'zoom'` (tipado por unión).

**Error handling** (cada uno con test — F-SPEC-16)
- `invalid-window`: `setZoomWindow` con `fromTime >= toTime` → ignorado, `visibleWindow` sin cambios.
- `reset-without-signal`: `resetZoom()` sin `fullWindow` (sin señal) → no-op, sin excepción.

**Required tests**
- [ ] `initForSignal(t0,tN)` setea `fullWindow` y `visibleWindow` al rango completo — **valida AC-01/AC-06** (base).
- [ ] `setZoomWindow` válido actualiza `visibleWindow` — **valida AC-04** (base de estado).
- [ ] `setZoomWindow` con `fromTime>=toTime` → ignorado (sad path).
- [ ] `resetZoom` vuelve `visibleWindow` a `fullWindow` — **valida AC-06**.
- [ ] `resetZoom` sin señal → no-op sin excepción (sad path).
- [ ] `setActiveTool('zoom')` marca la herramienta activa; volver a `'none'` la desactiva — **valida AC-03** (estado).
- [ ] `toggleGrid` alterna `gridVisible` — **valida AC-07** (estado).

**Completion criterion**
Tests de `viewStore.test.ts` verdes; `reset()` deja defaults; `tsc --noEmit` limpio.

---

## Block 3 — ECGChart + render (Canvas 2D)

**Files**
- `src/frontend/src/components/render/drawChart.ts` (new) — `drawChart(ctx, { signal, window, dims, gridVisible })`: dibuja rejilla (si visible), ejes (ticks de `niceTicks`, X en s / Y en mV) y la señal decimada. Usa Block 1.
- `src/frontend/src/components/render/drawOverlay.ts` (new) — `drawSelection(ctx, x0, x1, dims)`: rectángulo de selección que abarca todo el alto.
- `src/frontend/src/components/ECGChart.tsx` (new) — dos `<canvas>` (base + overlay); `useEffect` que redibuja el base ante cambios de señal/ventana/rejilla; deriva `[t0,tN]` de la señal y llama `initForSignal`; handlers de mouse para el zoom (cuando `activeTool==='zoom'`): dibuja selección en el overlay durante el arrastre, y en `mouseup` calcula el rango con `pixelRangeToWindow` y llama `setZoomWindow`; aplica clase de **cursor lupa** cuando el zoom está activo; **estado vacío** cuando no hay señal.
- `src/frontend/src/test/setup.ts` (modified) — mock global de `HTMLCanvasElement.prototype.getContext` devolviendo un stub tipado del contexto 2D (sin `any`; usar un tipo parcial de `CanvasRenderingContext2D` con las funciones usadas).
- `src/frontend/src/components/ECGChart.test.tsx` (new) — tests (RTL + mock 2D).

**Logic**
El lienzo base solo se redibuja cuando cambian señal, `visibleWindow` o `gridVisible`. El overlay se
redibuja durante el arrastre de zoom (mousemove) sin tocar el base (RNF-02). En `mouseup`, si el
rango no es despreciable, se acerca la vista vía `setZoomWindow`.

**Input validation** (FR-04)
- Coordenadas de mouse relativas al canvas; el rango se valida/clampa vía `pixelRangeToWindow` (Block 1) antes de `setZoomWindow`.

**Error handling** (cada uno con test — F-SPEC-16)
- `no-2d-context`: si `getContext('2d')` devuelve `null` → el render es no-op (guarda), sin lanzar.
- `no-signal`: sin señal en el store → renderiza el **estado vacío**, no dibuja curva.

**Required tests**
- [ ] Con una señal en el store, al montar se llama a `drawChart` con la ventana completa y ejes s/mV; se llama `initForSignal` — **valida AC-01**.
- [ ] Sin señal → se muestra el estado vacío, no se dibuja la curva — **valida AC-02** (sad path).
- [ ] Con `activeTool==='zoom'`, un arrastre (`mousedown`→`mousemove`→`mouseup`) sobre el gráfico llama `setZoomWindow` con un rango válido; el contenedor tiene el cursor de lupa — **valida AC-04**.
- [ ] Un "arrastre" sin desplazamiento (mousedown/mouseup en el mismo x) NO llama `setZoomWindow` (o no cambia la ventana) — **valida AC-05** (sad path).
- [ ] Rejilla: con `gridVisible=true` se invoca el dibujo de la rejilla; con `false` no — **valida AC-07** (render).
- [ ] **RNF-02:** un `mousemove` de arrastre NO invoca `drawChart` (solo el overlay) — verifica "sin full-repaint".
- [ ] `getContext` devuelve `null` → el componente no lanza (sad path).

**Completion criterion**
Tests de `ECGChart.test.tsx` verdes; `App.test.tsx` y demás siguen verdes con el mock de `getContext`; `tsc --noEmit` y lint limpios; sin `any`.

---

## Block 4 — ChartToolbar + integración

**Files**
- `src/frontend/src/components/ChartToolbar.tsx` (new) — controles nativos con `aria-label`: toggle "Zoom" (`setActiveTool`), botón "Restablecer zoom" (`resetZoom`), toggle "Rejilla" (`toggleGrid`). Refleja el estado del `viewStore` (p. ej. `aria-pressed` en los toggles).
- `src/frontend/src/App.tsx` (modified) — monta `<ChartToolbar/>` y `<ECGChart/>` junto a `<CsvUpload/>`.
- `src/frontend/src/App.test.tsx` (modified) — ajusta expectativas al nuevo montaje (con el mock de `getContext` del setup); mantiene el smoke de que la app renderiza.
- `src/frontend/src/components/ChartToolbar.test.tsx` (new) — tests RTL.

**Logic**
La toolbar lee/escribe el `viewStore` con selectores granulares. El toggle Zoom activa/desactiva la
herramienta; "Restablecer zoom" invoca `resetZoom`; el toggle Rejilla invoca `toggleGrid`.

**Input validation**
- N/A directa (controles nativos con estados acotados por el store).

**Error handling** (con test — F-SPEC-16)
- `reset-sin-señal`: "Restablecer zoom" sin señal cargada → no-op (delegado a `viewStore.resetZoom`); test a nivel toolbar de que no rompe.

**Required tests**
- [ ] El toggle "Zoom" activa/desactiva la herramienta (refleja `activeTool` en `aria-pressed`) — **valida AC-03**.
- [ ] "Restablecer zoom" invoca `resetZoom` (tras un zoom, la vista vuelve a la señal completa) — **valida AC-06**.
- [ ] El toggle "Rejilla" alterna la visibilidad de la rejilla — **valida AC-07**.
- [ ] "Restablecer zoom" sin señal no lanza (sad path).
- [ ] `App` monta `CsvUpload` + `ChartToolbar` + `ECGChart` sin errores (smoke actualizado).

**Completion criterion**
Tests de `ChartToolbar.test.tsx` y `App.test.tsx` verdes; suite completa verde; `tsc --noEmit` y lint limpios.

## Final verification

- Los 4 bloques implementados; `npm run build`, `npm run typecheck`, `npm run lint` y `npm test` verdes.
- Cada AC (AC-01…AC-07) con al menos un test que pasa.
- Mitigaciones del threat model aplicadas: decimación por píxel + lienzo base/overlay (R1, RNF-02), clamping del rango de zoom y descarte de arrastres despreciables (R2, AC-05).
- Sin dependencias nuevas; Canvas 2D propio (Principio V).
