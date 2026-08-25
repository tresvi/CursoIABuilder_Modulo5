# Spec FEAT-007a: Esqueleto del backend .NET

| Field | Value |
|-------|-------|
| Ticket | FEAT-007a |
| PRD | docs/daw/prd/prd-FEAT-007a.md |
| Tier | FEATURE |
| Date | 2026-08-25 |
| Spec loops | 0 |

## Summary

Se crea `src/backend/` con una solución .NET 10 de dos proyectos: `ECGViewer.Api` (Minimal API con
`GET /api/health` y CORS explícito para el front de desarrollo) y `ECGViewer.Tests` (xUnit v3, test
de integración vía `WebApplicationFactory`). En el front se agrega un cliente HTTP mínimo
(`lib/api/client.ts`) que invoca ese endpoint leyendo `VITE_API_BASE`, y un componente
`BackendStatus.tsx` que muestra el resultado al usuario, montado antes de todo lo demás en
`App.tsx`. Las mitigaciones del threat model (`docs/daw/security/threat-FEAT-007a.md`) — CORS con
origen explícito, manejo de excepciones confinado a `Development` — quedan incorporadas en el
Bloque 1.

## Coverage: PRD → blocks

| Requirement | Covered by |
|---|---|
| FR-01 | Block 1, Block 2 |
| FR-02 | Block 1 |
| FR-03 | Block 1 |
| FR-04 | Block 3 |
| FR-05 | Block 4 |
| FR-06 | Block 1 |
| NFR-01 | Strategy: `GET /api/health` no ejecuta lógica ni I/O adicional — responde directo desde el handler, sin dependencias externas; medido en el test de integración del Bloque 2 (assert de latencia). |
| NFR-02 | Strategy: `Nullable enable` + `ImplicitUsings enable` en `ECGViewer.Api.csproj` (Bloque 1); `dotnet build` sin warnings se verifica como criterio de cierre del Bloque 1. |
| NFR-03 | Strategy: el Bloque 2 crea el test de integración del health check; `dotnet test` debe reportarlo en verde. |

## Dependencies between blocks

Block 1 → Block 2 (los tests de integración referencian el proyecto `ECGViewer.Api`).
Block 1 → Block 3 (el cliente HTTP del front necesita el endpoint ya definido para el contrato).
Block 3 → Block 4 (`BackendStatus.tsx` consume `checkHealth()` de `client.ts`).
Orden de ejecución: 1 → 2 → 3 → 4.

## Block 1 — Solución .NET + `GET /api/health` + CORS

**Files**
- `src/backend/ECGViewer.sln` (new)
- `src/backend/ECGViewer.Api/ECGViewer.Api.csproj` (new) — `Microsoft.NET.Sdk.Web`,
  `<TargetFramework>net10.0</TargetFramework>`, `<Nullable>enable</Nullable>`,
  `<ImplicitUsings>enable</ImplicitUsings>`.
- `src/backend/ECGViewer.Api/Program.cs` (new) — Minimal API: registra la política CORS, mapea
  `GET /api/health`, configura `UseDeveloperExceptionPage()` solo si
  `app.Environment.IsDevelopment()`.
- `src/backend/ECGViewer.Api/appsettings.json` / `appsettings.Development.json` (new, generados por
  el template `dotnet new web`) — sin cambios más allá del template estándar.

**Logic**

`Program.cs` construye el `WebApplication` con:
1. `builder.Services.AddCors(options => options.AddPolicy("FrontendDev", policy =>
   policy.WithOrigins("http://localhost:5173").AllowAnyMethod().AllowAnyHeader()));` — origen
   explícito, **sin** `AllowAnyOrigin()`, **sin** `AllowCredentials()` (mitigación del threat
   model: riesgo "CORS mal configurado").
2. `app.UseCors("FrontendDev");` antes de mapear los endpoints.
3. `if (app.Environment.IsDevelopment()) { app.UseDeveloperExceptionPage(); }` (mitigación del
   threat model: riesgo "página de excepciones filtra detalles" — confinada a `Development`, nunca
   incondicional).
4. `app.MapGet("/api/health", () => Results.Ok(new { status = "ok" }));`

**API contract**
- Method + path: `GET /api/health`
- Request: sin parámetros, sin body.
- Response: `200 OK` — `{ "status": "ok" }` (`Content-Type: application/json`).
- Error codes: ninguno esperado en condiciones normales (no hay dependencias externas que puedan
  fallar en este endpoint).
- Auth: ninguna (riesgo aceptado, documentado en el threat model — alcance local de desarrollo).

**Error handling**
- El handler de `/api/health` no tiene lógica que pueda fallar (no hay I/O, no hay parámetros que
  validar) — no hay una condición de error de aplicación que documentar ni testear en este bloque.
- `UseDeveloperExceptionPage()` confinado a `Development` es una configuración de seguridad
  (mitigación del threat model), no una condición de error de negocio — no aplica F-SPEC-16 aquí;
  no se define comportamiento de producción en este ticket (fuera de alcance del PRD).

**Required tests**
- [ ] `dotnet build` de la solución completa sin warnings de nulabilidad — valida AC-07, NFR-02.
- [ ] (cubierto en Block 2) test de integración de `GET /api/health` (`WebApplicationFactory`
      arrancando el host en memoria) — valida AC-01 (el servidor acepta conexiones) y AC-02.
- [ ] (cubierto en Block 2) test de CORS rechazando un origen no declarado — valida AC-05.

**Completion criterion**
`dotnet build` sobre `src/backend/ECGViewer.sln` compila sin errores ni warnings de nulabilidad, y
`dotnet run --project src/backend/ECGViewer.Api` levanta el servidor en el puerto configurado
(5080 por convención, ver `launchSettings.json` del template).

## Block 2 — Tests de integración (`ECGViewer.Tests`)

**Files**
- `src/backend/ECGViewer.Tests/ECGViewer.Tests.csproj` (new) — xUnit v3, referencia a
  `Microsoft.AspNetCore.Mvc.Testing` y `ProjectReference` a `ECGViewer.Api`.
- `src/backend/ECGViewer.Tests/HealthEndpointTests.cs` (new) — usa
  `WebApplicationFactory<Program>` para levantar el servicio en memoria e invocar
  `GET /api/health`.

**Logic**

`HealthEndpointTests` crea un `HttpClient` vía `WebApplicationFactory<Program>().CreateClient()`,
hace `GET /api/health`, y verifica: código `200`, cuerpo `{"status":"ok"}`, y que la respuesta
llega en menos de 200ms (`NFR-01`). Un segundo test verifica que una petición con el header
`Origin: http://evil.example` no recibe el header `Access-Control-Allow-Origin` en la respuesta
(valida AC-05 y la mitigación CORS del Bloque 1).

Nota: `Program` debe ser `public partial class Program` (patrón estándar de ASP.NET Minimal API
para que `WebApplicationFactory<Program>` pueda referenciarlo desde el proyecto de tests) — se
agrega al final de `Program.cs` en el Bloque 1.

**Error handling**
- Si el servicio no levanta (excepción en `Program.cs`), el test falla con la excepción del host —
  no requiere manejo adicional, es la señal esperada de un `dotnet build`/`dotnet test` roto.

**Required tests**
- [ ] `HealthEndpointTests.ReturnsOkWithStatusOk` — valida AC-01 (el host arranca y acepta la
      conexión del `HttpClient` de prueba) y AC-02.
- [ ] `HealthEndpointTests.RespondsUnder200ms` — valida NFR-01.
- [ ] `HealthEndpointTests.RejectsDisallowedOrigin` — valida AC-05 (sad path: origen no permitido).

**Completion criterion**
`dotnet test` sobre `src/backend/ECGViewer.Tests` reporta los 3 tests en verde — valida AC-04
(`dotnet test` corre y reporta resultado) y NFR-03.

## Block 3 — Cliente HTTP del front

**Files**
- `src/frontend/src/vite-env.d.ts` (new) — `/// <reference types="vite/client" />` (gap detectado
  en el impact scan: sin este archivo, `import.meta.env.VITE_API_BASE` rompe `tsc --noEmit`
  estricto).
- `src/frontend/src/lib/api/client.ts` (new) — exporta `checkHealth(): Promise<HealthResult>`, con
  `HealthResult = { ok: true } | { ok: false }`.
- `src/frontend/src/lib/api/client.test.ts` (new).

**Logic**

```ts
const API_BASE = import.meta.env.VITE_API_BASE ?? 'http://localhost:5080';

export async function checkHealth(): Promise<{ ok: boolean }> {
  try {
    const res = await fetch(`${API_BASE}/api/health`);
    return { ok: res.ok };
  } catch {
    return { ok: false };
  }
}
```

`checkHealth` nunca lanza — cualquier fallo de red (backend caído, CORS bloqueado, timeout) se
traduce a `{ ok: false }`, para que el llamador (Bloque 4) no necesite un `try/catch` propio.

**Input validation**
- No aplica: `checkHealth` no recibe parámetros de usuario.

**Error handling**
- Errores de red / fetch rechazado (backend no disponible, DNS, CORS) → capturados, devuelven
  `{ ok: false }` — valida AC-03 y AC-06 (fallback de `VITE_API_BASE`).
- `VITE_API_BASE` no definida → usa el valor por defecto `http://localhost:5080` (AC-06).

**Required tests**
- [ ] `client.test.ts` — `checkHealth` devuelve `{ ok: true }` cuando `fetch` resuelve con
  `res.ok === true` (mock de `fetch`) — valida AC-02 desde el lado del cliente.
- [ ] `client.test.ts` — `checkHealth` devuelve `{ ok: false }` cuando `fetch` rechaza (simula
  backend caído) — valida AC-03, AC-06 (sad path).
- [ ] `client.test.ts` — usa `http://localhost:5080` cuando `VITE_API_BASE` no está definida —
  valida AC-06.

**Completion criterion**
`npm test` (Vitest) pasa los 3 tests de `client.test.ts`, y `npm run typecheck` (`tsc --noEmit`)
sigue en verde con `vite-env.d.ts` agregado.

## Block 4 — `BackendStatus.tsx`

**Files**
- `src/frontend/src/components/BackendStatus.tsx` (new).
- `src/frontend/src/components/BackendStatus.test.tsx` (new).
- `src/frontend/src/App.tsx` (modified) — se agrega el import de `BackendStatus` (orden alfabético
  respetado entre los imports existentes) y se monta **antes de `CsvUpload`**, como primer
  elemento dentro de `<div className="flex flex-col gap-6">`.

**Logic**

`BackendStatus` usa `useState<'checking' | 'ok' | 'unreachable'>('checking')` y un `useEffect` que,
al montar, invoca `checkHealth()` y actualiza el estado según el resultado. Renderiza un texto:
"Backend: conectado" (ok), "Backend: no disponible" (unreachable), o nada visible/neutro mientras
`checking` (evita parpadeo de contenido). El resto de la app (`CsvUpload`, `ECGChart`, etc.) se
renderiza sin condicionar su disponibilidad al estado de `BackendStatus` — la app debe seguir
siendo 100% usable sin backend (AC-03 del PRD).

**Error handling**
- `checkHealth()` ya no lanza (Bloque 3) — `BackendStatus` no necesita `try/catch` propio.

**Required tests**
- [ ] `BackendStatus.test.tsx` — muestra "Backend: conectado" cuando `checkHealth` resuelve
  `{ ok: true }` (mock del módulo `client.ts`) — valida AC-02 desde la UI.
- [ ] `BackendStatus.test.tsx` — muestra "Backend: no disponible" cuando `checkHealth` resuelve
  `{ ok: false }` — valida AC-03.
- [ ] `BackendStatus.test.tsx` (o un test de `App.test.tsx` si existiera) — el resto de la app
  (ej. `CsvUpload`) sigue renderizado y funcional incluso con `checkHealth` en `{ ok: false }` —
  valida AC-03 explícitamente ("no debe romper el resto de la aplicación").

**Completion criterion**
`npm test` pasa los 3 tests de `BackendStatus.test.tsx`, `BackendStatus` aparece antes que
`CsvUpload` en el DOM renderizado por `App`, y `npm run build` (`tsc --noEmit && vite build`) sigue
en verde.

## Final verification

- `dotnet build` (solución completa) y `dotnet test` (`ECGViewer.Tests`) en verde, sin warnings de
  nulabilidad.
- `npm run typecheck`, `npm test` y `npm run build` (front) en verde.
- Levantando ambos servicios (`dotnet run` + `npm run dev`), la app muestra "Backend: conectado" y,
  al detener el backend, cambia a "Backend: no disponible" sin romper el resto de la UI.
- Las dos mitigaciones del threat model (CORS explícito, manejo de excepciones por entorno) están
  implementadas tal como se describen en el Bloque 1.
