# Threat Model FEAT-003b: Editar y eliminar marcadores de evento (RF-04/05)

| Field | Value |
|-------|-------|
| Ticket | FEAT-003b |
| Spec | docs/daw/specs/spec-FEAT-003b.md |
| Date | 2026-08-23 |

## Componentes nuevos/modificados (spec-FEAT-003b.md)

1. `markersStore` — `formState` (unión discriminada), `updateMarker`, `removeMarker`,
   `openCreateForm`/`openEditForm`/`closeForm` (Block 1).
2. `MarkerForm` — pasa a ser autosuficiente, lee `formState`/`markers` directamente del store,
   soporta modo `edit` con prellenado (Block 2).
3. `ECGChart` — refactor de cableado, sin superficie nueva (Block 3).
4. `MarkerList` — botones "Editar"/"Eliminar" por ítem (Block 4).
5. `ConfirmDialog` — componente nuevo, diálogo de confirmación reusando `Dialog` de
   `@radix-ui/react-dialog` (ya instalado en FEAT-003a, sin nueva dependencia) (Block 4).
6. `App.tsx` — composición del árbol (Block 5), sin lógica propia.

## Trust boundaries

Sin cambios respecto a `docs/daw/security/threat-FEAT-003a.md`: sigue siendo una app front-end pura
sin backend nuevo. La única frontera de confianza relevante es **usuario (input de teclado en el
`<input>` de `MarkerForm`, ya existente) → estado de React/`markersStore`**. Este ticket no agrega
ninguna frontera nueva: `updateMarker`/`removeMarker` operan sobre el mismo store en memoria, sin
red ni persistencia (RF-15 sigue fuera de alcance). `ConfirmDialog` no introduce un campo de entrada
nuevo — solo confirma una acción sobre datos ya existentes en el store.

## Análisis STRIDE por componente

### 1. `markersStore` (`updateMarker`/`removeMarker`/`formState`)

| Categoría | Análisis |
|---|---|
| Spoofing / Repudiation / Elevation of Privilege | N/A — sin identidad de usuario ni multi-usuario, igual que FEAT-003a. |
| Tampering | N/A — store en memoria, sin persistencia ni sincronización externa. |
| Information Disclosure | Sin cambio respecto a FEAT-003a: `label` sigue siendo texto libre que el usuario decide escribir, sin salir del navegador en este ticket. |
| Denial of Service | `openEditForm`/`updateMarker`/`removeMarker` con un `id` inexistente son no-ops explícitos (spec Block 1) — no hay excepción no controlada que pueda colgar la UI. |

### 2. `MarkerForm` (modo edit, prellenado) y `ConfirmDialog` (descripción con la etiqueta del marcador)

| Categoría | Análisis |
|---|---|
| **Information Disclosure** | 🔴 Riesgo heredado de FEAT-003a: si `ConfirmDialog` insertara la etiqueta del marcador (para el mensaje "¿Eliminar 'X'?") vía `dangerouslySetInnerHTML` en vez de interpolación JSX, sería el mismo vector de XSS ya mitigado en FEAT-003a (CWE-79 / F-SAST-06) — self-XSS, sin servidor de por medio, pero real. `MarkerForm` en modo `edit` prellena el `<input>` con `marker.label` vía el atributo `value` controlado de React, que no interpreta HTML — no reintroduce el riesgo. |
| Denial of Service | El auto-cierre de `MarkerForm` cuando el marcador editado deja de existir (Block 2) evita que el formulario quede en un estado inconsistente indefinidamente (p. ej. mostrando datos de un marcador ya eliminado). |
| Elevation of Privilege | N/A. |

## Riesgos identificados

| Riesgo | STRIDE | Likelihood | Impact | Mitigación |
|---|---|---|---|---|
| XSS si la etiqueta del marcador se renderiza sin escapar en `ConfirmDialog` (mensaje de confirmación de borrado) | Information Disclosure | Low | High | **Mitigación obligatoria, folded into spec**: `ConfirmDialog`/`MarkerList` renderizan `description`/la etiqueta vía interpolación JSX estándar, nunca `dangerouslySetInnerHTML`. Test explícito agregado en Block 4 ("el texto de `description` con marcado HTML se renderiza como texto literal"). |
| Formulario de edición queda referenciando un marcador eliminado (carrera entre "Editar" y "Eliminar" sobre el mismo marcador) | Denial of Service (UI inconsistente) | Low | Low | Ya mitigado en diseño: Block 2 auto-cierra `MarkerForm` si `formState.markerId` no existe en `markers`, con test explícito. |

No hay datos nuevos clasificables como PII/credenciales/financieros en este ticket (F-TM-05 N/A,
igual que FEAT-003a): sigue siendo la misma etiqueta de texto libre ya evaluada, ahora editable en
vez de solo creable. F-TM-07 no aplica: no hay datos sensibles clasificados que cifrar.

## Mitigaciones a incorporar en la spec

1. **Block 4 (`ConfirmDialog`/`MarkerList`)**: renderizado de la etiqueta vía JSX estándar + test
   explícito de XSS — ya incorporado en la spec (`spec-FEAT-003b.md`, Block 4, sección Logic y
   Required tests).

No se requieren cambios adicionales a la spec: ambas mitigaciones ya estaban contempladas en el
diseño antes de este análisis formal.
