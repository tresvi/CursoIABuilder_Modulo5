# Verify FEAT-005: Herramienta Recorte (RF-09)

| Field | Value |
|-------|-------|
| Ticket | FEAT-005 |
| PRD | docs/daw/prd/prd-FEAT-005.md |
| Spec | docs/daw/specs/spec-FEAT-005.md |
| Date | 2026-08-23 |
| Ronda | 1 |
| Resultado | PASSED |

## Trazabilidad AC → código → test

| AC | Código | Test |
|---|---|---|
| AC-01 | `ChartToolbar.tsx:handleToggleCrop` | `ChartToolbar.test.tsx:146,162` |
| AC-02 | `ECGChart.tsx` onMouseMove, rama `drawSelection` | `ECGChart.test.tsx:483` |
| AC-03 | `ECGChart.tsx` onMouseUp rama `'crop'` (176-189) | `ECGChart.test.tsx:496` |
| AC-04 | `ECGChart.tsx` guard `if (!win)` (178-184) | `ECGChart.test.tsx:525,540` |
| AC-05 | `signalStore.cropToRange` + `markersStore.removeMarkersOutside` + `handleConfirmCrop` | `signalStore.test.ts:13`, `markersStore.test.ts:106`, `ECGChart.test.tsx:554` |
| AC-06 | `handleCancelCrop` | `ECGChart.test.tsx:583` |
| AC-07 | useEffect señal→vista existente (sin código nuevo) | `ECGChart.test.tsx:604` |

## Blocks de la spec

Los 5 blocks (crop.ts, signalStore, markersStore, viewStore, integración UI) tienen sus tests
requeridos presentes y en verde: 4+3+3+1+7 = 18 tests dedicados a FEAT-005, dentro de los 163 de la
suite completa.

## Cobertura (archivos de FEAT-005)

| Archivo | Stmts | Branch | Funcs |
|---|---|---|---|
| crop.ts | 100% | 100% | 100% |
| signalStore.ts | 100% | 100% | 100% |
| markersStore.ts | 100% | 100% | 100% |
| viewStore.ts | 100% | 100% | 100% |
| ChartToolbar.tsx | 100% | 100% | 100% |
| ECGChart.tsx | 92.8% | 79.0% | 100% |

**WARN (no bloqueante):** `ECGChart.tsx` queda 1pt bajo el umbral de 80% en branches, por las
líneas 96/151 — guards de `onMouseDown`/`onMouseUp` cuando no hay herramienta activa. Confirmado
por `git blame` que son líneas preexistentes de FEAT-002/003/004, no introducidas por este ticket.

## Sad paths

`cropSignal` (0 y 1 muestra → null), `cropToRange` (sin señal, rango degenerado → no-op),
`removeMarkersOutside` (array vacío), flujo UI (clic sin arrastre con Recorte activo → sin diálogo,
`signal` intacto, overlay limpio). Todos con test dedicado.

## Calidad

`tsc --noEmit` limpio. `eslint` limpio. Sin código muerto ni imports sin usar. Tests sin
dependencias de orden ni estado global compartido (todos los stores resetean en `beforeEach`).
Suite completa: 163/163 tests, 0 fallos.

## Resultado

**PASSED, 1 ronda, sin bucle correctivo.** 0 FAILs, 22 PASSes, 2 WARNs no bloqueantes (cobertura de
branch preexistente en `ECGChart.tsx`, nota de disponibilidad de evidencia TDD retroactiva).

`gates.verify = true`.
