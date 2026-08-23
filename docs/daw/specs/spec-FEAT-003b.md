# Spec FEAT-003b: Editar y eliminar marcadores de evento (RF-04/05)

| Field | Value |
|-------|-------|
| Ticket | FEAT-003b |
| PRD | docs/daw/prd/prd-FEAT-003b.md |
| Tier | FEATURE |
| Date | 2026-08-23 |
| Spec loops | 0 |

## Summary

`ECGChart` y `MarkerList` son componentes hermanos (ambos hijos de `App.tsx`) sin comunicación entre
sí; hoy el estado de apertura del `MarkerForm` es un `useState` local de `ECGChart`, inaccesible
desde `MarkerList`. Se unifica ese estado en `markersStore` (`formState`, unión discriminada
`{mode:'create', time}` | `{mode:'edit', markerId}` | `null`), con acciones `openCreateForm`,
`openEditForm`, `closeForm`, `updateMarker`, `removeMarker`. `MarkerForm` deja de recibir props desde
su padre y pasa a leer `formState`/`markers` directamente del store, autosuficiente; se monta una
sola vez en `App.tsx`. `ECGChart` reemplaza su `useState` local por llamadas a
`openCreateForm`/`closeForm`. `MarkerList` gana botones "Editar" (llama `openEditForm`) y "Eliminar"
(abre un nuevo `ConfirmDialog`, que reusa el primitivo `Dialog` ya instalado en FEAT-003a).

## Coverage: PRD → blocks

| Requirement | Covered by |
|---|---|
| FR-01 | Block 1, Block 2 |
| FR-02 | Block 1, Block 2 |
| FR-03 | Block 2 |
| FR-04 | Block 4 |
| FR-05 | Block 1, Block 4 |
| NFR-01 | Strategy: `updateMarker`/`removeMarker` reemplazan el array `markers` del store con un nuevo array (`.map()`/`.filter()`); el `useEffect` de `ECGChart` que llama a `drawChart` ya depende de `markers` (introducido en FEAT-003a, Block 5) — cualquier cambio dispara un único pase de redibujado, sin redibujados adicionales por edición/eliminación. |

## Dependencies between blocks

Secuencial: Block 1 → Block 2 → Block 3 → Block 4 → Block 5. Block 2 consume las acciones de Block 1;
Block 3 consume `openCreateForm`/`closeForm` de Block 1; Block 4 consume `openEditForm`/`removeMarker`
de Block 1; Block 5 monta el `MarkerForm` ya autosuficiente de Block 2.

## Block 1 — `markersStore`: `formState` + `updateMarker`/`removeMarker`

**Files**
- `src/frontend/src/state/markersStore.ts` (modified) — agrega `formState`, las acciones de
  apertura/cierre del formulario, y `updateMarker`/`removeMarker`.
- `src/frontend/src/state/markersStore.test.ts` (modified) — tests de las acciones nuevas.

**Data model**
```ts
type MarkerFormState =
  | { mode: 'create'; time: number }
  | { mode: 'edit'; markerId: string }
  | null;

interface MarkersState {
  markers: Marker[];
  formState: MarkerFormState;
  addMarker: (time: number, label: string | null) => void;
  updateMarker: (id: string, label: string | null) => void;
  removeMarker: (id: string) => void;
  openCreateForm: (time: number) => void;
  openEditForm: (markerId: string) => void;
  closeForm: () => void;
  reset: () => void;
}
```
`formState` inicial: `null` (mismo patrón `DEFAULTS` que el resto del store).

**Logic**
- `openCreateForm(time)` → `set({ formState: { mode: 'create', time } })`.
- `openEditForm(markerId)` → `set({ formState: { mode: 'edit', markerId } })`. No valida que
  `markerId` exista en `markers` (esa validación de UI vive en `MarkerForm`, Block 2, que se cierra
  solo si el marcador no existe — ver Block 2).
- `closeForm()` → `set({ formState: null })`.
- `updateMarker(id, label)` → mismo trim + `'' → null` que ya usa `addMarker` (reutilizar la misma
  normalización, no duplicarla); reemplaza el marcador con ese `id` en el array vía `.map()`,
  dejando el resto intacto. Si `id` no existe en `markers`, no hace nada (no-op silencioso, no lanza).
- `removeMarker(id)` → `.filter()` que excluye ese `id`. Si `id` no existe, no-op silencioso.
- `reset()` también limpia `formState` a `null` (además de `markers`), coherente con que es parte del
  mismo store.

**Input validation**
- `label` en `updateMarker`: misma regla que `addMarker` (Block 2 de FEAT-003a) — trim, `'' → null`,
  sin límite adicional aquí (el límite de 200 caracteres se aplica en el `<input>` de `MarkerForm`,
  Block 2 de esta spec, no en el store).

**Error handling**
- Sin condiciones de error: `updateMarker`/`removeMarker` con un `id` inexistente son no-ops
  silenciosos (no hay entrada externa que pueda fallar más allá de eso); `openEditForm` con un
  `markerId` inexistente deja `formState` apuntando a un id sin marcador — el caso está cubierto
  explícitamente por el auto-cierre de `MarkerForm` (Block 2), no por este store.

**Required tests**
- [ ] `updateMarker` reemplaza la etiqueta del marcador con ese `id`, sin tocar los demás.
- [ ] `updateMarker` con label solo-espacios guarda `label: null` (mismo trim que `addMarker`).
- [ ] `updateMarker` con un `id` inexistente no modifica `markers` (no-op).
- [ ] `removeMarker` quita el marcador con ese `id`, sin tocar los demás.
- [ ] `removeMarker` con un `id` inexistente no modifica `markers` (no-op).
- [ ] `openCreateForm`/`openEditForm`/`closeForm` fijan `formState` al valor esperado.
- [ ] `reset()` también deja `formState` en `null`.

**Completion criterion**
Tests de `markersStore.test.ts` verdes; `npm run typecheck` limpio.

## Block 2 — `MarkerForm`: modo `create`/`edit`, autosuficiente

**Files**
- `src/frontend/src/components/MarkerForm.tsx` (modified) — deja de recibir props, lee `formState` y
  `markers` de `markersStore` directamente.
- `src/frontend/src/components/MarkerForm.test.tsx` (modified) — reescribe los tests existentes para
  el nuevo contrato (sin props) y agrega los del modo `edit`.

**Logic**
`MarkerForm` ya no recibe `{ open, time, onConfirm, onCancel }`. En su lugar:
- `formState = useMarkersStore((s) => s.formState)`, `markers = useMarkersStore((s) => s.markers)`.
- `open = formState !== null`.
- Si `formState?.mode === 'create'`: `time = formState.time`, `initialLabel = ''`, título "Nuevo
  marcador", confirmar llama a `addMarker(formState.time, label)` (Block 1 de FEAT-003a) seguido de
  `closeForm()`.
- Si `formState?.mode === 'edit'`: busca `marker = markers.find((m) => m.id === formState.markerId)`.
  - Si `marker` existe: `time = marker.time` (se muestra, sigue de solo lectura — el PRD excluye
    editar el tiempo), `initialLabel = marker.label ?? ''`, título "Editar marcador", confirmar llama
    a `updateMarker(formState.markerId, label)` seguido de `closeForm()`.
  - Si `marker` NO existe (fue eliminado mientras el form estaba abierto — el riesgo que anticipa el
    PRD): un `useEffect` que depende de `[formState, markers]` detecta esta condición y llama
    `closeForm()` inmediatamente, sin renderizar el formulario con datos inconsistentes.
- Cancelar (botón o Escape/click-fuera vía `onOpenChange`) siempre llama solo a `closeForm()`, nunca a
  `addMarker`/`updateMarker`.
- El campo de etiqueta se re-inicializa a `initialLabel` cada vez que `formState` cambia de `null` a
  no-`null` (mismo mecanismo de `useEffect` que ya resetea el label hoy, extendido para partir del
  valor prellenado en vez de siempre `''`).
- `maxLength={200}` en el input de etiqueta se mantiene igual en ambos modos.

**Input validation**
- Igual que en FEAT-003a Block 4: `label` texto libre, `maxLength={200}`, sin restricción de
  formato/caracteres.

**Error handling**
- El caso "el marcador que edito ya no existe" (Block 1) se maneja con auto-cierre, cubierto arriba
  y con test explícito abajo — no se trata como error silencioso sin comportamiento observable.

**Required tests**
- [ ] Modo `create` (AC-02/03/04 de FEAT-003a, regresión): con `formState = {mode:'create', time}`,
      el campo de tiempo muestra ese tiempo, la etiqueta parte vacía, confirmar llama `addMarker`.
- [ ] AC-01: con `formState = {mode:'edit', markerId}` y un marcador existente con esa `id`, el
      formulario abre con la etiqueta prellenada con el valor actual del marcador.
- [ ] AC-02: confirmar en modo edición con una nueva etiqueta llama a `updateMarker(markerId, label)`.
- [ ] AC-03: cancelar en modo edición llama solo a `closeForm()`; `updateMarker` no se invoca y el
      marcador original en el store no cambia.
- [ ] Auto-cierre: con `formState = {mode:'edit', markerId}` apuntando a un `id` que no existe en
      `markers`, el formulario no se muestra (`closeForm()` se invoca automáticamente).
- [ ] El campo de etiqueta sigue teniendo `maxLength={200}` en ambos modos.

**Completion criterion**
Tests de `MarkerForm.test.tsx` verdes; `npm run typecheck` limpio.

## Block 3 — `ECGChart`: usar las acciones del store en vez de estado local

**Files**
- `src/frontend/src/components/ECGChart.tsx` (modified) — elimina `useState<number|null>` local de
  `markerFormTime`, `handleMarkerConfirm`, `handleMarkerCancel` y el `<MarkerForm ... />` inline;
  reemplaza la apertura del formulario en `onMouseUp` (rama `'mark'`) por
  `useMarkersStore.getState().openCreateForm(xToTime(...))` (o el selector de la acción, según el
  patrón ya usado para otras acciones del store en este archivo).
- `src/frontend/src/components/ECGChart.test.tsx` (modified) — ajusta los tests de Block 5 de
  FEAT-003a que dependían del `useState` local/props de `MarkerForm`, para que verifiquen contra
  `markersStore.formState` en su lugar. Ningún AC nuevo se agrega en este bloque (es refactor de
  cableado, los AC-02/03 de FEAT-003a ya están cubiertos y no deben regresar).

**Logic**
El resto del comportamiento de `onMouseDown`/`onMouseMove`/`onMouseUp` (incluida la distinción
crítica de que `onMouseMove` no admite `'mark'`, establecida en FEAT-003a) no cambia. Solo cambia
*qué* se llama al detectar un clic simple con "Marcar" activo: en vez de `setMarkerFormTime(t)`, se
llama a la acción del store `openCreateForm(t)`.

**Error handling**
- Sin condiciones de error nuevas: es un refactor de cableado sobre lógica ya validada en FEAT-003a
  (mismos guards de `visibleWindow`/`MIN_DRAG_PX` sin cambios).

**Required tests**
- [ ] Regresión: clic simple con "Marcar" activo sigue derivando el tiempo correcto vía `xToTime` y
      ahora lo verifica contra `useMarkersStore.getState().formState` en vez de un estado local de
      `ECGChart`.
- [ ] Regresión: el test de "arrastre con Marcar activo no dibuja el rectángulo de selección de zoom"
      (FEAT-003a) sigue pasando sin cambios de comportamiento.

**Completion criterion**
`ECGChart.test.tsx` verde; ningún test de FEAT-003a queda roto; `npm run typecheck` limpio.

## Block 4 — `MarkerList`: botones "Editar"/"Eliminar" + `ConfirmDialog`

**Files**
- `src/frontend/src/components/ConfirmDialog.tsx` (new) — diálogo de confirmación genérico,
  reusando `Dialog`/`DialogContent`/`DialogFooter` de `components/ui/dialog.tsx` (ya instalado en
  FEAT-003a, sin nueva dependencia). Props: `{ open: boolean; title: string; description: string;
  onConfirm: () => void; onCancel: () => void }`.
- `src/frontend/src/components/ConfirmDialog.test.tsx` (new).
- `src/frontend/src/components/MarkerList.tsx` (modified) — agrega botones "Editar" (`aria-label`
  incluyendo el marcador, `onClick` llama `openEditForm(marker.id)`) y "Eliminar" (`onClick` fija un
  `useState<string|null>` local `deletingId` con el `id` del marcador, abriendo el `ConfirmDialog`)
  por cada `<li>`, siguiendo el patrón de `<button>` nativo + `aria-label` + `cn()` ya usado en
  `ChartToolbar.tsx`/`MarkerForm.tsx`.
- `src/frontend/src/components/MarkerList.test.tsx` (modified) — tests nuevos.

**Logic**
`deletingId` es estado local de `MarkerList` (no del store — es puramente "qué `ConfirmDialog` está
abierto en esta lista", no algo que otro componente necesite leer, a diferencia de `formState` que sí
cruza `ECGChart`↔`MarkerList`). El `ConfirmDialog` se renderiza una vez en `MarkerList`, con
`open = deletingId !== null`, mostrando la etiqueta del marcador a eliminar (o "sin etiqueta") en la
`description`, renderizada vía interpolación JSX estándar — nunca HTML, mismo patrón de mitigación
XSS que el resto del ticket (ver `docs/daw/security/threat-FEAT-003b.md`). Confirmar llama
`removeMarker(deletingId)` y `setDeletingId(null)`; cancelar solo `setDeletingId(null)`.

**Input validation**
- No aplica: este bloque no introduce ningún campo de entrada nuevo (los botones no llevan texto
  libre; el `ConfirmDialog` es de solo confirmación).

**Error handling**
- Sin condiciones de error: `openEditForm`/`removeMarker` ya son no-ops seguros ante un `id`
  inexistente (Block 1); no hay entrada de usuario que validar en este bloque.

**Required tests**
- [ ] AC-01: clic en "Editar" de un ítem llama a `openEditForm` con el `id` de ese marcador.
- [ ] AC-04: clic en "Eliminar" abre el `ConfirmDialog` (no elimina inmediatamente).
- [ ] AC-05: confirmar en el diálogo llama a `removeMarker` con el `id` correcto y el marcador
      desaparece de la lista renderizada.
- [ ] AC-06: cancelar en el diálogo no llama a `removeMarker`; el marcador sigue en la lista.
- [ ] `ConfirmDialog`: el texto de `description` con marcado HTML (mismo caso que el test XSS de
      `MarkerList`, FEAT-003a) se renderiza como texto literal, no se interpreta como HTML.

**Completion criterion**
Tests de `MarkerList.test.tsx` y `ConfirmDialog.test.tsx` verdes; `npm run typecheck` limpio.

## Block 5 — `App.tsx`: montar `MarkerForm` autosuficiente

**Files**
- `src/frontend/src/App.tsx` (modified) — agrega `<MarkerForm />` (sin props) al árbol, junto a
  `<MarkerList />`.

**Logic**
Un solo `<MarkerForm />` sirve tanto al flujo de creación (disparado desde `ECGChart`, Block 3) como
al de edición (disparado desde `MarkerList`, Block 4) — ambos solo llaman a acciones del store, sin
conocerse entre sí ni pasarse props.

**Error handling**
- Sin condiciones de error: cambio de composición de árbol, sin lógica propia.

**Required tests**
- [ ] `App.test.tsx` (si no existe, se crea uno mínimo): `<MarkerForm />` está montado en el árbol
      renderizado por `App`.

**Completion criterion**
Suite completa del frontend verde; render manual de la app confirma que "Marcar → clic → crear",
"Editar → prellenado → guardar" y "Eliminar → confirmar" funcionan de punta a punta.

## Final verification

- `npm run typecheck`, `npm run lint`, `npm run test` (suite completa) en verde.
- AC-01 a AC-06 del PRD FEAT-003b verificados por al menos un test automatizado cada uno.
- NFR-01 verificado manualmente: editar/eliminar un marcador no introduce redibujados adicionales
  más allá del único pase ya establecido por FEAT-003a.
- Ningún test de FEAT-001/FEAT-002/FEAT-003a queda roto (regresión cero).
