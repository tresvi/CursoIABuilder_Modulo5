# Verify Report — FEAT-001: Cargar señal ECG de un canal desde CSV (RF-01)

| Field | Value |
|-------|-------|
| Ticket | FEAT-001 |
| Tier | FEATURE |
| PRD | docs/daw/prd/prd-FEAT-001.md |
| Spec | docs/daw/specs/spec-FEAT-001.md |

---

## Ronda 1 — 2026-08-07 — **BLOCKED**

Verificación cruzada independiente (`daw-module-verifier`, agente que no escribió el código).
Suite: 18/18 verde · typecheck/lint limpios.

### Resultados por regla (§5 del catálogo)

| Regla | Resultado | Detalle |
|-------|-----------|---------|
| F-VER-01 (AC con test que pasa) | ✅ PASS | AC-01→`handleInputChange/handleFile` (test "selecciona archivo válido"); AC-02→`parseCsv`+`loadFromText` (valores/orden/negativos/trim); AC-03→`status==='loaded'` (role=status); AC-04→5 tests parseCsv + UI "error, no deja señal"; AC-05→`multichannel` + UI "solo se soporta un canal". Verifican comportamiento real. |
| F-VER-02 (bloques implementados) | ✅ PASS | Block 1 (scaffolding), Block 2 (parseCsv+types), Block 3 (store+CsvUpload+App) presentes. |
| F-VER-06 (tests de la spec existen y pasan) | ✅ PASS | Block 1: 1/1 · Block 2: 7/7 (incl. NFR-01) · Block 3: 7/7. |
| F-VER-03 (cobertura ≥80% agregada) | ✅ PASS | Sobre el código nuevo/modificado: Lines 85.18% · Branch 83.72% · Funcs 80.95% · Stmts 86.66%. Los tres umbrales ≥80%. Per-archivo `CsvUpload.tsx` (L74/B69/F75) y `App.tsx` (0%) por debajo — síntoma del FAIL de F-VER-04, no medida propia de F-VER-03. |
| **F-VER-04 (sad-path por función que acepta input)** | ❌ **FAIL** | `handleDrop` (la **zona de arrastre**, FR-01 "input de archivo **o** zona de arrastre") no tiene **ningún** test (ni happy ni sad). Líneas sin cubrir: 82-86 (`preventDefault`, `dataTransfer.files?.[0]`, guarda `if(file)`), 93-94, 98. `parseCsv` (5 sad paths) y `handleFile`/`handleInputChange` (inválido, >25MB, read-error) sí cubiertos. |
| F-VER-05 (lint/typecheck) | ✅ PASS | `tsc --noEmit` limpio; eslint sin errores. |
| W-VER-01 (código muerto) | ✅ | Handlers cableados al JSX; sin código muerto. |
| W-VER-02 (lógica de negocio 80-90%) | ✅ | `parseCsv`/store >90%. |
| W-VER-03 (tests frágiles) | ⚠️ WARN | El test de rendimiento (p95<200ms) es sensible al timing de CI; mitigado por 20 corridas y umbral holgado (~58 ms medido). |

**Total: 1 FAIL (F-VER-04), 2 WARN. Resultado: BLOCKED.**

### Acción: bucle correctivo VERIFY → CODE

Falta agregar (en `CsvUpload.test.tsx`, sin tocar código de producto):
1. **(Obligatorio)** Sad-path del drop: `fireEvent.drop` con CSV inválido → mensaje de error + `signal===null`.
2. Happy-path del drop: `fireEvent.drop` con CSV válido → éxito + store `loaded`.
3. Guarda del drop: `fireEvent.drop` con `files: []` → no-op, sin excepción.
4. `dragOver`/`dragLeave` → toggle de `isDragging`.
5. (Opcional) Mensaje UI para `inconsistent-columns`/`too-few-columns`/`no-data`.
6. (Opcional) Smoke de montaje de `App` (elimina el 0% de `App.tsx`).

El punto 1 cierra el FAIL de F-VER-04; 2-4 suben además `CsvUpload.tsx` por encima del 80% per-archivo.

---

## Ronda 2 — 2026-08-07 — **PASSED**

Tras el loop correctivo (commit `40bba55`: +5 tests de drag&drop en `CsvUpload.test.tsx` + smoke
`App.test.tsx`). Verificación cruzada independiente. Suite 24/24 · typecheck/lint limpios.

| Regla | Resultado | Detalle |
|-------|-----------|---------|
| **F-VER-04 (bloqueaba)** | ✅ **RESUELTO** | `handleDrop` ejercido de verdad: test "drop sad-path" dispara `fireEvent.drop` sobre el `<div onDrop>` con `File` real y `text()` espiado; `textSpy` = 1 prueba `handleDrop→handleFile→file.text()`; `role=alert` + `signal===null`. Fallaría si el handler estuviera roto. Más: drop happy-path, drop-guard (`files:[]`), toggle `dragOver`/`dragLeave`. |
| F-VER-01 | ✅ PASS | AC-01..AC-05 con test que pasa y verifica comportamiento real. |
| F-VER-02 / F-VER-06 | ✅ PASS | 3 bloques implementados; todos los tests de la spec (incl. NFR-01 perf) presentes y verdes. 24/24. |
| F-VER-03 | ✅ PASS | Agregado L 97.53% · B 93.02% · F 100%. Per-archivo ≥80%: `CsvUpload.tsx` 95.34/86.95/100; `App.tsx` 100/100/100; `parseCsv.ts`/`signalStore.ts`/`types.ts` 100. |
| F-VER-05 | ✅ PASS | `tsc --noEmit` y eslint sin errores. |
| W-VER-02 | ⚠️ | `CsvUpload.tsx:22,28` (mapeo UI de `too-few-columns`/`no-data`) sin cubrir; ambos errores testeados a nivel parser. Branch 86.95% ≥80% — no degrada F-VER-03. |
| W-VER-03 | ⚠️ | Test de rendimiento (p95<200ms) sensible a timing de CI; pasó con holgura. |

**Total: 0 FAIL, 2 WARN. Resultado: PASSED.** Gate `verify` ganado. VERIFY se cierra.

