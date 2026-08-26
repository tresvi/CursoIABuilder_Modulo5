# SAST FIX-004: Filtros DSP — mismatch de casing mv/mV

| Field | Value |
|-------|-------|
| Ticket | FIX-004 |
| Date | 2026-08-26 |

## Archivos escaneados

- `src/backend/ECGViewer.Api/Filters/FilterModels.cs`
- `src/backend/ECGViewer.Tests/FilterEndpointTests.cs`
- `src/frontend/src/lib/api/filters.ts`
- `src/frontend/src/lib/api/filters.test.ts`

## Secrets

✅ F-SAST-01: sin API keys, passwords, tokens ni connection strings en ninguno de los 4 archivos.
`.env` ya está en `.gitignore` (sin cambios en esta área).

## Injection

✅ F-SAST-02/03/05: sin queries SQL/NoSQL, sin exec/spawn/system, sin paths construidos con input de
usuario. El único cambio de lógica es una anotación de serialización JSON y una validación de
tipos (`Number.isFinite`) sobre datos ya deserializados — no hay concatenación ni interpolación de
strings hacia ningún intérprete.

## XSS y funciones inseguras

✅ F-SAST-04/06/17: sin `innerHTML`, `dangerouslySetInnerHTML`, `eval`, `exec()` ni deserialización
insegura. `res.json()` es el parser estándar de `fetch`, ya usado en el resto del cliente HTTP.

## Otras categorías obligatorias

✅ F-SAST-07 (SSRF): sin nuevas llamadas salientes ni URLs construidas dinámicamente.
✅ F-SAST-08 (crypto débil): N/A, sin criptografía involucrada.
✅ F-SAST-09 (debug mode): sin cambios en configuración de entorno.
✅ F-SAST-10 (logging de datos sensibles): el nuevo mensaje de error
(`'Respuesta del backend con formato inesperado'`) es genérico y no vuelca el cuerpo crudo de la
respuesta — consistente con la mitigación del threat model.
✅ F-SAST-11 (upload sin restricciones): N/A.
✅ F-SAST-12 (CSRF): sin cambios de autenticación/sesión (la app no tiene ninguna).
✅ F-SAST-14 (validación de input incompleta): el cambio en `filters.ts` **agrega** validación
donde antes no había ninguna (ese es el propósito del fix), sin dejar ningún camino sin cubrir: el
`Array.isArray` + `every` cubre tanto un `samples` ausente/no-array como cualquier muestra
individual malformada.
✅ F-SAST-15 (error handling que filtra internals): el mensaje de error no incluye stack traces ni
el payload recibido.

## Dependencias

✅ F-SAST-13/16: sin dependencias nuevas — el cambio usa `System.Text.Json.Serialization` (ya parte
del SDK de .NET 10) y `Number.isFinite`/`Array.isArray` (built-ins de JS). No aplica `npm audit` ni
`dotnet list package --vulnerable` porque no se tocó ningún `.csproj` ni `package.json`.

## Suppressions

Ninguna — no hay hallazgos Medium que requieran documentar una excepción.

## Resultado

Total: 8 categorías limpias, 0 vulnerabilidades (0 crítico, 0 alto, 0 medio).
