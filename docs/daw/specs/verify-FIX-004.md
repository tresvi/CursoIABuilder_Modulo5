# Verify FIX-004: Filtros DSP — señal desaparece por mismatch de casing mv/mV

| Field | Value |
|-------|-------|
| Ticket | FIX-004 |
| Fix-plan | docs/daw/specs/fix-FIX-004.md |
| Date | 2026-08-26 |
| Ronda | 1 |

## Fix-plan steps

- ✅ `FilterModels.cs:1,16` — `using System.Text.Json.Serialization;` agregado; `SampleDto` pasa a
  `public record SampleDto(double T, [property: JsonPropertyName("mV")] double MV);`. Coincide
  exactamente con lo planeado.
- ✅ `FilterEndpointTests.cs:76-93` — nuevo test `AppliesLowPass_ResponseBodyUsesMvCasing`: lee
  `response.Content.ReadAsStringAsync()` crudo (sin `PropertyNameCaseInsensitive`) y assertea
  `Contains("\"mV\"")` + `DoesNotContain("\"mv\"")`. Es el test de contrato planeado.
- ✅ `filters.ts:44-49` — tras `res.json()`, `isValidSample` verifica `Number.isFinite(s.t) &&
  Number.isFinite(s.mV)`; si `!Array.isArray(body.samples) || !body.samples.every(isValidSample)`,
  devuelve `{ ok: false, error: 'Respuesta del backend con formato inesperado' }` — mensaje genérico
  exacto exigido por la mitigación del threat model.
- ✅ `filters.test.ts:39-50` — nuevo caso mockea `{ samples: [{ t: 0, mv: 0.15 }] }` (casing
  incorrecto) y assertea el shape `{ ok: false, error: ... }` esperado.

## Regression tests

- ✅ Backend: antes del fix, la naming policy camelCase de .NET colapsaba `MV` (todo mayúsculas) a
  `"mv"` en el JSON de respuesta — el assert `Contains("\"mV\"")` habría fallado y
  `DoesNotContain("\"mv\"")` también. Es una assertion real sobre el wire format, no enmascarada por
  deserialización case-insensitive (a diferencia de los tests preexistentes, según diagnostica la
  RCA).
- ✅ Frontend: antes del fix, `applyFilter` no validaba el shape — con el payload mockeado
  (`mv` en vez de `mV`) habría devuelto `{ ok: true, signal: { samples: [{ t: 0, mV: undefined }]
  } }`, no el `{ ok: false, error }` que el test espera. El bloque de validación en `filters.ts` es
  puramente aditivo (confirmado por diff), exactamente lo que hace pasar el test ahora.

## Ejecución

- Backend: `dotnet test` → 37/37 tests verdes (36 base + 1 nuevo).
- Frontend: `npm test -- --run` → 223/223 tests verdes, 27 archivos (222 base + 1 nuevo). Sin
  flakiness de NFR-01 en esta corrida.

## Alcance (sin scope creep)

Confirmado: el diff contra `51e90e4` (HEAD de `main` antes de este ticket) toca exactamente 8
archivos — los 4 archivos de código listados en el fix-plan más los 4 artefactos de documentación
propios de este ticket (RCA, fix-plan, threat model, SAST). Ningún archivo ajeno al alcance.

## RCA vs. implementación

Confirmado: la RCA identifica la causa raíz como el colapso de casing de la naming policy camelCase
de .NET sobre `MV` (todo mayúsculas) en `FilterModels.cs:14`, agravado por el cast de TS sin validar
en `filters.ts:42-44`. La corrección implementada ataca exactamente eso — fija el wire format con
`JsonPropertyName("mV")` en el backend y agrega validación en runtime en el sitio exacto del cast en
el frontend. No se corrigió un bug distinto o adyacente.

## Calidad

- ✅ Sin código muerto ni imports sin usar.
- ✅ Sin `any` en la validación nueva del frontend (tipada como `{ t?: unknown; mV?: unknown }`).
- ✅ Back: `Nullable`/`ImplicitUsings` sin afectar — el cambio es una anotación de serialización pura.
- ✅ El reporte SAST (`sast-FIX-004.md`) es consistente con el diff real: 8 categorías limpias, 0
  hallazgos.
- ✅ El threat model coincide con la implementación (mensaje de error genérico confirmado
  literalmente en `filters.ts:48`).

## Rollback plan

Confirmado: contenido en un solo commit (`6db5213`); revertirlo deshace la anotación y ambos tests
juntos (el backend vuelve a `"mv"`); la validación del frontend es aditiva e independiente, puede
revertirse por separado sin romper el camino feliz.

## Resultado

```
┌─────────────────────────────────────────────────────────┐
│  /daw-verify-module FIX-004 — PASSED                       │
├─────────────────────────────────────────────────────────┤
│  Fix-plan steps: ✅ 4/4                                     │
│  Regression tests: ✅ 2/2 (backend + frontend)               │
│  Suite completa: ✅ 260/260 (37 back + 223 front)             │
│  Alcance: ✅ sin scope creep (8 archivos, todos del ticket)   │
│  RCA ↔ código: ✅ consistente                                  │
│  Calidad: ✅ sin hallazgos                                      │
│  Rollback plan: ✅ vigente                                        │
│  ────────────────────────────────────────────────────────────  │
│  Total: 13 passed, 0 failed, 0 warnings                          │
│  Result: PASSED                                                  │
│  Next: gates.verify = true → RELEASE                              │
└─────────────────────────────────────────────────────────┘
```
