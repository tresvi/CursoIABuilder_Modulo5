# Evidencia TDD FEAT-003a

| Field | Value |
|-------|-------|
| Ticket | FEAT-003a |
| Spec | docs/daw/specs/spec-FEAT-003a.md |
| Regla | `.daw/rules/testing.instructions.md`, Rule #-1 ("Test first, always") |

Cada bloque se implementó con `daw-implementer`, que reporta qué tests fallaban ANTES de escribir el
código de producción y con qué aserción, y confirma que pasan DESPUÉS. Este documento persiste esa
evidencia (capturada en los reportes de cada agente durante CODE) para que quede verificable en el
repo, no solo en la conversación que la produjo.

## Block 1 — Dependencias, tipos y `xToTime`

- **Failing before**: 4/4 en `scale.test.ts` — las 4 aserciones fallaban con
  `TypeError: xToTime is not a function` (la función aún no existía).
- **Passing after**: 8/8 (`scale.test.ts` + `zoom.test.ts`).
- `zoom.test.ts` (4/4) pasaba desde antes de tocar `zoom.ts` — es intencional: es el test de
  regresión que confirma que el refactor (usar el `xToTime` compartido) no cambia el comportamiento
  observable de `pixelRangeToWindow`, no un test que deba fallar primero.

## Block 2 — `markersStore`

- **Failing before**: la suite completa fallaba al no resolver el import
  (`Failed to resolve import './markersStore'`) — el módulo no existía.
- **Passing after**: 6/6 en `markersStore.test.ts`.

## Block 3 — Botón "Marcar" en `ChartToolbar`

- **Failing before**: 2/2 — `TestingLibraryElementError: Unable to find a label with the text of:
  Activar herramienta de marcador` (el botón no existía).
- **Passing after**: 6/6 en `ChartToolbar.test.tsx` (2 nuevos + 4 preexistentes de FEAT-002).

## Block 4 — `MarkerForm`

- **Failing before**: la suite fallaba al no resolver el import (`Failed to resolve import
  './MarkerForm'`) — el componente no existía.
- **Passing after**: 4/4 en `MarkerForm.test.tsx`.
- **Gap cerrado después del module-verifier de Block 4**: la spec pedía explícitamente testear
  cancelar "(botón, o Escape)" y solo se cubrió el botón. Agregué el test de Escape directamente
  (`MarkerForm.test.tsx`, "AC-04: cerrar con Escape...") sobre el componente ya implementado y
  correcto — este test **no seguyó TDD estricto** (no se vio fallar primero, porque el comportamiento
  de `onOpenChange` de Radix ya estaba bien implementado desde que se escribió Block 4). Se registra
  como excepción explícita: cierra una brecha de cobertura sobre código ya correcto, no documenta un
  cambio de comportamiento nuevo.

## Block 5 — Integración de clic en `ECGChart` + render de marcadores

- **Failing before**: 8/8 nuevos tests (3 en `drawMarkers.test.ts` por import faltante; 5 en
  `ECGChart.test.tsx` con `TypeError: Cannot read properties of undefined (reading 'length')` en
  `drawMarkers`, porque `ECGChart` aún no pasaba `markers` a `drawChart`). Este segundo error además
  rompía 10/15 tests YA EXISTENTES del archivo antes del fix, confirmando que el cambio era necesario
  y no solo aditivo.
- **Passing after**: 18/18 (`drawMarkers.test.ts` + `ECGChart.test.tsx` completos).
- El test crítico "un arrastre con Marcar activo NO dibuja el rectángulo de selección de zoom
  durante mousemove" se agregó junto con el resto del bloque; `onMouseMove` no se tocó (por diseño
  de la spec), así que el guard correcto ya estaba en su lugar — el valor del test es de regresión
  explícita, verificado en verde tras el resto de los cambios del bloque.

## Block 6 — `MarkerList`

- **Failing before**: la suite fallaba al no resolver el import (`Failed to resolve import
  './MarkerList'`) — el componente no existía.
- **Passing after**: 4/4 en `MarkerList.test.tsx`.
- **Gap cerrado después del module-verifier de Block 6**: el test "panel colapsable" solo verificaba
  el estado inicial (`<details open>`), no la alternancia real. Agregué dos aserciones de
  `fireEvent.click` sobre el `<summary>` verificando que el atributo `open` se remueve y se repone —
  igual que en Block 4, esto cierra cobertura sobre comportamiento nativo del navegador (`<details>`)
  ya correcto, no TDD estricto sobre un cambio nuevo de comportamiento.

## Resumen

| Block | Tests nuevos | Failing before | Passing after | TDD estricto |
|---|---|---|---|---|
| 1 | 8 | 4/4 (scale.test.ts) | 8/8 | Sí |
| 2 | 6 | suite rota (import) | 6/6 | Sí |
| 3 | 2 | 2/2 | 6/6 | Sí |
| 4 | 5 (4 + 1 gap) | 1/1 (import) + gap sin rojo previo | 5/5 | Parcial (ver nota) |
| 5 | 8 | 8/8 (+10 regresiones) | 18/18 | Sí |
| 6 | 5 (4 + 2 assertions) | suite rota (import) + gap sin rojo previo | 4/4 | Parcial (ver nota) |

Los dos casos "parcial" son cierres de brechas de cobertura señaladas por `daw-module-verifier`
sobre código que ya era correcto (no bugs), no implementación nueva sin test previo — están
documentados explícitamente arriba en vez de omitidos.
