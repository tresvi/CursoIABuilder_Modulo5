# PRD FEAT-008: Pipeline CI en GitHub Actions

| Field | Value |
|-------|-------|
| Ticket | FEAT-008 |
| Tracker | none |
| Date | 2026-08-26 |
| PRD loops | 1 |

## Context and Problem

El repo es un monorepo con dos stacks independientes (`src/frontend` con npm/Vitest/ESLint,
`src/backend` con .NET/xUnit/`dotnet format`) sin ninguna automatización de CI. Hoy, instalar
dependencias, lintear y testear depende de que cada colaborador lo corra manualmente antes de abrir
un PR; nada impide mergear un PR con tests rotos o código sin lintear. No hay carpeta
`.github/workflows/`.

## Goals

- Que cada Pull Request corra automáticamente: instalación de dependencias, linter y tests, para
  ambos stacks (front y back).
- Que un PR con lint o tests en rojo quede visualmente marcado como fallido en GitHub, sin bloquear
  el merge de forma dura (no se configuran branch protection rules en este alcance).
- Que el pipeline no dependa de secretos ni llame a servicios externos.

## Functional Requirements

- FR-01: El workflow SHALL disparar en el evento `pull_request` (cualquier rama base).
- FR-02: El workflow SHALL tener un job para el frontend que instale dependencias con
  `npm ci` (usando `src/frontend/package-lock.json`), corra `npm run lint` y corra `npm test`.
- FR-03: El workflow SHALL tener un job para el backend que instale dependencias con
  `dotnet restore`, corra `dotnet format --verify-no-changes` como paso de lint, y corra
  `dotnet test`.
- FR-04: El job de frontend y el de backend SHALL correr en paralelo (jobs independientes, sin
  dependencia entre sí).
- FR-05: El workflow SHALL fijar versiones concretas de runtime (Node y .NET) coincidentes con las
  declaradas en `AGENTS.md` (Node compatible con Vite 6/React 19; .NET 10).
- FR-06: El workflow NO SHALL declarar ni requerir ningún secreto (`secrets.*`) para completar
  instalación, lint o tests.

## Non-Functional Requirements

- NFR-01 (Seguridad): el workflow SHALL fijar las acciones de terceros (`actions/checkout`,
  `actions/setup-node`, `actions/setup-dotnet`) por versión mayor pineada (ej. `@v4`), sin usar
  `@latest` ni un branch flotante.
- NFR-02 (Aislamiento de red): ningún test ejecutado por el pipeline SHALL realizar llamadas HTTP
  salientes a servicios externos (APIs de terceros, LLMs, etc.); los tests de integración del
  backend usan `Microsoft.AspNetCore.Mvc.Testing` (in-process) y no hacen requests reales.
- NFR-03 (Tiempo): el pipeline completo (ambos jobs, en paralelo) SHALL completar en menos de 10
  minutos en un runner estándar de GitHub Actions (`ubuntu-latest`), para no degradar el flujo de PR.

## Acceptance Criteria

- AC-01: WHEN se abre o actualiza un Pull Request (FR-01), THE pipeline SHALL ejecutar el job de
  frontend con `npm ci` → `npm run lint` → `npm test` (FR-02) y el job de backend con
  `dotnet restore` → `dotnet format --verify-no-changes` → `dotnet test` (FR-03).
- AC-02: WHEN los dos jobs (FR-02, FR-03) se disparan para el mismo PR, THE pipeline SHALL
  ejecutarlos en paralelo (FR-04), sin que uno espere al otro.
- AC-03: WHEN el linter o los tests de cualquiera de los dos jobs fallan, THE pipeline SHALL
  reportar ese job como fallido en el check del PR; WHEN ambos pasan, THE pipeline SHALL reportar
  ambos checks como exitosos.
- AC-04: WHEN se configuran los steps `actions/setup-node` y `actions/setup-dotnet`, THE workflow
  SHALL fijar las versiones de Node y .NET declaradas en `AGENTS.md` (FR-05).
- AC-05: IF el workflow requiere una variable de entorno o un secreto (`secrets.*`) para completar
  cualquier paso, THEN THE workflow SHALL considerarse no conforme a FR-06 y no debe mergearse así.
- AC-06: IF un test necesitara llamar a una API externa (ej. Claude/Anthropic) para pasar, THEN
  ese test SHALL ser reemplazado por uno que use un mock/fake antes de mergear este PR — el
  pipeline no debe depender de conectividad de red saliente ni de credenciales de terceros.

## Out of Scope

- Branch protection rules / checks obligatorios para mergear (requiere configuración manual en
  GitHub, fuera del archivo de workflow).
- Deploy o CD (build de producción, publicación a hosting, Docker, etc.).
- Cobertura de tests como gate numérico (badge de coverage, umbral mínimo enforced en CI).
- Cacheo avanzado de dependencias entre corridas (se usa el caching nativo de
  `actions/setup-node`/`actions/setup-dotnet` si está disponible, sin configuración adicional).
- Notificaciones (Slack, email) sobre el resultado del pipeline.

## Risks and Mitigations

- **Riesgo:** el proyecto no declara actualmente ninguna variable de entorno real usada en tests
  (`ANTHROPIC_API_KEY` está documentada en `AGENTS.md` como convención futura, pero no hay código
  ni tests que la usen hoy). Si en el futuro se agrega una integración real con la API de Claude,
  el CI podría empezar a fallar si esos tests no mockean la llamada.
  **Mitigación:** AC-05 deja explícito que cualquier test que dependa de una API externa debe
  mockearse antes de poder mergear; queda como regla de diseño para trabajo futuro, no solo para
  este PR.
- **Riesgo:** `dotnet format --verify-no-changes` podría fallar en el primer run si hay archivos
  del backend actualmente sin formatear, bloqueando checks en verde incluso sin relación con este
  PRD. **Mitigación:** correr `dotnet format` localmente antes de mergear el workflow, como parte
  de la implementación (bloque de CODE), y dejarlo documentado si aparecen archivos a corregir.
- **Riesgo:** acciones de terceros no pineadas por hash pueden ser comprometidas (supply chain).
  **Mitigación:** NFR-01 fija versión mayor de las acciones oficiales de GitHub (`actions/*`), que
  tienen mejor track record de seguridad que acciones de terceros no oficiales.

## Dependencies

- `src/frontend/package.json` (scripts `lint`, `test`) y su lockfile.
- `src/backend/ECGViewer.Api.csproj` / `ECGViewer.Tests.csproj` y la solución .NET.
- Ninguna dependencia de infraestructura externa (SQLite corre embebido en los tests, sin servidor
  separado).
