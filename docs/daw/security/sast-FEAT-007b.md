# SAST FEAT-007b: Filtros DSP

| Field | Value |
|-------|-------|
| Ticket | FEAT-007b |
| Date | 2026-08-26 |
| Result | PASSED |

## Scope

Los 8 bloques: `src/backend/ECGViewer.Api/Filters/` (FilterModels, SampleRateCalculator,
FilterValidation, SpectralFilters, TimeDomainFilters), `Program.cs` (endpoint
`POST /api/filters/apply`), `ECGViewer.Api.csproj` (nueva dependencia `FftSharp` 2.2.0),
`ECGViewer.Tests/FilterEndpointTests.cs`, `src/frontend/src/lib/ecg/sampleRate.ts`,
`src/frontend/src/lib/api/filters.ts`, `src/frontend/src/state/signalStore.ts`,
`src/frontend/src/components/FilterPanel.tsx`, `src/frontend/src/App.tsx`.

## Secretos (F-SAST-01)
✅ 0 patrones de API key/password/secret/connection string en el scope.

## Injection (F-SAST-02/03/05)
✅ 0 ocurrencias de `eval`, `Process.Start`, `ExecuteSql`, `FromSqlRaw`. El endpoint no ejecuta
comandos ni consultas — solo cómputo numérico sobre arrays.

## XSS (F-SAST-06)
✅ 0 ocurrencias de `innerHTML`/`dangerouslySetInnerHTML` en `FilterPanel.tsx` ni `lib/api/`.

## CORS (mitigación heredada de FEAT-007a)
✅ 0 ocurrencias de `AllowAnyOrigin`/`AllowCredentials` en `Program.cs` — la política sigue
restringida al origen explícito, sin regresión introducida por los 8 bloques de este ticket.

## Mitigaciones del threat model de FEAT-007b (re-verificadas)
✅ Límite de 500.000 muestras (`FilterValidation.ValidateSampleCount`, `400` explícito).
✅ Ventana ≤ total de muestras (`FilterValidation.ValidateWindow`).
✅ Excepciones numéricas de Savitzky-Golay capturadas y traducidas a `400`
  (`Program.cs`, try/catch específico), nunca un 500 con stack trace.
✅ Payload multicanal (campo extra por muestra) rechazado con `400`
  (`JsonUnmappedMemberHandling.Disallow`).

## Dependencias (F-SAST-13/16)
✅ `npm audit --omit=dev`: 0 vulnerabilidades.
✅ `dotnet list package --vulnerable` (ambos proyectos, incluye `FftSharp` 2.2.0 nuevo): sin
  paquetes vulnerables conocidos.

## Suppressions
Ninguna.

---

```
┌─────────────────────────────────────────────────────────────┐
│  /daw-security-sast — PASSED                                  │
├─────────────────────────────────────────────────────────────┤
│                                                              │
│  Secretos: ✅ F-SAST-01: 0 encontrados                         │
│  Injection: ✅ F-SAST-02/03/05: sin patrones                    │
│  XSS: ✅ F-SAST-06: 0 innerHTML/dangerouslySetInnerHTML          │
│  Dependencias: ✅ F-SAST-13/16: npm audit 0, dotnet 0 (incluye   │
│    FftSharp 2.2.0 nuevo)                                          │
│  Mitigaciones del threat model: ✅ las 3 verificadas en código    │
│                                                              │
│  Suppressions: 0                                                │
│                                                              │
│  ────────────────────────────────────────────────────────────│
│  Total: 8 clean, 0 vulnerabilidades (0 critical, 0 high)         │
│  Report: docs/daw/security/sast-FEAT-007b.md                     │
│  Next: transicionar a VERIFY                                     │
└─────────────────────────────────────────────────────────────┘
```
