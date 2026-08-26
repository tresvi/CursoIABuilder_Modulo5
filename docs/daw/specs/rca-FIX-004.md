# RCA FIX-004: Filtros DSP — la señal desaparece por mismatch de casing mv/mV

| Field | Value |
|-------|-------|
| Ticket | FIX-004 |
| Date | 2026-08-26 |

## Síntoma

Al aplicar cualquier filtro DSP desde `FilterPanel`, el request a `/api/filters/apply` se envía y el
backend responde 200, pero la señal desaparece del `ECGChart`: no queda ninguna traza visible,
aunque la grilla y los ejes se siguen dibujando con normalidad.

## Causa raíz

`SampleDto(double T, double MV)`, definido en
`src/backend/ECGViewer.Api/Filters/FilterModels.cs:14`, se serializa con la política camelCase por
defecto de .NET (configurada en `Program.cs` vía `ConfigureHttpJsonOptions`, sin
`PropertyNamingPolicy` propio). Esa política, ante un nombre de propiedad **todo en mayúsculas**
(`MV`), lo convierte enteramente a minúsculas — produce `"mv"`, no `"mV"`. Se verificó
directamente contra el backend corriendo:

```
$ curl -s -X POST http://localhost:5080/api/filters/apply ...
{"samples":[{"t":0,"mv":1.5}, ...]}
```

El tipo de dominio del frontend, en cambio, es `mV` (V mayúscula):
`src/frontend/src/lib/ecg/types.ts:5` — `export type ECGSample = { t: number; mV: number }`.

El cliente HTTP confía en esa forma sin validarla en runtime:
`src/frontend/src/lib/api/filters.ts:42-44` hace `(await res.json()) as { samples: ECGSample[] }`.
El cast de TypeScript solo afecta el tipado en compilación — en runtime, cada muestra llega como
`{ t: 0, mv: 1.5 }` y `.mV` es `undefined` para todas.

### Cadena de eventos hasta el síntoma visible

1. `signalStore.applyFilter` (`src/frontend/src/state/signalStore.ts:74-81`) guarda la señal
   malformada en el estado sin validarla — nada lanza una excepción.
2. `ECGChart` re-renderiza y llama a `computeYRange(signal.samples)`
   (`src/frontend/src/lib/ecg/chart/scale.ts:79-92`): `min`/`max` arrancan en `undefined`, todas las
   comparaciones contra `undefined` son `false`, y el rango degenerado resultante propaga `NaN`.
3. `drawChart` → `drawSignal` (`src/frontend/src/components/render/drawChart.ts:114-134`) llama a
   `mvToY(undefined, NaN-range, dims)`, produciendo `NaN` para cada coordenada Y.
4. `ctx.lineTo(NaN, NaN)` / `ctx.moveTo(NaN, NaN)` en el contexto Canvas 2D fallan **en silencio**
   — no lanzan excepción ni loguean nada — así que el trazo de la señal simplemente nunca se pinta.
   Ejes y grilla no dependen de `mV`, por eso se ven bien.

No hay ningún `try/catch` que oculte un error ni ningún guard de `data.length === 0`: es
propagación silenciosa de `undefined`/`NaN` a través del pipeline de render, causada pura y
exclusivamente por el mismatch de casing en el nombre de la propiedad JSON.

### Por qué los tests existentes no lo detectaron

- El test de backend (`src/backend/ECGViewer.Tests/FilterEndpointTests.cs:16-19`) deserializa la
  respuesta con `PropertyNameCaseInsensitive = true`, así que `"mv"` matchea la propiedad `MV` de C#
  sin importar el casing — enmascarando el formato real de la respuesta.
- El test de frontend para el cliente de la API (`src/frontend/src/lib/api/filters.test.ts:8-9,
  24-25`) mockea el cuerpo de la respuesta de `fetch` directamente con `mV` (V mayúscula) ya
  correcto, así que nunca ejercita el casing real que devuelve el backend.
- No existe ningún test de integración/end-to-end que golpee la respuesta real del backend y la
  haga pasar por el pipeline de render del chart, así que el mismatch nunca fue detectado.

## Affected component

- `src/backend/ECGViewer.Api/Filters/FilterModels.cs:14` (`SampleDto`)
- `src/frontend/src/lib/api/filters.ts:42-44` (`applyFilter` — parseo sin validar)
- `src/frontend/src/state/signalStore.ts:74-81` (`applyFilter` — guarda sin validar)
- `src/frontend/src/lib/ecg/chart/scale.ts:79-92` (`computeYRange` — propaga `NaN`)
- `src/frontend/src/components/render/drawChart.ts:114-134` (`drawSignal` — falla silenciosa de Canvas)

## Related PRD

- `docs/daw/prd/prd-FEAT-007b.md`: AC-06 exige que, al aplicar un filtro, "el sistema reemplace la
  señal mostrada por la señal filtrada devuelta". El requisito en sí es correcto y completo — el
  defecto es puramente de implementación (el JSON devuelto no respeta el contrato implícito que el
  propio front asume). **No hay gap en el PRD.**

## Gap in the PRD

No. AC-06 ya especifica correctamente el comportamiento esperado; el bug es un defecto de
implementación en la capa de serialización/deserialización, no una omisión de requisitos.

## Corrección propuesta (acordada con el usuario)

1. Fijar el nombre de propiedad JSON explícitamente en el backend:
   `[JsonPropertyName("mV")]` sobre `SampleDto.MV` en `FilterModels.cs`, para que el wire format sea
   `"mV"` sin depender de cómo la política camelCase transforme un nombre todo en mayúsculas.
2. Agregar un test de integración/contrato que golpee el backend real (sin mocks de `fetch` ni
   `PropertyNameCaseInsensitive` en la deserialización) y verifique que el front puede consumir la
   respuesta de `/api/filters/apply` y que el pipeline de render produce coordenadas válidas
   (no `NaN`) a partir de ella — para prevenir esta clase de regresión de casing en este endpoint o
   en endpoints similares que se agreguen a futuro.

## Confirmación

Análisis confirmado por el usuario el 2026-08-26.
