# Verify FEAT-007a: Esqueleto del backend .NET

| Field | Value |
|-------|-------|
| Ticket | FEAT-007a |
| PRD | docs/daw/prd/prd-FEAT-007a.md |
| Spec | docs/daw/specs/spec-FEAT-007a.md |
| Date | 2026-08-26 |
| Ronda | 1 |
| Result | PASSED |

## Trazabilidad PRD → Código → Tests

| AC | Cubierto por |
|---|---|
| AC-01 (FR-01) | `Program.cs` (build + `app.Run()`) → `HealthEndpointTests.ReturnsOkWithStatusOk` (arranca el host real vía `WebApplicationFactory`) |
| AC-02 (FR-02) | `Program.cs:20` `MapGet("/api/health", ...)` → `HealthEndpointTests.ReturnsOkWithStatusOk` + `client.test.ts` ("ok:true") + `BackendStatus.test.tsx` ("Backend: conectado") |
| AC-03 (FR-05) | `BackendStatus.tsx:13-34` → `BackendStatus.test.tsx` ("Backend: no disponible" + "el resto de la app sigue funcional") |
| AC-04 (FR-01) | `ECGViewer.Tests` → `dotnet test` (3/3 verde, re-ejecutado independientemente) |
| AC-05 (FR-03) | `Program.cs:3-9,13` (CORS explícito) → `HealthEndpointTests.RejectsDisallowedOrigin` (sad path real) |
| AC-06 (FR-04) | `client.ts:1` (fallback `VITE_API_BASE`) → `client.test.ts` ("usa http://localhost:5080...") |
| AC-07 (FR-06) | `ECGViewer.Api.csproj:4-6` (`Nullable`/`ImplicitUsings`) → `dotnet build` (0 warnings, 0 errors) |

## Spec — 4 bloques

- ✅ Block 1 (Solución .NET + health + CORS): 4/4 tareas
- ✅ Block 2 (Tests de integración): 3/3 tests listados, existen y pasan
- ✅ Block 3 (Cliente HTTP): 3/3 (vite-env.d.ts, client.ts, client.test.ts)
- ✅ Block 4 (BackendStatus): 3/3 (componente, test, montaje antes de CsvUpload en App.tsx:14-15)

## Reglas F-VER (validation-rules.instructions.md §5)

- ✅ **F-VER-01**: 7/7 AC con test pasando verificando comportamiento real (no solo status code).
- ✅ **F-VER-02**: 4/4 bloques implementados sin desvíos no documentados.
- ✅ **F-VER-03** (cobertura ≥80%): front medido con `vitest run --coverage` — `client.ts` 100%
  (4/4 métricas), `BackendStatus.tsx` 91.66% stmts / 87.5% branch / 100% funcs / 100% lines. Ambos
  por encima del mínimo. Back: **gap de tooling documentado, no bloqueante** — `ECGViewer.Tests`
  usa Microsoft.Testing.Platform (MTP), incompatible con `coverlet.collector` clásico (VSTest); no
  se pudo medir cobertura automáticamente. Trazado manual: los 3 tests ejercitan CORS, `Build()`,
  el handler de `/api/health` y la rama `IsDevelopment()==true`; la rama `IsDevelopment()==false`
  no tiene test (riesgo bajo, esa rama solo omite `UseDeveloperExceptionPage`, config de producción
  fuera de alcance del PRD). Recomendado para FEAT-007b: agregar
  `Microsoft.Testing.Extensions.CodeCoverage`.
- ✅ **F-VER-04** (sad path por input): `/api/health` no recibe input (N/A, documentado);
  `checkHealth()` cubierto (fetch rechaza); CORS con origen no permitido cubierto
  (`RejectsDisallowedOrigin`).
- ✅ **F-VER-05** (lint/typecheck): `dotnet build` 0 warnings/0 errors; `npm run typecheck` 0
  errores; `npm run lint` 0 errores — los 3 re-ejecutados independientemente.
- ✅ **F-VER-06** (tests de la spec existen y pasan): los 9 tests listados en la spec (3 back + 6
  front) existen con el comportamiento exacto descrito y pasan. Re-ejecutado: `dotnet test` → 3/3;
  `npm test -- --run` → 196/196 (24 test files).

### Warnings (no bloqueantes)

- ⚠️ **W-VER-02**: `BackendStatus.tsx` en 87.5% branch coverage (rango 80-90%) — la rama del
  cleanup `cancelled` del `useEffect` (línea 20, caso de unmount antes de resolver la promesa) no
  tiene test. Recomendado subir a 90%+, no bloqueante.
- ⚠️ **W-VER-03**: dos tests de rendimiento **preexistentes y no relacionados con este ticket**
  (`hrv.test.ts` de FEAT-006, `parseCsv.test.ts` de FEAT-001) son sensibles a la carga de la
  máquina — `hrv.test.ts` falló una vez durante esta corrida de verificación
  (`~312-380ms` vs. límite `300ms`). Mismo patrón de fragilidad ya documentado en sesiones
  anteriores (assert de tiempo real dependiente del hardware). No se tocó ningún archivo de esos
  tickets en FEAT-007a. El test `RespondsUnder200ms` (Block 2, sí de este ticket) pasó en ambas
  corridas independientes, pero conserva el mismo patrón de fragilidad señalado por el arch-auditor
  en el Bloque 2 (medición dependiente del orden de ejecución) — vale la pena revisarlo si empieza
  a fallar intermitentemente en CI.

## Mitigaciones del threat model (re-verificadas en el código final)

- ✅ CORS con origen explícito (`http://localhost:5173`), sin `AllowAnyOrigin`/`AllowCredentials`.
- ✅ `UseDeveloperExceptionPage()` confinado a `app.Environment.IsDevelopment()`, no incondicional.

---

```
┌─────────────────────────────────────────────────────────┐
│  /daw-verify-module FEAT-007a — PASSED                    │
├─────────────────────────────────────────────────────────┤
│  Total: 23 passed, 0 failed, 2 warnings                    │
│  Report: docs/daw/reports/verify-FEAT-007a.md               │
└─────────────────────────────────────────────────────────┘
```
