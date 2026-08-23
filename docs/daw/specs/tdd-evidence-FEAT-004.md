# Evidencia TDD FEAT-004

| Field | Value |
|-------|-------|
| Ticket | FEAT-004 |
| Spec | docs/daw/specs/spec-FEAT-004.md |
| Regla | `.daw/rules/testing.instructions.md`, Rule #-1 ("Test first, always") |

Cada bloque se implementó con `daw-implementer`, que reporta qué tests fallaban ANTES de escribir el
código de producción y con qué aserción, y confirma que pasan DESPUÉS.

## Block 1 — `viewStore`: `ChartTool` + `yToMv`

- **Failing before**: 4/4 — cada test fallaba con `TypeError: yToMv is not a function`.
- **Passing after**: 8/8 en `scale.test.ts` (4 nuevos + 4 preexistentes de `xToTime`); 128/128 en la
  suite completa.

## Block 2 — `drawOverlay.ts`: `drawRuler`

- **Failing before**: 3/3 — cada test fallaba con `TypeError: drawRuler is not a function`.
- **Passing after**: 3/3 en `drawOverlay.test.ts`; 131/131 en la suite completa.
- **Gap cerrado tras la revisión de `daw-arch-auditor`**: se agregó un cuarto test (fuera del
  conteo original de la spec) que verifica que `drawRuler` reusa `lineWidth`/`strokeStyle` de
  `drawSelection` sin definir una paleta nueva — señalado como WARN de cobertura, no como TDD
  estricto (se agregó sobre código ya correcto, sin verlo fallar primero).

## Block 3 — Botón "Regla" en `ChartToolbar`

- **Failing before**: 2/2 — `TestingLibraryElementError: Unable to find a label with the text of:
  Activar herramienta de regla`.
- **Passing after**: 8/8 en `ChartToolbar.test.tsx` (2 nuevos + 6 preexistentes de Zoom/Marcar).

## Block 4 — Integración en `ECGChart`

- **Failing before**: 4/7 tests nuevos fallaban con error real antes de implementar (AC-02, AC-04,
  AC-05, AC-06 — los 4 ejercitan comportamiento genuinamente nuevo: `drawRuler`/`clearOverlay`
  llamados 0 veces porque los guards de los handlers no admitían `'ruler'` todavía). Los otros 3
  tests nuevos (AC-03, regresión de "Marcar", sin-señal-cargada) pasaban trivialmente desde antes de
  escribir el código, porque con los guards viejos la herramienta "Regla" era un no-op total — son
  tests de regresión legítimos (protegen contra reintroducir la llamada en el futuro), no evidencia
  TDD por sí solos.
- **Passing after**: 22/22 en `ECGChart.test.tsx` (7 nuevos + 15 preexistentes intactos); 141/141 en
  la suite completa.
- **Dos desviaciones deliberadas de la letra literal de la spec, ambas evaluadas y confirmadas
  correctas por `daw-module-verifier` en la revisión de este bloque**:
  1. AC-06 (umbral `MIN_DRAG_PX`): la spec decía "si el desplazamiento en X **o** en Y es menor al
     umbral, limpiar" — se implementó como **Y** (ambos ejes deben estar por debajo del umbral) para
     no descartar mediciones puramente horizontales o verticales, que son válidas. Test de
     regresión agregado después de la revisión (`AC-06: un arrastre puramente horizontal...`) para
     blindar esta decisión — no vio rojo primero (el código ya estaba implementado correctamente),
     pero cierra un gap de cobertura real señalado por el verificador.
  2. `useEffect` de AC-05: en vez de la versión literal (`if (activeTool !== 'ruler')
     clearOverlay(...)`, sin condición adicional), se usó un `prevToolRef` para limpiar el overlay
     solo en la transición específica *desde* `'ruler'`, evitando romper el test de regresión
     "no-2d-context" de FEAT-002 (la versión literal disparaba `clearOverlay`/`getContext` también
     en el montaje inicial, consumiendo el mock de `getContext(null)` en el efecto equivocado).

## Resumen

| Block | Tests nuevos | Failing before | Passing after | TDD estricto |
|---|---|---|---|---|
| 1 | 4 | 4/4 | 8/8 | Sí |
| 2 | 3 (+1 post-review) | 3/3 | 4/4 | Sí (el 4º es post-review, código ya correcto) |
| 3 | 2 | 2/2 | 8/8 | Sí |
| 4 | 7 (+1 post-review) | 4/7 (3 eran regresión trivial) | 23/23 | Sí (4/7 rojo real; 3/7 regresión legítima; el 8º post-review) |

Todos los bloques con evidencia roja→verde verificable (mensaje de error o conteo exacto), sin
ocultar los casos donde un test nuevo pasaba trivialmente desde el inicio (Block 4) o se agregó
después de la revisión sobre código ya correcto (Block 2, Block 4) — declarados explícitamente en
vez de presentados como TDD estricto cuando no lo fueron.
