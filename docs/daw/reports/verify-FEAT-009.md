# Verificación FEAT-009: Interfaz gráfica según referencia visual

| Campo | Valor |
|-------|-------|
| Ticket | FEAT-009 |
| Tier | FEATURE |
| Fecha | 2026-08-26 |
| Rondas | 1 (sin bucle correctivo) |
| PRD | `docs/daw/prd/prd-FEAT-009.md` (9 FR, 3 NFR, 12 AC) |
| Spec | `docs/daw/specs/spec-FEAT-009.md` (6 bloques) |
| Veredicto | **PASSED** — 0 FAILs, 6 WARNs, 1 desvío aceptado |

## Resumen

| Regla | Resultado |
|---|---|
| F-VER-01 — AC con código y test | ✅ 12/12 |
| F-VER-02 / F-VER-06 — tareas y tests de la spec | ⚠️ 31/32 tests (ver W-01) |
| F-VER-03 — cobertura ≥80/80/80 | ✅ 97% stmts · 90.05% branches · 99.5% funcs · 98.62% lines |
| F-VER-04 — sad paths | ✅ |
| F-VER-05 — lint / typecheck | ✅ eslint 0, `tsc --noEmit` 0, `dotnet format` sin diferencias |
| W-VER-01 — código muerto | ⚠️ ver W-04 |
| W-VER-03 — tests frágiles | ⚠️ ver W-05, W-06 |

Suite: **302 tests verdes** (265 front + 37 back).

Cobertura sobre el código nuevo del ticket (`src/components/layout/**`): **100% en las cuatro
métricas** (19/19 stmts, 13/13 branches, 11/11 funcs, 16/16 lines).

## Método

La verificación **no se hizo por lectura**. Cada AC se comprobó por mutación: se rompió la
implementación y se observó qué test moría. 11 mutaciones aplicadas y revertidas, con el árbol
restaurado y verificado por hash al cierre.

Hallazgo del método: **la mutación M3** (`<button disabled>` con un `onClick` que muta el store)
**no la detecta ningún test conductual** — 19/19 en verde. Es lo que motiva W-02.

## Los 12 AC

| AC | Implementación | Test |
|---|---|---|
| AC-01 | `AppLayout.tsx:15`, `Sidebar.tsx:11`, `SidebarSection.tsx:16` | `AppLayout.test.tsx:6`, `App.test.tsx:56` |
| AC-02 | `FileSection.tsx:19`, `DisabledMenuItem.tsx:14` | `FileSection.test.tsx:42` |
| AC-03 | `App.tsx:19-26` | `App.test.tsx:117` |
| AC-04 | `App.tsx:27-29` | `App.test.tsx:130` + `FilterPanel.test.tsx:32` |
| AC-05 | `MainPanel.tsx:32-33`, `EmptyState.tsx:11` | `MainPanel.test.tsx:51`, `EmptyState.test.tsx:23/38/45`, `App.test.tsx:239` |
| AC-06 | `MainPanel.tsx:36-50` | `MainPanel.test.tsx:64`, `App.test.tsx:248` |
| AC-07 | `ExampleLoader.tsx:56`, `samples.ts:62` | `ExampleLoader.test.tsx:31/70` |
| AC-08 | `DisabledMenuItem.tsx:14` | `FileSection.test.tsx:75` + guarda de tipos `:139` |
| AC-09 | `ExampleLoader.tsx:79-82`, `signalStore.ts:73` | `FileSection.test.tsx:119`, `App.test.tsx:263` |
| AC-10 | `TopBar.tsx:17`, `duration.ts:9` | `TopBar.test.tsx:18/34/54/65` |
| AC-11 | `App.tsx:20` | `App.test.tsx:142/187` + `ChartToolbar.test.tsx` |
| AC-12 | `App.tsx:28` | `App.test.tsx:155` + `FilterPanel.test.tsx` |

## Desvío aceptado — `MarkerForm` montado en ambos estados

El Block 6 de la spec ubica `MarkerForm` dentro de la rama con señal ("y debajo `MarkerList` +
`MarkerForm`"). La implementación (`MainPanel.tsx:56-60`) lo monta en **ambos** estados.

**Se acepta el desvío**, y la razón es más fuerte que "se rompía un test":

1. Reproducida la letra de la spec, muere `App.test.tsx:74` (FEAT-003b), que abre el formulario
   **sin señal cargada**.
2. Acoplar el montaje de `MarkerForm` a `signalStore` sería un cambio de comportamiento sobre el
   diseño aprobado de FEAT-003b, donde el diálogo es autosuficiente y lo gobierna
   `markersStore.formState`.
3. El PRD de FEAT-009 lo excluye explícitamente: *"Out of Scope: modificar la lógica de …
   marcadores … solo se reorganiza su presentación visual"*.

Es decir: **seguir la letra de la spec habría violado el Out of Scope del PRD**. La implementación
es la que honra el contrato. Queda asentado acá para que la spec y el código no discrepen en
silencio.

## WARNs (ninguno bloquea)

### W-01 — F-VER-06 parcial: el mensaje de rango invertido no se asevera

Block 3 requiere el test `FilterPanel — un rango de corte inválido sigue mostrando el mensaje de
validación`. El test en disco (`FilterPanel.test.tsx:122`) asevera el `disabled` del botón, **no el
mensaje**. Verificado por mutación: vaciar el string de `FilterPanel.tsx:104` deja 265/265 en verde.

No se escala a FAIL porque: la spec lo calificó como *"(test existente que debe seguir verde)"* —
un chequeo de no-regresión, no un compromiso de test nuevo; el hueco es **preexistente en `main`**;
y cerrarlo exigiría modificar `FilterPanel.test.tsx`, que el criterio de cierre aprobado del Block 3
**prohíbe**. Bloquear acá obligaría a violar la spec. Anotado en `docs/BACKLOG.md`.

### W-02 — El threat model atribuye la verificación de R-04 al control equivocado

`docs/daw/security/threat-FEAT-009.md:114` afirma que la ausencia de handler está *"verificada por
el test de AC-08"*. **Es incorrecto**, probado con tres mutaciones:

- **M3** — `disabled` + `onClick` que muta el store → **19/19 pasan**. El test no lo distingue.
- **M3b** — `disabled` + `onKeyDown` → **falla**, porque `FileSection.test.tsx:88-93` dispara
  `keyDown` y `focus` además del clic.
- **M10** — ensanchar `DisabledMenuItemProps` con `onClick?` → `tsc --noEmit` falla con
  `TS2578: Unused '@ts-expect-error' directive`.

La garantía real contra un `onClick` la dan **el tipo de props y la guarda de compilación**
(`FileSection.test.tsx:139-146`), no un test conductual: React nunca entrega eventos de mouse a un
elemento `disabled`, así que ningún test de comportamiento puede hacerlo.

**No es FAIL**: F-TM-03 exige que la amenaza tenga mitigación, y la tiene — más fuerte que la
citada, porque una guarda de compilación no se puede saltear en runtime. R-04 está clasificada LOW.
Lo erróneo es *qué control se cita como verificador*. **AC-08 queda PASS**: lo que el AC promete
(el clic no dispara acción y el ítem sigue deshabilitado) sí está verificado.

**Decisión: no se abre bucle correctivo a PLAN.** Reabrir la fase por la redacción de un riesgo LOW
cuya mitigación es correcta y más fuerte que la declarada es desproporcionado. Queda asentado acá y
en `docs/BACKLOG.md`, para corregirse la próxima vez que se toque ese artefacto.

### W-03 — La contabilidad de evidencia TDD del Block 6 no reconstruye

El implementador reportó 9 rojos previos. La reconstrucción (revertir `App.tsx` a `08ed266` y
stubear `MainPanel`/`EmptyState` a `return null`) da **12**: 5 de `MainPanel.test.tsx`, 3 de
`EmptyState.test.tsx`, 3 del `describe` de Block 6 en `App.test.tsx`, y 1 del smoke de montaje.

**Todos los tests del bloque muerden.** El "test ajeno al bloque" que aparecía en el set de 9 es el
smoke de `App.test.tsx`, y su inclusión era legítima: la spec lista ese archivo como modificado por
el Block 6. Falla la contabilidad, no la propiedad que la contabilidad debía evidenciar.

Seguimiento: el conteo de rojos debería producirse **mecánicamente** (correr los tests del bloque
contra el árbol pre-bloque) en vez de narrarse.

### W-04 — `ExampleLoader` tiene una rama de alerta sin call sites de producción

`ExampleLoader.tsx:131-138` renderiza su propio `role="alert"`, pero **los dos puntos de montaje
pasan `showError={false}`**: `FileSection.tsx:35` (el dueño del mensaje ahí es `CsvUpload`) y
`EmptyState.tsx:35` (por decisión de producto: una sola alerta, la del sidebar).

Consecuencia: esa rama solo se ejercita desde `ExampleLoader.test.tsx`, y el test dedicado de AC-09
(`ExampleLoader.test.tsx:90`) verifica una configuración que la app no despacha. **AC-09 queda PASS**
porque lo cubren a nivel app `FileSection.test.tsx:119` y `App.test.tsx:263`, que asevera la alerta
única en el sidebar.

La prop no es código muerto a futuro —es el mecanismo que impide que un montaje nuevo duplique la
alerta en silencio, y el typecheck lo fuerza porque es requerida— pero hoy es un punto de extensión
sin usuario. Se resolverá cuando el alert de `CsvUpload` deje de ser global (ver `docs/BACKLOG.md`).

### W-05 — Acoplamiento estructural al DOM en tests

`MainPanel.test.tsx:77,142` y `EmptyState.test.tsx:57-59` acotan por `parentElement` y
`childElementCount === 2`. Un `<div>` puramente cosmético los rompe sin que cambie el
comportamiento. Es el precio de haber quitado el `aria-label` del envoltorio de métricas para
eliminar el landmark anidado.

### W-06 — 6 advertencias `act(...)` nuevas

Por mutar el store fuera de `act()` (`ExampleLoader.test.tsx:128,175`, `MainPanel.test.tsx:121`).
Hoy pasan; es fuente de flakiness bajo render concurrente.

## Lo que se buscó y NO se encontró

Dependencias de orden entre tests (todos los archivos resetean los tres stores en `beforeEach`),
estado global sin limpiar (`vi.unstubAllGlobals()` en cada `afterEach` que stubea `fetch`),
timestamps o IDs hardcodeados (las muestras son sintéticas y deterministas; BPM se asevera con banda
`/^7[4-6]$/`, no valor exacto).

## "Final verification" de la spec — 7/7

| # | Punto | Resultado |
|---|---|---|
| 1 | lint + build + test en `src/frontend` | ✅ 265/265, eslint 0, tsc 0 |
| 2 | `dotnet test` en `src/backend` (no regresión) | ✅ 37/37 |
| 3 | Los 12 AC con al menos un test | ✅ |
| 4 | **NFR-02** — sin dependencias nuevas | ✅ `package.json` y `package-lock.json` con diff vacío contra `main` |
| 5 | **NFR-01** — Canvas 2D sin cambios funcionales | ✅ `components/render/` con diff **vacío**; `ECGChart.tsx` solo `className` en 2 contenedores, cuerpo intacto |
| 6 | **NFR-03** — cada CSV ≤ 260 KB | ✅ 254.711 / 124.040 / 123.616 bytes; los 3 md5-idénticos a `ECGSamples/CSV/` |
| 7 | Estructura vs. las capturas de `docs/UI/` | ✅ con una divergencia deliberada: la referencia pone la duración en una barra inferior, la implementación en el TopBar — que es lo que mandan FR-09/AC-10 |

## Nota sobre la cobertura

Dos observaciones que se investigaron y **no** son hallazgos:

1. El grupo `components/layout` no aparece en el reporte de cobertura por defecto. **No es una
   exclusión**: `vite.config.ts` no tiene clave `coverage`. El reporter de v8 omite los archivos al
   100% en las cuatro métricas — `duration.ts`, `samples.ts`, `parseCsv.ts` y `crop.ts` tampoco
   aparecen, por lo mismo.
2. Bajo instrumentación de cobertura fallan 2 tests de rendimiento (`parseCsv` y HRV). Es
   **overhead de v8**, no regresión: `src/lib/ecg/metrics/**` y `parseCsv.*` tienen diff vacío
   contra `main` (código byte-idéntico), y la medición directa da p95 HRV de 11,4 ms sin instrumentar
   contra 315,7 ms con v8 (×27,8), sobre un presupuesto de jsdom de 300 ms.

## Veredicto

**PASSED.** 0 FAILs. `gates.verify` = `true`.

Los 6 WARNs quedan documentados; W-01, W-02 y W-04 están además en `docs/BACKLOG.md` para que
sobrevivan al cierre del ticket.
