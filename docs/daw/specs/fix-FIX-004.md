# Fix-plan FIX-004: Filtros DSP — señal desaparece por mismatch de casing mv/mV

| Field | Value |
|-------|-------|
| Ticket | FIX-004 |
| Tier | FIX |
| RCA | docs/daw/specs/rca-FIX-004.md |
| Date | 2026-08-26 |
| Spec loops | 0 |

## Problem

Al aplicar cualquier filtro DSP desde `FilterPanel`, el request a `POST /api/filters/apply` se
envía y el backend responde 200, pero la señal desaparece del `ECGChart`: no queda ninguna traza
visible, aunque grilla y ejes se siguen dibujando con normalidad.

## Root cause

`SampleDto(double T, double MV)` (`src/backend/ECGViewer.Api/Filters/FilterModels.cs:14`) se
serializa con la política camelCase por defecto de .NET, que ante un nombre de propiedad todo en
mayúsculas (`MV`) lo convierte enteramente a minúsculas — produce `"mv"`, no `"mV"`. El frontend
espera `mV` (`src/frontend/src/lib/ecg/types.ts:5`) y confía en un cast de TypeScript sin validar en
runtime (`src/frontend/src/lib/api/filters.ts:42-44`), así que cada muestra filtrada recibe
`mV = undefined`. Ese `undefined` se propaga como `NaN` a través de `computeYRange`
(`scale.ts:79-92`) y `drawSignal` (`drawChart.ts:114-134`); `ctx.lineTo(NaN, NaN)` en Canvas 2D
falla en silencio — sin excepción — así que el trazo nunca se pinta. Detalle completo en
`docs/daw/specs/rca-FIX-004.md`.

## Solution — steps

1. `src/backend/ECGViewer.Api/Filters/FilterModels.cs:1` — agregar
   `using System.Text.Json.Serialization;` y anotar la propiedad `MV` del record `SampleDto` con
   `[property: JsonPropertyName("mV")]`, fijando el wire format explícitamente en `"mV"` en vez de
   depender de cómo la naming policy transforme un nombre todo en mayúsculas.
2. `src/backend/ECGViewer.Tests/FilterEndpointTests.cs` — agregar un test
   (`AppliesLowPass_ResponseBodyUsesMvCasing`) que llama a `POST /api/filters/apply`, lee el cuerpo
   de la respuesta **crudo como string** vía `response.Content.ReadAsStringAsync()` (sin
   `PropertyNameCaseInsensitive`) y assertea que contiene el substring literal `"mV"`. Es el test de
   contrato que hubiera atrapado esta regresión — los tests existentes la enmascaraban al
   deserializar con matching insensible a mayúsculas.
3. `src/frontend/src/lib/api/filters.ts:42-44` (`applyFilter`) — tras
   `const body = (await res.json()) as { samples: ECGSignal['samples'] };`, validar que cada
   muestra tenga `t` y `mV` numéricos y finitos (`Number.isFinite`). Si alguna muestra no cumple,
   devolver `{ ok: false, error: 'Respuesta del backend con formato inesperado' }` en vez de aceptar
   el cast ciegamente. Mensaje genérico, sin volcar el cuerpo crudo de la respuesta (mitigación del
   threat model).
4. `src/frontend/src/lib/api/filters.test.ts` — agregar un caso que mockea una respuesta 200 con
   casing incorrecto (`{ t: 0, mv: 0.15 }` en vez de `mV`) y assertea que `applyFilter` devuelve
   `{ ok: false, error: 'Respuesta del backend con formato inesperado' }`.

## Dependencies between steps

Ninguna estricta, pero el orden natural es 1→2 (backend + su test) y 3→4 (frontend + su test); son
independientes entre sí (back y front no se bloquean mutuamente).

## Error handling

- Backend: sin cambios en el manejo de errores existente — la anotación `JsonPropertyName` solo
  afecta el nombre de la propiedad serializada, no introduce ninguna rama de error nueva.
- Frontend: el nuevo camino `{ ok: false, error: 'Respuesta del backend con formato inesperado' }`
  reutiliza el mismo tipo de retorno (`ApplyFilterResult`) que ya usan los casos de error 400/500/red
  caída; `signalStore.applyFilter` (línea 78) ya propaga `{ ok: false, error }` sin cambios
  necesarios, y `FilterPanel` ya renderiza `result.error` en pantalla (confirmado por impact scan).

## Tests

- [ ] **Regression test** — `AppliesLowPass_ResponseBodyUsesMvCasing` en
      `FilterEndpointTests.cs`: falla ANTES del fix (el body contiene `"mv"`, no `"mV"`) y pasa
      DESPUÉS.
- [ ] Caso nuevo en `filters.test.ts` con casing incorrecto: falla ANTES del fix (hoy `applyFilter`
      devolvería `{ ok: true, signal: { samples: [{ t: 0, mV: undefined }] } }`, no lo que el test
      espera) y pasa DESPUÉS.
- [ ] Suite completa verde: 36 tests de backend + 222 de frontend (baseline de FEAT-007b) más los 2
      nuevos.

## Regression risk

Low — el cambio es aditivo: una anotación JSON sobre una única propiedad de un único DTO, y una
validación defensiva sobre el único call site de `applyFilter` (`signalStore.ts`), que ya maneja
`{ ok: false }` con gracia. El impact scan confirmó 0 gaps: no hay otros DTOs con propiedades todo
en mayúsculas, ni otros endpoints con el mismo patrón, ni barrels/exports que actualizar.

## Rollback plan

- **Pasos:** revertir el commit de este fix. La anotación `JsonPropertyName` y los dos tests nuevos
  se revierten juntos (el backend vuelve a serializar `"mv"`); la validación de runtime en el
  frontend es aditiva y no rompe el camino feliz existente, por lo que puede revertirse
  independientemente del lado del backend si hiciera falta.
- **Indicadores:** si tras el deploy aparecen falsos rechazos de respuestas válidas (`{ ok: false }`
  cuando el backend sí devolvía datos correctos), o si el test de contrato de backend resulta
  inestable en CI por alguna razón no anticipada.
