# Spec FEAT-003a: Crear y listar marcadores de evento (RF-03)

| Field | Value |
|-------|-------|
| Ticket | FEAT-003a |
| PRD | docs/daw/prd/prd-FEAT-003a.md |
| Tier | FEATURE |
| Date | 2026-08-23 |
| Spec loops | 2 |

## Summary

Se agrega una herramienta "Marcar" a `ChartToolbar` (mutuamente excluyente con "Zoom" vía
`activeTool` en `viewStore`). Con la herramienta activa, un clic simple (sin arrastre) sobre
`ECGChart` calcula el instante de tiempo del clic con una nueva función `xToTime` (extraída del
cierre privado que hoy vive dentro de `zoom.ts`) y abre un diálogo shadcn/ui (`Dialog`) para
confirmar o cancelar la creación de un marcador con etiqueta libre. Los marcadores se guardan en un
nuevo store Zustand (`markersStore`, sin persistencia, siguiendo el patrón de `viewStore`/
`signalStore`) con `id` estable (`crypto.randomUUID()`). Se renderizan como parte del mismo pase de
`drawChart` (no del overlay de selección, que es efímero) para no violar RNF-02, y se listan en un
panel colapsable (`MarkerList`) debajo del gráfico, ordenados cronológicamente.

**Nueva dependencia:** `shadcn/ui` (vía `@radix-ui/react-dialog` + `lucide-react`), justificada
porque `AGENTS.md` ya documenta `components/ui/` con shadcn/ui como convención de UI del proyecto,
pero el paquete nunca se instaló; este ticket es el primero en necesitar un diálogo modal accesible
(foco atrapado, cierre con Escape, overlay) que no vale la pena reimplementar a mano.

## Coverage: PRD → blocks

| Requirement | Covered by |
|---|---|
| FR-01 | Block 3 |
| FR-02 | Block 1, Block 5 |
| FR-03 | Block 2, Block 4, Block 5 |
| FR-04 | Block 4 |
| FR-05 | Block 2, Block 6 |
| NFR-01 | Strategy: `markersStore` vive solo en memoria (Zustand sin middleware de persistencia), igual que `viewStore`/`signalStore`; se vacía con `reset()` y no se serializa a ningún storage. |
| NFR-02 | Strategy: los marcadores se dibujan dentro del mismo `useEffect`/`drawChart` que ya redibuja el canvas base ante cambios de `signal`/`visibleWindow`/`gridVisible` (Block 5), agregando `markers` a las dependencias — un único pase de render, sin redibujados adicionales por marcador ni por marcador individual. |

## Dependencies between blocks

Secuencial: Block 1 → Block 2 → Block 3 → Block 4 → Block 5 → Block 6. Cada bloque consume tipos o
funciones del anterior (tipos y `xToTime` en 1; store en 2; toggle de herramienta en 3; diálogo en
4; integración de clic + render en 5; consumo de la lista para el panel en 6).

## Block 1 — Dependencias, tipos y utilidad de conversión pixel→tiempo

**Files**
- `src/frontend/package.json` (modified) — agrega `@radix-ui/react-dialog`, `lucide-react`.
- `src/frontend/src/lib/ecg/chart/scale.ts` (modified) — exporta `xToTime(x: number, window: TimeWindow, dims: ChartDims): number`, inversa de `timeToX` (usa el mismo tipo `TimeWindow = { fromTime: number; toTime: number }` ya definido en `lib/ecg/chart/types.ts` y usado por `timeToX`/`pixelRangeToWindow`/`drawChart`).
- `src/frontend/src/lib/ecg/chart/zoom.ts` (modified) — reemplaza el `xToTime` privado por el importado desde `scale.ts` (elimina la duplicación).
- `src/frontend/src/lib/ecg/chart/types.ts` (modified) — agrega `export interface Marker { id: string; time: number; label: string | null }`.
- `src/frontend/src/state/viewStore.ts` (modified) — `ChartTool = 'none' | 'zoom' | 'mark'`.
- `src/frontend/src/lib/ecg/chart/scale.test.ts` (modified) — tests de `xToTime`.
- `src/frontend/src/lib/ecg/chart/zoom.test.ts` (modified) — verifica que `zoom.ts` sigue funcionando igual tras usar el `xToTime` compartido (no debe romper AC de FEAT-002).

**Logic**
`xToTime` invierte la fórmula de `timeToX` (interpolación lineal entre `window.start`/`window.end` y
el ancho útil del canvas, descontando `dims.padding.left`/`right`). `zoom.ts` deja de declarar su
propia copia y la importa; su comportamiento observable no cambia (mismos tests de FEAT-002 deben
seguir en verde).

**Error handling**
- Si `x` cae fuera del área útil del canvas (antes de `padding.left` o después del ancho menos
  `padding.right`), `xToTime` clampa el resultado a `window.start`/`window.end` respectivamente —
  nunca devuelve un tiempo fuera de la ventana visible.

**Required tests**
- [ ] `xToTime` es la inversa de `timeToX` para varios puntos dentro del área útil (round-trip).
- [ ] `xToTime` clampa correctamente en los bordes del canvas.
- [ ] Suite existente de `zoom.test.ts` sigue pasando sin cambios de comportamiento.

**Completion criterion**
`npm run typecheck` limpio; tests de `scale.test.ts` y `zoom.test.ts` verdes.

## Block 2 — `markersStore`

**Files**
- `src/frontend/src/state/markersStore.ts` (new) — store Zustand de marcadores.
- `src/frontend/src/state/markersStore.test.ts` (new).

**Data model**
`Marker` (definido en Block 1): `id: string` (UUID vía `crypto.randomUUID()`), `time: number`
(segundos, mismo dominio que `visibleWindow` de `viewStore`), `label: string | null`.

**Logic**
```ts
interface MarkersState {
  markers: Marker[];
  addMarker: (time: number, label: string | null) => void;
  reset: () => void;
}
```
`addMarker` crea el `Marker` con `id: crypto.randomUUID()` y lo agrega al array; no ordena en el
store (el orden cronológico es una preocupación de lectura, resuelta por un selector/derivado en
Block 6, para no pagar el costo de un `sort()` en cada `addMarker`). `reset()` vacía `markers`, igual
patrón que `viewStore`/`signalStore`. Sin store cruzado (coherente con ADR-001): `markersStore` no
importa `viewStore` ni `signalStore`.

**Input validation**
- `label`: si viene string vacío tras `trim()`, se guarda como `null` (evita etiquetas
  "en blanco" indistinguibles de "sin etiqueta" en la lista, ver AC-05 del PRD).

**Error handling**
- Sin condiciones de error: `addMarker` no valida entrada externa más allá del `trim()` ya
  documentado en Input validation; no hay límites, red ni parsing que puedan fallar en este bloque.

**Required tests**
- [ ] `addMarker` agrega un marcador con `id` no vacío y único entre dos llamadas.
- [ ] `addMarker` con label `"  "` (solo espacios) guarda `label: null`.
- [ ] `reset()` vacía `markers`.

**Completion criterion**
Tests de `markersStore.test.ts` verdes.

## Block 3 — Botón "Marcar" en `ChartToolbar`

**Files**
- `src/frontend/src/components/ChartToolbar.tsx` (modified) — nuevo botón toggle.
- `src/frontend/src/components/ChartToolbar.test.tsx` (modified).

**Logic**
Sigue el patrón exacto de los botones existentes (`isXActive ? 'border-sky-600 bg-sky-600...' :
'border-slate-300...'`, selector granular `useViewStore((s) => s.activeTool)`), agregando un botón
con `aria-label="Activar herramienta de marcador"` y `aria-pressed={activeTool === 'mark'}` que
llama a `setActiveTool(activeTool === 'mark' ? 'none' : 'mark')` (misma acción ya usada por el botón
de Zoom, sin duplicar lógica).

**Error handling**
- Sin condiciones de error: alternar `activeTool` es una asignación de un enum interno, sin entrada
  externa ni posibilidad de fallo.

**Required tests**
- [ ] AC-01: clic en el botón "Marcar" alterna `activeTool` a `'mark'` y de vuelta a `'none'`.
- [ ] Activar "Marcar" mientras "Zoom" está activo desactiva "Zoom" (exclusión mutua ya garantizada
      por `activeTool` ser un único valor — test de regresión, no lógica nueva).

**Completion criterion**
Tests de `ChartToolbar.test.tsx` verdes.

## Block 4 — `MarkerForm` (diálogo shadcn/ui)

**Files**
- `src/frontend/src/components/ui/dialog.tsx` (new) — primitivo generado por shadcn/ui (`Dialog`,
  `DialogContent`, `DialogHeader`, `DialogFooter`, `DialogTitle`) sobre `@radix-ui/react-dialog`.
- `src/frontend/src/components/MarkerForm.tsx` (new) — formulario de creación.
- `src/frontend/src/components/MarkerForm.test.tsx` (new).

**Logic**
`MarkerForm` recibe por props `{ open: boolean; time: number | null; onConfirm: (label: string |
null) => void; onCancel: () => void }`. Muestra el tiempo fijado formateado (reusa el mismo
formateador de tiempo que usará `MarkerList`, ver Block 6 — se define una función compartida
`formatMarkerTime(time: number): string` en `src/frontend/src/lib/ecg/chart/format.ts` (new,
pequeño, usado por ambos) como parte de este bloque) en un campo de solo lectura (no editable, per
AC-02), y un `<input>` nativo de texto para la etiqueta (coherente con AGENTS.md: "`select`/`input`
son nativos estilados, no Radix"). Confirmar llama a `onConfirm(label)`; cancelar o cerrar el diálogo
(Escape/click fuera, comportamiento propio de Radix Dialog) llama a `onCancel()` sin crear nada
(AC-04).

**Input validation**
- `label`: texto libre, máximo 200 caracteres (validado en el `<input maxLength={200}>` y reforzado
  al confirmar); sin restricción de formato/caracteres permitidos, coherente con "etiqueta libre" del
  PRD. Un intento de superar el máximo simplemente no permite tipear más (comportamiento nativo de
  `maxLength`), no hay mensaje de error adicional que mostrar.

**Error handling**
- Sin condiciones de error adicionales: la única entrada (`label`) queda acotada por `maxLength`, sin
  otro caso de fallo posible en este bloque (no hay red, no hay parsing).

**Required tests**
- [ ] AC-02: con `open=true` y `time` fijado, el campo de tiempo muestra el valor formateado y es de
      solo lectura (no se puede editar).
- [ ] AC-03: confirmar con una etiqueta llama a `onConfirm` con esa etiqueta.
- [ ] AC-04: cancelar (botón, o Escape) llama a `onCancel` y no a `onConfirm`.
- [ ] El campo de etiqueta tiene `maxLength={200}` y no acepta más caracteres allá de ese límite.

**Completion criterion**
Tests de `MarkerForm.test.tsx` verdes.

## Block 5 — Integración de clic en `ECGChart` + render de marcadores

**Files**
- `src/frontend/src/components/ECGChart.tsx` (modified) — rama `activeTool === 'mark'` en
  `onMouseDown/onMouseMove/onMouseUp`, estado local de diálogo abierto, integración de `MarkerForm`.
- `src/frontend/src/components/render/drawMarkers.ts` (new) — dibuja los marcadores existentes sobre
  el canvas base (línea vertical + indicador en el instante `time`, convertido a X vía `timeToX`).
  Cualquier texto de `label` se pinta con `ctx.fillText(...)` (API de texto del Canvas), nunca vía
  inserción de HTML — mitigación de XSS (`docs/daw/security/threat-FEAT-003a.md`).
- `src/frontend/src/components/render/drawChart.ts` (modified) — invoca `drawMarkers` dentro del
  mismo pase de dibujo, recibiendo `markers` como parámetro adicional.
- `src/frontend/src/components/ECGChart.test.tsx` (modified).
- `src/frontend/src/components/render/drawMarkers.test.ts` (new).

**Logic**
Reusa el mecanismo existente de `dragStartXRef` + `MIN_DRAG_PX`. Hoy los tres handlers
(`onMouseDown`/`onMouseMove`/`onMouseUp`) comparten el mismo guard `if (activeTool !== 'zoom')
return;`; se cambia cada uno individualmente, no con un guard único, porque `onMouseMove` **no** debe
admitir `'mark'`:

- `onMouseDown`: guard pasa a `if (activeTool !== 'zoom' && activeTool !== 'mark') return;` — arranca
  `dragStartXRef` igual que hoy, para ambas herramientas.
- `onMouseMove`: **sin cambios**, sigue con `if (activeTool !== 'zoom') return;`. Con `'mark'` activo
  nunca llama a `drawSelection` — no hay rectángulo de selección para "Marcar", solo para "Zoom". Esto
  es intencional: evita que un arrastre con "Marcar" activo dibuje el overlay de zoom.
- `onMouseUp`: guard pasa a `if (activeTool !== 'zoom' && activeTool !== 'mark') return;`. Con
  `activeTool === 'mark'`: si el desplazamiento entre `dragStartXRef.current` y la posición final es
  menor a `MIN_DRAG_PX`, cuenta como "clic simple" → se calcula `xToTime(x, visibleWindow, DIMS)`
  (Block 1) y se abre `MarkerForm` con ese tiempo fijado en estado local (`useState`). Si el
  desplazamiento es mayor o igual a `MIN_DRAG_PX`, no hace nada (no es zoom porque la herramienta no
  es `'zoom'`, y tampoco crea marcador — comportamiento fuera de alcance del PRD, se ignora
  silenciosamente; como `onMouseMove` nunca dibujó selección para `'mark'`, no queda overlay que
  limpiar). En ambos casos `dragStartXRef.current` se resetea a `null` al final, igual que hoy.

`DIMS` se exporta desde `ECGChart.tsx` para que `xToTime`/`drawMarkers` lo consuman sin duplicarlo.
`onConfirm` del `MarkerForm` llama a `markersStore.addMarker(time, label)` y cierra el diálogo;
`onCancel` solo cierra el diálogo. El `useEffect` que llama a `drawChart` (líneas 56-63 existentes)
agrega `markers` (de `useMarkersStore((s) => s.markers)`) a su arreglo de dependencias y se lo pasa a
`drawChart`, que a su vez llama a `drawMarkers(ctx, markers, visibleWindow, DIMS)` — un único pase,
sin redibujado adicional por marcador (NFR-02).

**Error handling**
- Si `visibleWindow` es `null`/no hay señal cargada, la herramienta "Marcar" no abre el diálogo al
  hacer clic (no hay tiempo válido que fijar) — comportamiento análogo al de "Zoom" sin señal.

**Required tests**
- [ ] AC-02: clic simple con "Marcar" activo abre el `MarkerForm` con el tiempo correcto (mapeo
      pixel→tiempo verificado contra un `visibleWindow` conocido).
- [ ] Un arrastre (`mouseDown` + `mouseMove` + `mouseUp` con delta ≥ `MIN_DRAG_PX`) con "Marcar"
      activo NO abre el formulario.
- [ ] Un arrastre con "Marcar" activo NO dibuja el rectángulo de selección de zoom en el overlay
      (`drawSelection` no es invocado mientras `activeTool === 'mark'`, incluso durante `mouseMove`).
- [ ] AC-03: confirmar en el formulario agrega el marcador a `markersStore` y dispara un redibujado
      que incluye el nuevo marcador (verificado mockeando `drawMarkers`/inspeccionando llamadas al
      `ctx`, mismo patrón que los tests existentes de `ECGChart`).
- [ ] `drawMarkers` dibuja un marcador por cada elemento de `markers` en la posición X esperada según
      `timeToX`, y ninguno si `markers` está vacío.
- [ ] Clic con "Marcar" activo y sin señal cargada (`visibleWindow` nulo) no abre el formulario.

**Completion criterion**
Tests de `ECGChart.test.tsx` y `drawMarkers.test.ts` verdes; `npm run test` completo sigue verde
(incluye FEAT-001/FEAT-002 sin regresión).

## Block 6 — `MarkerList` (panel colapsable)

**Files**
- `src/frontend/src/components/MarkerList.tsx` (new) — panel colapsable con la lista ordenada.
- `src/frontend/src/components/MarkerList.test.tsx` (new).
- `src/frontend/src/components/layout/AppLayout.tsx` o el layout donde vive `ECGChart` (modified) —
  monta `MarkerList` debajo del gráfico. *(Impact scan pendiente de confirmar el nombre exacto del
  archivo de layout que renderiza `ECGChart`; se ajusta al nombre real al implementar el bloque.)*

**Logic**
`MarkerList` lee `markers` de `markersStore`, deriva la lista ordenada con
`[...markers].sort((a, b) => a.time - b.time)` (derivado en el componente, no en el store — evita
ordenar en cada `addMarker`), y renderiza cada ítem con `formatMarkerTime(marker.time)` (compartida
con `MarkerForm`, Block 4) y `marker.label ?? 'Sin etiqueta'`. `label` se renderiza vía interpolación
JSX estándar (`{marker.label}`), nunca `dangerouslySetInnerHTML` — mitigación de XSS
(`docs/daw/security/threat-FEAT-003a.md`). El panel colapsable usa el elemento nativo
`<details>`/`<summary>` (sin nueva dependencia, coherente con "HTML nativo estilado" del proyecto)
con un `<summary>` que muestra la cantidad de marcadores.

**Error handling**
- Sin condiciones de error: `MarkerList` solo lee y renderiza `markers` ya validados por
  `markersStore`; no introduce entrada de usuario nueva.

**Required tests**
- [ ] AC-05: con marcadores en distinto orden de creación, la lista se muestra ordenada
      cronológicamente por `time`.
- [ ] Un marcador con `label: null` se muestra con el texto "Sin etiqueta".
- [ ] El panel es colapsable (alternar `<details open>` oculta/muestra la lista).
- [ ] Un marcador con `label` conteniendo marcado HTML (p. ej. `<img onerror=alert(1)>`) se renderiza
      como texto literal en el DOM, no se interpreta como HTML (mitigación XSS,
      `docs/daw/security/threat-FEAT-003a.md`).

**Completion criterion**
Tests de `MarkerList.test.tsx` verdes.

## Final verification

- `npm run typecheck`, `npm run lint`, `npm run test` (suite completa del frontend) en verde.
- AC-01 a AC-05 del PRD FEAT-003a verificados por al menos un test automatizado cada uno (ver
  columna "Covered by" arriba).
- NFR-02 verificado manualmente: con varios marcadores creados, mover la ventana visible (pan/zoom
  de FEAT-002) no degrada el frame rate por debajo del umbral ya validado en FEAT-002 (no hay
  redibujado adicional introducido por marcador).
- Ningún test de FEAT-001/FEAT-002 queda roto (regresión cero).
