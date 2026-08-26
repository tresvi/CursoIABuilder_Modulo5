# Verify FEAT-007b: Filtros DSP

| Field | Value |
|-------|-------|
| Ticket | FEAT-007b |
| PRD | docs/daw/prd/prd-FEAT-007b.md |
| Spec | docs/daw/specs/spec-FEAT-007b.md |
| Date | 2026-08-26 |
| Ronda | 1 |
| Result | PASSED |

## Trazabilidad PRD → Código → Tests (F-VER-01)

| AC | Cubierto por |
|---|---|
| AC-01 | `FilterPanel.tsx` (`FILTER_OPTIONS`, 7 opciones) → `FilterPanel.test.tsx` "muestra las 7 opciones" |
| AC-02 | `FilterPanel.tsx` (`DEFAULTS`) → `FilterPanel.test.tsx` (Pasa Bajo 49.5) |
| AC-03 | `FilterPanel.tsx` → `FilterPanel.test.tsx` (Notch 50/60) |
| AC-04 | `FilterPanel.tsx` → `FilterPanel.test.tsx` (Media/Mediana Móvil 5/7) |
| AC-05 | `FilterPanel.tsx` → `FilterPanel.test.tsx` (Savitzky-Golay, campos vacíos) |
| AC-06 | `signalStore.applyFilter` + `Program.cs` → `signalStore.test.ts` (signal reemplazado, previousSignal guardado) |
| AC-07/AC-08 | `FilterPanel.tsx` (`canRevert`) → `FilterPanel.test.tsx` (deshabilitado por defecto, habilitado tras aplicar) |
| AC-09 | `signalStore.revertLastFilter` → `signalStore.test.ts` (restaura exacto, limpia previousSignal) |
| AC-10 | `signalStore.applyFilter` (usa `signal` actual) → `signalStore.test.ts` "encadena..." (verificado con `toHaveBeenNthCalledWith`) |
| AC-11 | `FilterValidation.ValidateFrequency` (back, autoritativo) + `FilterPanel.tsx` (UX) → tests en las 3 capas |
| AC-12 | `FilterValidation.ValidateFrequencyRange` → tests en las 3 capas |
| AC-13 | `FilterValidation.ValidateWindow` → tests en las 3 capas |
| AC-14 | `FilterValidation.ValidatePolynomialDegree` → tests en las 3 capas |
| AC-15 | Todo el cómputo en `Filters/*.cs`, invocado desde `Program.cs` → los 7 `*_ReturnsFilteredSignal` corren contra `WebApplicationFactory<Program>` real |
| AC-16 | `Program.cs` (`UnmappedMemberHandling.Disallow`) → `RejectsPayloadWithExtraFieldPerSample` |

Distinción correcta confirmada: el límite de 500.000 muestras es mitigación del threat model, **no** un AC del PRD — no se confunde con AC-15/AC-16 en ningún test.

## Spec — 8 bloques (F-VER-02)

- ✅ Block 1-8: todos implementados según lo descrito. Única nota: Block 4 movió la mitigación NFR-02 de `FilterValidation.cs` (como decía la sección "Files" de la spec) a `Program.cs` (como describía la sección "Logic") — cambio de ubicación sin cambio de comportamiento, ya señalado por el arch-audit del propio bloque.

## Cobertura (F-VER-03)

- **Backend**: no medible con tooling automático (incompatibilidad Microsoft.Testing.Platform vs. coverlet, mismo gap ya documentado en FEAT-007a). Trazado manual: sin ramas muertas encontradas en `TimeDomainFilters.cs`/`SpectralFilters.cs`; la rama de intercambio de pivote en `SolveLinearSystem` es alcanzable pero no se pudo certificar con certeza qué test la dispara (no bloqueante).
- **Frontend** (4 archivos nuevos/modificados, `vitest --coverage`): `sampleRate.ts` 100%, `filters.ts` 100%, `signalStore.ts` 92.59%/91.66%/85.71%/90.47% (stmts/branch/funcs/lines), `FilterPanel.tsx` 91.39%/91.74%/94.44%/91.56%. Combinado: **92.75% stmts / 92.12% branch / 92.59% funcs / 92.56% lines** — por encima del mínimo de 80% en las tres dimensiones.

## Sad paths (F-VER-04)

Confirmadas todas las superficies de entrada validadas con su sad-path correspondiente: Nyquist, low≥high, ventana no entera/no positiva, ventana>total de muestras, grado≥ventana, muestras <2/>500.000, Savitzky-Golay inestable, parámetro faltante, payload multicanal, `applyFilter`/`revertLastFilter` sin señal/filtro previo, errores de red/HTTP inesperados.

## Calidad (F-VER-05/06)

- ✅ `dotnet build`: 0 warnings, 0 errors. `npm run typecheck`/`lint`/`build`: limpios.
- ✅ `dotnet test`: 36/36 (2 corridas independientes). `npm test -- --run`: 222/222 (27 archivos).
- ✅ W-VER-01: sin código muerto ni imports sin usar (`dotnet format --verify-no-changes`, `eslint .` limpios). Única nota: rama defensiva "tipo de filtro desconocido" en `FilterPanel.tsx` es técnicamente inalcanzable (unión cerrada de 7 valores) pero es una guarda razonable, no código muerto real.
- ⚠️ W-VER-02: cobertura de negocio ya por encima del 90% recomendado en frontend; backend no medible por tooling pero sin huecos encontrados en el trazado manual.
- ✅ W-VER-03: `RespondsUnder500msForOneMinuteSignal` (señalado como potencialmente frágil en el arch-audit del Bloque 2) re-corrido 2 veces de forma independiente, sin flakiness. Ningún test depende de orden de ejecución ni estado compartido.

### Warnings (no bloqueantes)

1. `FilterPanel.test.tsx` nunca hace click real sobre "Revertir" (solo verifica su estado disabled/enabled) — el wiring UI→store de FR-08 queda sin ejercitar a nivel de componente, aunque `revertLastFilter` en sí está probado en `signalStore.test.ts`. Recomendado agregar ese click en un futuro ajuste menor.
2. Rama de intercambio de pivote de `SolveLinearSystem` no instrumentable por el gap de tooling de cobertura del backend — alcanzable, no confirmada por falta de instrumentación, no de diseño.
3. El reporte de "tests fallando antes" por bloque no fue adjuntado en el input de esta verificación — la evidencia TDD de cada bloque quedó registrada en los reportes de los implementadores durante CODE (revisados y aceptados en cada cierre de bloque), no se repite aquí.

## Mitigaciones del threat model (re-verificadas end-to-end)

- ✅ Límite de 500.000 muestras → 400 (código + test e2e).
- ✅ Ventana > total de muestras → 400 (código + test unitario; wiring idéntico al de grado<ventana, que sí tiene test e2e — riesgo residual bajo).
- ✅ Savitzky-Golay inestable → 400, nunca 500 (try/catch específico + test e2e).
- ✅ CORS explícito y dev-exception-page confinado a Development (heredados de FEAT-007a, sin cambios).

## Consistencia Nyquist front/back

✅ Confirmada idéntica: `SampleRateCalculator.cs` y `sampleRate.ts` calculan `1.0 / promedio(deltas consecutivos)`, misma fórmula, sin mediana en ningún lado.

## Encadenado (FR-09) y undo de un nivel (FR-08)

✅ Confirmados end-to-end vía `signalStore.ts`: la segunda llamada a `applyFilter` recibe la señal ya filtrada (verificado con `toHaveBeenNthCalledWith`), y `revertLastFilter` restaura exactamente la señal pre-filtro sin llamar a la API.

---

```
┌─────────────────────────────────────────────────────────┐
│  /daw-verify-module FEAT-007b — PASSED                    │
├─────────────────────────────────────────────────────────┤
│  Total: 15 passed, 0 failed, 3 warnings                    │
│  Report: docs/daw/reports/verify-FEAT-007b.md               │
└─────────────────────────────────────────────────────────┘
```
