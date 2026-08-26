# Threat Model FIX-004: Filtros DSP — mismatch de casing mv/mV

| Field | Value |
|-------|-------|
| Ticket | FIX-004 |
| Fix-plan | docs/daw/specs/fix-FIX-004.md |
| Date | 2026-08-26 |

## Componentes modificados

1. `src/backend/ECGViewer.Api/Filters/FilterModels.cs:14` — `SampleDto.MV` se anota con
   `[property: JsonPropertyName("mV")]` para fijar el nombre de la propiedad en el JSON de
   respuesta de `POST /api/filters/apply`.
2. `src/backend/ECGViewer.Tests/FilterEndpointTests.cs` — nuevo test que lee el JSON crudo de la
   respuesta (sin `PropertyNameCaseInsensitive`) y assertea el wire format real.
3. `src/frontend/src/lib/api/filters.ts:42-44` (`applyFilter`) — se agrega validación en runtime del
   shape de la respuesta antes de aceptarla como señal válida.
4. `src/frontend/src/lib/api/filters.test.ts` — nuevo test que cubre el caso de casing incorrecto.

## Trust boundaries

Frontera existente, sin cambios: navegador (frontend, `src/frontend`) ↔ `ECGViewer.Api` (backend,
`.NET`) vía HTTP en `POST /api/filters/apply`, sin autenticación (consistente con "app de libre
acceso" de `AGENTS.md`). Este fix no agrega ninguna frontera nueva ni ningún endpoint nuevo: solo
corrige cómo se serializa un campo existente en esa frontera, y agrega una validación adicional del
lado del frontend sobre datos que ya cruzan esa frontera hoy.

## Análisis STRIDE

| Categoría | Análisis |
|---|---|
| Spoofing | N/A — la app no tiene identidad de usuario ni autenticación; sin cambios aquí. |
| Tampering | El JSON de respuesta viaja hoy sin TLS obligatorio en desarrollo local (riesgo preexistente, fuera de alcance de este fix). La validación agregada en el frontend (paso 3) en realidad **mejora** la detección de manipulación: si un intermediario alterase el shape de la respuesta, antes el front la aceptaba en silencio (propagando `NaN`); ahora la rechaza explícitamente con `{ ok: false, error }`. No es un riesgo nuevo, es una mitigación incidental. |
| Repudiation | N/A — no hay logging ni auditoría involucrados; sin cambios. |
| Information Disclosure | El mensaje de error para shape inválido debe ser genérico (p. ej. "Respuesta del backend con formato inesperado"), sin volcar el contenido crudo de la respuesta ni detalles internos — se especifica así en el fix-plan para no abrir una fuga de información nueva. |
| Denial of Service | La validación agregada recorre las muestras ya recibidas (mismo array, sin I/O ni llamadas nuevas) — costo O(n) marginal, acotado por el límite de muestras que NFR-02/el guard de `RejectsPayloadOverSampleLimit` ya impone del lado del backend. No hay riesgo de degradar el NFR-01 (500ms round-trip) porque no se agrega ningún request ni cómputo pesado. |
| Elevation of Privilege | N/A — no hay modelo de privilegios en esta app. |

## Clasificación de datos (F-TM-05)

Los datos que cruzan esta frontera son muestras numéricas de una señal ECG (`t`, `mV`) sin ningún
metadato de paciente ni identificador personal — dato público según la clasificación de `AGENTS.md`
("libre acceso, sin usuarios ni sesiones"). No aplica cifrado de PII/credenciales (F-TM-07): no hay
PII ni credenciales en este flujo.

## Riesgos identificados

Ninguno CRITICAL/HIGH. Único punto a especificar explícitamente en el fix-plan (no es un riesgo,
es una guía de implementación): el mensaje de error de la nueva validación defensiva debe ser
genérico y no debe incluir el cuerpo crudo de la respuesta del backend.

## Mitigaciones a incorporar en el fix-plan

1. El mensaje de error devuelto por la validación de shape en `applyFilter` debe ser genérico
   (sin volcar el JSON crudo recibido), consistente con los demás mensajes de error ya existentes en
   esa función (`'No se pudo conectar con el backend'`, `'Error inesperado del servidor'`).
