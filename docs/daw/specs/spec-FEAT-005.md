# Spec FEAT-005: Herramienta Recorte — recortar señal con confirmación (RF-09)

| Field | Value |
|-------|-------|
| Ticket | FEAT-005 |
| PRD | docs/daw/prd/prd-FEAT-005.md |
| Tier | FEATURE |
| Date | 2026-08-23 |
| Spec loops | 0 |

## Summary

Agregar `'crop'` como cuarta herramienta mutuamente excluyente de `activeTool` (`viewStore`).
Reusa `pixelRangeToWindow`/`drawSelection` ya existentes (mismo mecanismo que Zoom) para
seleccionar y resaltar el rango durante el arrastre. Al soltar con desplazamiento suficiente, abre
`ConfirmDialog` (ya existente, reusado de FEAT-003b) con el rango como estado local de
`ECGChart`. Al confirmar: una función pura nueva `cropSignal` (en `lib/ecg/crop.ts`) recorta la
señal, una acción nueva en `signalStore` reemplaza la señal cargada, y una acción nueva en
`markersStore` elimina los marcadores fuera del rango. El `useEffect` de sincronización
señal→vista ya existente en `ECGChart` reinicializa `visibleWindow`/`fullWindow` automáticamente
al cambiar `signal` (cubre FR-06 sin código nuevo).

## Coverage: PRD → blocks

| Requirement | Covered by |
|---|---|
| FR-01 | Block 4 |
| FR-02 | Block 5 |
| FR-03 | Block 5 |
| FR-04 | Block 1, Block 2, Block 5 |
| FR-05 | Block 5 |
| FR-06 | Block 5 (efecto ya existente, verificado por test) |
| NFR-01 | Estrategia: Block 5 reusa `drawSelection`/overlay ya establecido por Zoom (FEAT-002), sin redibujar el lienzo base durante el arrastre. |
| NFR-02 | Estrategia: Block 5 usa `ConfirmDialog` (`Dialog` de Radix ya instalado), que bloquea la interacción con el resto de la página mientras está abierto. |

## Dependencies between blocks

Block 1 (función pura) no depende de nada. Block 2 (`signalStore`) depende de Block 1. Block 3
(`markersStore`) es independiente de 1/2. Block 4 (`viewStore` — tipo `ChartTool`) es
independiente. Block 5 (`ChartToolbar` + `ECGChart`, integración) depende de Blocks 1-4. Orden de
ejecución: 1 → 2 → 3 → 4 → 5.

## Block 1 — Función pura de recorte de señal

**Files**
- `src/frontend/src/lib/ecg/crop.ts` (new) — función pura de recorte.
- `src/frontend/src/lib/ecg/crop.test.ts` (new) — tests unitarios.

**Logic**

`cropSignal(signal: ECGSignal, range: TimeWindow): ECGSignal | null`:
- Filtra `signal.samples` a los que cumplen `t >= range.fromTime && t <= range.toTime` (límites
  inclusivos, consistente con que el usuario ve el borde del rango como parte de la selección).
- Si el resultado tiene **menos de 2 muestras**, devuelve `null` (rango degenerado: no hay
  suficientes puntos para una señal válida — mismo umbral que usa el `useEffect` de sincronización
  señal→vista en `ECGChart.tsx:66`, que requiere `samples.length >= 2`). El llamador (Block 2) debe
  tratar `null` como "no aplicar el recorte".
- No muta `signal` ni sus `samples` (devuelve un array nuevo).

**Error handling**
- Rango sin intersección con la señal (0 muestras) → `null`, igual que el caso de 1 muestra.
- El módulo no valida `range.fromTime < range.toTime`: esa invariante ya la garantiza
  `pixelRangeToWindow` (usado por el llamador en Block 5), que devuelve `null` si no se cumple.

**Required tests**
- [ ] `cropSignal` con un rango que contiene un subconjunto propio de muestras → devuelve solo esas
  muestras, en el mismo orden — valida AC-05.
- [ ] `cropSignal` con un rango que cubre toda la señal → devuelve todas las muestras sin cambios.
- [ ] `cropSignal` con un rango que deja menos de 2 muestras dentro → devuelve `null`.
- [ ] `cropSignal` no muta el array `samples` original (verificar identidad/referencia distinta).

**Completion criterion**
`crop.test.ts` pasa en verde, cubriendo los cuatro casos de arriba.

## Block 2 — Acción de recorte en `signalStore`

**Files**
- `src/frontend/src/state/signalStore.ts` (modified) — nueva acción `cropToRange`.
- `src/frontend/src/state/signalStore.test.ts` (new) — no existe hoy; primer test dedicado del
  store.

**Logic**

Agregar a `SignalState`:
```ts
/** Recorta la señal cargada al rango dado (FR-04); no-op si no hay señal o el rango la deja
 * inválida (<2 muestras, ver `cropSignal`). */
cropToRange: (range: TimeWindow) => void;
```

Implementación: lee `signal` actual del store; si es `null`, no-op. Si no es `null`, llama a
`cropSignal(signal, range)` (Block 1); si el resultado es `null`, no-op (silencioso: el llamador de
Block 5 ya garantiza vía `ConfirmDialog` que el usuario decide explícitamente, así que un rango
degenerado aquí sería un bug del llamador, no una entrada de usuario a reportar). Si no es `null`,
`set({ signal: cropped })` — mantiene `status: 'loaded'` y `error: null` sin cambios.

**Error handling**
- Sin señal cargada → no-op.
- Rango que deja <2 muestras → no-op (ver Block 1).

**Required tests**
- [ ] `cropToRange` con señal cargada y rango válido → `signal` queda reemplazado por la señal
  acotada — valida AC-05.
- [ ] `cropToRange` sin señal cargada (`signal === null`) → no-op, `status`/`error` sin cambios.
- [ ] `cropToRange` con rango que deja <2 muestras → `signal` no cambia (sigue siendo el original).

**Completion criterion**
`signalStore.test.ts` pasa en verde; `npx tsc --noEmit` sin errores de tipos en `signalStore.ts`.

## Block 3 — Purga de marcadores fuera de rango en `markersStore`

**Files**
- `src/frontend/src/state/markersStore.ts` (modified) — nueva acción `removeMarkersOutside`.
- `src/frontend/src/state/markersStore.test.ts` (modified) — nuevos casos.

**Logic**

Agregar a `MarkersState`:
```ts
/** Elimina los marcadores cuyo `time` cae fuera de `range` (decisión de PLAN, FEAT-005). */
removeMarkersOutside: (range: TimeWindow) => void;
```

Implementación: `set((s) => ({ markers: s.markers.filter((m) => m.time >= range.fromTime && m.time
<= range.toTime) }))` — mismos límites inclusivos que `cropSignal` (Block 1), para que un marcador
justo en el borde del recorte se conserve si su muestra también se conserva.

**Error handling**
- `markers` vacío → no-op.

**Required tests**
- [ ] `removeMarkersOutside` con marcadores dentro y fuera del rango → conserva solo los de dentro.
- [ ] `removeMarkersOutside` con un marcador exactamente en el borde (`time === range.fromTime` o
  `range.toTime`) → se conserva (límites inclusivos).
- [ ] `removeMarkersOutside` con `markers: []` → sigue siendo `[]`.

**Completion criterion**
`markersStore.test.ts` pasa en verde con los nuevos casos.

## Block 4 — `'crop'` como `ChartTool` en `viewStore`

**Files**
- `src/frontend/src/state/viewStore.ts` (modified) — extender el tipo `ChartTool`.
- `src/frontend/src/state/viewStore.test.ts` (modified) — un caso nuevo.

**Logic**

`export type ChartTool = 'none' | 'zoom' | 'mark' | 'ruler' | 'crop';` — sin más cambios: la
exclusión mutua ya es inherente a que `activeTool` es un único campo (`setActiveTool` reemplaza el
valor, no hay lista de herramientas activas).

**Error handling**
N/A — cambio de tipo puro, sin lógica nueva.

**Required tests**
- [ ] `setActiveTool('crop')` deja `activeTool === 'crop'`, igual que los demás valores.

**Completion criterion**
`viewStore.test.ts` pasa en verde; `npx tsc --noEmit` sin errores (todo el código que ya usaba
`ChartTool` sigue siendo válido porque `'crop'` es una unión adicional, no un cambio de forma).

## Block 5 — Integración: `ChartToolbar` + `ECGChart` + `ConfirmDialog`

**Files**
- `src/frontend/src/components/ChartToolbar.tsx` (modified) — cuarto botón "Recorte".
- `src/frontend/src/components/ChartToolbar.test.tsx` (modified) — nuevos casos.
- `src/frontend/src/components/ECGChart.tsx` (modified) — guards de mouse, estado local del
  recorte pendiente, `ConfirmDialog`.
- `src/frontend/src/components/ECGChart.test.tsx` (modified) — nuevos casos.

**Logic**

`ChartToolbar.tsx`: agregar `isCropActive = activeTool === 'crop'`, `handleToggleCrop` (mismo
patrón que `handleToggleRuler`) y un botón `aria-label="Activar herramienta de recorte"` con texto
"Recorte", mismas clases que los otros tres toggles.

`ECGChart.tsx`:
- Import `cropSignal` no es necesario acá (vive en los stores, Blocks 1-3); import
  `formatMarkerTime` de `lib/ecg/chart/format.ts` para el texto del `ConfirmDialog`, e
  `import { ConfirmDialog } from '@/components/ConfirmDialog'`, y `useSignalStore`/
  `useMarkersStore` ya están importados.
- Nuevo estado local: `const [pendingCrop, setPendingCrop] = useState<TimeWindow | null>(null);`
  (mismo patrón que `deletingId` en `MarkerList.tsx:22` — estado de "qué se está confirmando",
  local al componente, no al store).
- `onMouseDown` (línea 85): extender el guard a `activeTool !== 'zoom' && activeTool !== 'mark' &&
  activeTool !== 'ruler' && activeTool !== 'crop'` — mismo `dragStartXRef` que usa Zoom (no
  necesita Y, a diferencia de Regla).
- `onMouseMove` (línea 106): extender el guard a incluir `'crop'` en la condición que permite
  seguir (`activeTool !== 'zoom' && activeTool !== 'ruler'` → agregar `&& activeTool !== 'crop'`).
  Dentro, como Zoom y Recorte comparten el mismo dibujo (`drawSelection`), no se necesita una rama
  nueva: la rama `if (activeTool === 'ruler')` sigue igual y el `drawSelection(ctx, start, x, DIMS)`
  final ya cubre tanto `'zoom'` como `'crop'`.
- `onMouseUp` (línea 134): extender el guard inicial igual que en `onMouseDown`. Agregar una rama
  nueva antes de la rama `'mark'`:
  ```ts
  if (activeTool === 'crop') {
    if (!visibleWindow) return;
    const win = pixelRangeToWindow(start, end, visibleWindow, DIMS);
    if (!win) return; // desplazamiento < MIN_DRAG_PX (AC-04): overlay ya se limpió arriba.
    setPendingCrop(win); // NO limpiar el overlay: la selección debe seguir resaltada (FR-02)
                          // mientras el ConfirmDialog está abierto.
    return;
  }
  ```
  Nota: el bloque previo a esta rama (línea 141-146: `if (activeTool !== 'ruler') { ...clearOverlay...
  }`) ya se ejecuta para `'crop'` porque no es `'ruler'` — eso limpiaría el overlay antes de esta
  rama. Ajustar esa condición a `if (activeTool !== 'ruler' && activeTool !== 'crop')` para que
  Recorte controle su propia limpieza (solo cuando el arrastre es insuficiente, o al
  confirmar/cancelar).
- Dos handlers nuevos:
  ```ts
  const handleConfirmCrop = useCallback(() => {
    if (pendingCrop) {
      useSignalStore.getState().cropToRange(pendingCrop);
      useMarkersStore.getState().removeMarkersOutside(pendingCrop);
    }
    setPendingCrop(null);
    const overlay = overlayRef.current;
    if (overlay) {
      const ctx = overlay.getContext('2d');
      if (ctx) clearOverlay(ctx, DIMS);
    }
  }, [pendingCrop]);

  const handleCancelCrop = useCallback(() => {
    setPendingCrop(null);
    const overlay = overlayRef.current;
    if (overlay) {
      const ctx = overlay.getContext('2d');
      if (ctx) clearOverlay(ctx, DIMS);
    }
  }, []);
  ```
  Se usa `useSignalStore.getState()`/`useMarkersStore.getState()` (no el hook) porque es una acción
  disparada por un evento, no un valor leído en el render — mismo patrón que `MarkerList.tsx:27`
  (`useMarkersStore.getState().removeMarker(...)`).
- Render: agregar antes del `return` del contenedor principal (o como hermano del `<div
  data-testid="ecg-chart">`, fuera de él para no interferir con los handlers de mouse del gráfico):
  ```tsx
  <ConfirmDialog
    open={pendingCrop !== null}
    title="Confirmar recorte"
    description={
      pendingCrop
        ? `¿Recortar la señal a ${formatMarkerTime(pendingCrop.fromTime)} – ${formatMarkerTime(pendingCrop.toTime)}? Esta acción no se puede deshacer.`
        : ''
    }
    onConfirm={handleConfirmCrop}
    onCancel={handleCancelCrop}
  />
  ```
- El `useEffect` de sincronización señal→vista (líneas 63-71) ya reacciona a cambios de `signal`:
  al confirmarse el recorte, `cropToRange` reemplaza `signal` (nueva referencia), el efecto se
  dispara y llama `initForSignal(t0, tN)` con los límites de la señal acotada — esto cubre FR-06 sin
  tocar ese efecto. **No requiere cambios.**
- El `useEffect` de limpieza de overlay al abandonar `'ruler'` (líneas 187-196) no necesita
  extenderse: la limpieza de `'crop'` ya la manejan `handleConfirmCrop`/`handleCancelCrop`
  explícitamente (el overlay de Recorte solo queda "colgado" mientras el diálogo está abierto, y
  ambos handlers lo limpian al cerrarse).

**Error handling**
- Arrastre por debajo de `MIN_DRAG_PX` con Recorte activo → no se abre el diálogo, no se altera la
  señal (AC-04).
- Cancelar el diálogo (botón "Cancelar" o cerrar el modal) → `onCancel` limpia el estado pendiente
  y el overlay, la señal queda intacta (AC-06).

**Required tests**
- [ ] `ChartToolbar`: el botón "Recorte" alterna `activeTool` a `'crop'`/`'none'` y desactiva Zoom/
  Marcar/Regla si estaban activos — valida AC-01.
- [ ] `ECGChart`: con Recorte activo, arrastrar dibuja el rectángulo de selección (mismo mecanismo
  que Zoom) — valida AC-02.
- [ ] `ECGChart`: soltar el mouse tras un arrastre suficiente con Recorte activo abre el
  `ConfirmDialog` con el rango correcto en la descripción — valida AC-03.
- [ ] `ECGChart`: un clic sin arrastre (o arrastre < `MIN_DRAG_PX`) con Recorte activo no abre el
  diálogo ni altera `signal` — valida AC-04.
- [ ] `ECGChart`: confirmar el diálogo reemplaza `signal` en `useSignalStore` por la señal acotada,
  llama `removeMarkersOutside` en `useMarkersStore`, y cierra el diálogo — valida AC-05.
- [ ] `ECGChart`: cancelar el diálogo deja `signal` sin cambios y cierra el diálogo — valida AC-06.
- [ ] `ECGChart`: tras confirmar, `visibleWindow`/`fullWindow` en `useViewStore` reflejan la
  extensión completa de la nueva señal acotada (verificando el efecto de sincronización existente)
  — valida AC-07.

**Completion criterion**
`ChartToolbar.test.tsx` y `ECGChart.test.tsx` pasan en verde con los casos de arriba; el flujo
completo (activar Recorte → arrastrar → confirmar) funciona manualmente en `npm run dev`.

## Final verification

- Los seis blocks compilan sin errores (`npx tsc --noEmit` en `src/frontend`).
- Toda la suite de tests del frontend pasa (`npx vitest run`), incluyendo los archivos nuevos
  (`crop.test.ts`, `signalStore.test.ts`) y los modificados.
- AC-01 a AC-07 del PRD quedan cada uno cubierto por al menos un test, según la tabla de Coverage.
- Verificación manual en `npm run dev`: cargar un CSV, activar Recorte, arrastrar un rango,
  confirmar → la señal visible se acota al rango elegido y los marcadores fuera de él desaparecen;
  cancelar → la señal queda intacta.
