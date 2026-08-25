# PRD FEAT-007a: Esqueleto del backend .NET

| Field | Value |
|-------|-------|
| Ticket | FEAT-007a |
| Tracker | none |
| Date | 2026-08-25 |
| PRD loops | 0 |

## Context and Problem

ECGViewer hoy es una app 100% front-end (React + Vite): no existe ningún proyecto .NET en el repo,
pese a que `AGENTS.md` ya documenta el stack de back-end esperado (ASP.NET Core Minimal API sobre
.NET 10, SQLite, FftSharp, ClosedXML). Sin ese backend, ningún requisito funcional que dependa de
procesamiento server-side puede avanzar: RF-10/RF-11 (filtros DSP y revertir), RF-12/RF-13
(export/import xlsx) y RF-15 (persistencia de estudios) están todos bloqueados.

Este ticket construye únicamente el esqueleto: una solución .NET con un proyecto de API mínima que
responde, un proyecto de tests, y la conexión básica desde el front (que hoy no habla con ningún
backend) para verificar que la comunicación funciona. No implementa filtros, ni SQLite, ni ningún
endpoint de negocio — eso es FEAT-007b y tickets futuros.

## Goals

- Tener una solución .NET 10 compilable y corriendo localmente, siguiendo exactamente el stack
  documentado en `AGENTS.md` (ASP.NET Core Minimal API, `Nullable`/`ImplicitUsings` habilitados).
- Que el front pueda confirmar, en tiempo de desarrollo, que puede alcanzar el backend a través de
  `VITE_API_BASE` (por defecto `http://localhost:5080`), sin romper la capa de separación (la UI
  sigue sin hablar directo con archivos/DB).
- Dejar una base de testing (xUnit) lista para que FEAT-007b y los tickets siguientes agreguen sus
  propios tests sin tener que resolver de nuevo el andamiaje del proyecto.

## Functional Requirements

- FR-01: El sistema debe exponer una solución .NET (`ECGViewer.sln`) con dos proyectos: `ECGViewer.Api`
  (Minimal API, `Microsoft.NET.Sdk.Web`) y `ECGViewer.Tests` (xUnit v3).
- FR-02: `ECGViewer.Api` debe exponer un endpoint `GET /api/health` que responda `200 OK` con un
  cuerpo JSON `{ "status": "ok" }`, sin autenticación (la app no tiene usuarios/sesiones).
- FR-03: `ECGViewer.Api` debe tener CORS habilitado permitiendo el origen del front en desarrollo
  (`http://localhost:5173`, el puerto por defecto de Vite), para que las llamadas desde el navegador
  no sean bloqueadas por el navegador.
- FR-04: El front debe tener un cliente HTTP mínimo (`src/frontend/src/lib/api/client.ts` o
  equivalente) que lea la URL base desde `VITE_API_BASE` (con `http://localhost:5080` como valor por
  defecto si la variable de entorno no está definida) y exponga una función para invocar
  `GET /api/health`.
- FR-05: Debe existir un indicador visual mínimo en la UI (por ejemplo, un elemento en el layout que
  muestre "Backend: conectado" / "Backend: no disponible") que invoque el health check al montar la
  app y refleje el resultado, para que el estado de la conexión sea observable sin abrir devtools.
- FR-06: El repositorio debe versionar `ECGViewer.Api`'s configuración de `Nullable enable` e
  `ImplicitUsings enable` en el `.csproj`, siguiendo la convención de `AGENTS.md`.

## Non-Functional Requirements

- NFR-01: El endpoint `GET /api/health` debe responder en menos de 200ms bajo condiciones normales
  de desarrollo local (sin carga concurrente).
- NFR-02: La solución debe compilar sin warnings de nulabilidad (`dotnet build` limpio, sin `!`
  usados para silenciar advertencias del `Nullable` habilitado).
- NFR-03: El proyecto `ECGViewer.Tests` debe poder ejecutarse con `dotnet test` y reportar al menos 1
  test pasando (el propio health check) antes de cerrar este ticket.

## Acceptance Criteria

- AC-01 (FR-01): WHEN se ejecuta `dotnet run` sobre `ECGViewer.Api`, THE sistema SHALL levantar el
  servidor y aceptar conexiones HTTP en el puerto configurado.
- AC-02 (FR-02): WHEN el front invoca `GET /api/health` con el backend corriendo, THE sistema SHALL
  responder `200 OK` con `{ "status": "ok" }` en menos de 200ms.
- AC-03 (FR-05): WHEN el front invoca el health check y el backend NO está corriendo, THE sistema
  SHALL mostrar el indicador visual como "no disponible" sin romper el resto de la aplicación (la app
  debe seguir siendo usable sin backend, ya que hoy funciona 100% client-side).
- AC-04 (FR-01): WHEN se ejecuta `dotnet test` sobre la solución, THE sistema SHALL correr el test
  suite de `ECGViewer.Tests` y reportar el resultado (pass/fail) por consola.
- AC-05 (FR-03): IF una petición llega a `GET /api/health` desde un origen distinto de
  `http://localhost:5173` en desarrollo, THEN THE sistema SHALL aplicar la política CORS configurada
  (rechazar o permitir según la configuración explícita, nunca un comodín `*` sin restricciones).
- AC-06 (FR-04): IF el front no puede resolver `VITE_API_BASE` (variable no definida), THEN THE
  sistema SHALL usar `http://localhost:5080` como valor por defecto sin lanzar una excepción no
  controlada.
- AC-07 (FR-06): WHEN se ejecuta `dotnet build` sobre la solución, THE sistema SHALL compilar sin
  warnings de nulabilidad en `ECGViewer.Api`.

## Out of Scope

- Cualquier endpoint de negocio (filtros DSP, export/import xlsx, persistencia de estudios) — eso es
  FEAT-007b y tickets futuros (RF-12/13/15).
- Persistencia en SQLite — el paquete NuGet ya está documentado en `AGENTS.md` para uso futuro, pero
  este ticket no crea ningún esquema ni repositorio.
- Autenticación/autorización — la app es de libre acceso, sin usuarios ni sesiones (fuera de alcance
  del proyecto completo).
- Configuración de CORS para producción/despliegue — este ticket cubre únicamente el origen de
  desarrollo local de Vite; la configuración de producción se define cuando exista un plan de
  despliegue del backend.
- Dockerización o cualquier infraestructura de despliegue del backend.

## Risks and Mitigations

- Riesgo: la política CORS termina siendo demasiado permisiva (`AllowAnyOrigin`) por simplicidad de
  desarrollo. Mitigación: declarar explícitamente el origen `http://localhost:5173` en la política,
  nunca un comodín, y AC-05 lo valida.
- Riesgo: el front asume que el backend siempre está disponible y rompe la app si no lo está.
  Mitigación: AC-03 exige que la app siga siendo usable sin backend — el health check es informativo,
  no bloqueante.
- Riesgo: divergencia entre la versión de .NET documentada (`AGENTS.md` dice .NET 10) y la instalada
  en el entorno de desarrollo/CI. Mitigación: fijar el `TargetFramework` en el `.csproj` y validarlo
  como parte de AC-01 (si no compila con .NET 10, el AC falla explícitamente en vez de degradar
  silenciosamente a otra versión).

## Dependencies

- Ninguna — es el primer sub-ticket del split de FEAT-007 y no depende de trabajo previo del
  backend (que no existe aún).
- FEAT-007b (filtros DSP, RF-10/RF-11) depende de que este ticket esté completo y mergeado, ya que
  reutiliza la solución/proyecto API creados acá.
