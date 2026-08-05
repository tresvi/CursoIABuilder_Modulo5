# AGENTS.md — project context

> **DAW template.** Fill in the `[...]` with what is true of YOUR project and delete what does not
> apply. This file describes **the project**; **the process** is DAW's job (phases, gates, when to
> test, when to commit). Do not mix the two: process rules written here compete with the pipeline's.
>
> It is **tool-agnostic on purpose**: Claude Code reads it through the import in `CLAUDE.md`, Codex
> CLI, Copilot CLI, Cursor and OpenCode read it directly, and Gemini CLI gets it through
> `GEMINI.md`. The same file serves whichever tool you open the repo with — which is the point:
> porting the pipeline to another tool must not mean rewriting what your project is.

---

## Language

**Always respond in the language the user writes in.** Write every artifact you produce — PRDs,
specs, ADRs, reports, commit messages, status lines — in that same language, regardless of the
language these instructions are written in.

If this project has a fixed working language, state it here and use it instead:

> Working language: `Spanish — write all artifacts in Spanish`

---

## What this project is

ECGViewer: aplicación web para visualizar, filtrar y analizar señales de electrocardiograma (ECG)
desde archivos CSV/XLSX. Orientada a entornos educativos y de investigación en ingeniería biomédica.
App de libre acceso (sin usuarios ni sesiones); no es una herramienta de diagnóstico clínico certificado.

**Reference PRD:** `docs/daw/prd/PRD.md`

---

## Stack

## Stack — Front end (`src/frontend`)

| Field | Value |
|-------|-------|
| Language | TypeScript 5.7 |
| Runtime | Navegador (build/dev con Vite 6) |
| Framework | React 19.2 (Vite) + Tailwind CSS v4 (`@tailwindcss/vite`) · shadcn/ui · lucide-react |
| Database | N/A |
| Test runner | Vitest 2 + React Testing Library (`@testing-library/react` · `jest-dom`) sobre jsdom |
| Linter / formatter | ESLint 9 (flat config, `typescript-eslint`) + Prettier 3 |
| Package manager | npm |

## Stack — Back end (`src/backend`)

| Field | Value |
|-------|-------|
| Language | C# (.NET 10, `Nullable` + `ImplicitUsings` enabled) |
| Runtime | .NET 10 |
| Framework | ASP.NET Core Minimal API (`Microsoft.NET.Sdk.Web`) |
| Database | SQLite (`Microsoft.Data.Sqlite` + `SQLitePCLRaw.bundle_e_sqlite3`) |
| Test runner | xUnit v3 + `Microsoft.NET.Test.Sdk`; integración con `Mvc.Testing`; cobertura con coverlet |
| Linter / formatter | `dotnet format` (analizadores del SDK) |
| Package manager | NuGet |

## Dependencias NuGet (back)

Versiones exactas viven en el `.csproj`; acá solo el "qué y por qué".

| Package | Versión | Para qué |
|---------|---------|----------|
| `FftSharp` (Scott Harden) | 2.2.0 | Cálculos de filtros DSP (pasa bajo/alto/banda/notch) |
| `ClosedXML` | 0.105.0 | Creación/manipulación de archivos Excel `.xlsx` (import/export). Arrastra `DocumentFormat.OpenXml` como dependencia transitiva. |
| `Microsoft.Data.Sqlite` | 10.0.9 | Acceso a la base SQLite (estudios guardados) |
| `SQLitePCLRaw.bundle_e_sqlite3` | 3.0.3 | Motor nativo SQLite empaquetado para `Microsoft.Data.Sqlite` |

---

## Architecture conventions

- **Folder structure:** monorepo con `src/frontend` (React + Vite) y `src/backend` (.NET). Front:
  primitivos de UI en `src/frontend/src/components/ui/`, cascarón/layout en `components/layout/`,
  gráfico ECG en `components/ECGChart.tsx` + `render/`, utilidades (`cn`) en `src/frontend/src/lib/`.
  Alias `@/*` → `src/*`. Back: solución con dos proyectos, `ECGViewer.Api` (Minimal API) y
  `ECGViewer.Tests` (xUnit).
- **Layer separation:** la UI nunca habla con la base de datos ni con el sistema de archivos; siempre
  vía la API (`VITE_API_BASE`, por defecto `http://localhost:5080`). El procesamiento de señal, los
  filtros DSP y la persistencia en SQLite viven en el back; el front solo renderiza y consume endpoints.
- **Error handling:** nunca procesar en silencio una entrada inválida. Ante un CSV/XLSX multicanal o
  malformado, informar y no procesar. `Nullable` está habilitado en el back: no ignorar warnings de
  nulabilidad. Cambios (marcadores, filtros, recortes) no se persisten solos: solo al "Guardar".
- **Naming:** componentes React en PascalCase (`AppLayout`, `Sidebar`, `ECGChart`); primitivos de UI
  en minúscula (`button`, `card`, `badge`). `select`/`input` son nativos estilados (no Radix) para
  preservar `aria-label` y los tests.
- **Dependencies:** no agregar librerías sin justificarlas en la spec. El gráfico ECG es Canvas 2D
  propio: NO reemplazar por una librería de charting (Principio V). Versiones NuGet exactas en el
  `.csproj`. No hardcodear secretos: la API key de Claude va en `.env` como `ANTHROPIC_API_KEY`.

---

## Code conventions

- Front: no usar `any`. Si es inevitable, va con un comentario que explique por qué. El build corre
  `tsc --noEmit` (typecheck estricto): mantenerlo verde.
- Back: `Nullable enable` e `ImplicitUsings enable`; respetar la anotación de nulabilidad en vez de
  silenciarla con `!`.
- Estilar con las herramientas del repo, no a mano: front con Prettier + ESLint (`npm run format` /
  `npm run lint`), back con `dotnet format`.
- Comentarios solo cuando el *porqué* no es obvio a partir del código.

---

## What NOT to do in this project

- NO persistir cambios automáticamente: marcadores, filtros y recortes se guardan solo al presionar
  "Guardar". Si hay cambios pendientes al cerrar/recargar, alertar y pedir confirmación.
- NO modificar destructivamente la señal original: filtros y recortes deben poder revertirse a la
  señal cargada.
- NO calcular las métricas (BPM, SDNN, RMSSD, pNN50) sobre todo el archivo: siempre sobre la ventana
  de tiempo visible.
- NO usar librerías gráficas que no cumplan el rendimiento exigido: render <0.1 s para 1 minuto de
  señal, sin parpadeos. NO reemplazar el Canvas 2D propio.
- NO asumir señales multicanal: la app soporta un solo canal; ante un CSV/XLSX multicanal, informar
  y no procesar.
- NO aplicar el recorte de inmediato: seleccionar con el mouse, mostrar confirmación y recortar solo
  si el usuario acepta.
- NO agregar inicio de sesión ni datos por usuario: la app es de libre acceso.
- NO hardcodear la API key de Claude: va en `.env` como `ANTHROPIC_API_KEY`.
- NO llamar a la API de Claude desde los tests: usar mocks/fakes.
- NO agregar features fuera de alcance: captura en tiempo real por hardware, multi-usuario/roles/nube,
  HL7/DICOM, export a firmware, multi-tenant.
- NO presentar ECGViewer como herramienta de diagnóstico clínico certificado.

---

## Domain glossary

- **ECG (electrocardiograma):** señal de tensión vs. tiempo que representa la actividad eléctrica del
  corazón. La app trabaja con un solo canal.
- **BPM:** latidos por minuto, calculado sobre la ventana visible.
- **SDNN / RMSSD / pNN50:** métricas de variabilidad de la frecuencia cardíaca (HRV), calculadas sobre
  la ventana de tiempo visible, no sobre todo el archivo.
- **Filtros DSP:** pasa bajo / pasa alto / pasa banda / notch, aplicados sobre la señal vía FftSharp;
  reversibles.
- **Recorte:** selección de un sub-tramo de la señal; se aplica solo tras confirmación del usuario.
- **Marcador:** anotación puntual sobre la señal; se persiste solo al "Guardar".
- **Estudio:** una señal cargada con su configuración (filtros, marcadores, recortes) que puede
  guardarse en SQLite.

---


<!-- BEGIN DAW (managed by DAW — do not edit by hand) -->
# DAW — Dilux Agentic Workflow

This repo uses **DAW**: an agent-driven development pipeline with the phases
`CLASSIFY → DEFINE → PLAN → CODE → VERIFY → RELEASE`.

Before answering, read `.daw/orchestrator.md` and run its Boot Sequence. It is a strict state
machine: it decides what you are allowed to do based on the phase recorded in `.daw-state.json`.

The project's own context — stack, architecture, domain — is elsewhere in this file. It lives here,
in `AGENTS.md`, and not in any one tool's file, on purpose: it is tool-agnostic and comes along
unchanged when the pipeline is ported to another agent.
<!-- END DAW -->
