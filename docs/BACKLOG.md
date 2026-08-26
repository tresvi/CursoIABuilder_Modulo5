# Backlog

Pendientes conocidos de ECGViewer que todavía no se convirtieron en tickets DAW. No confundir con
`docs/daw/`, que es namespace exclusivo de los artefactos que produce el pipeline (PRDs, specs,
RCAs, reportes) — este archivo es libre, de mantenimiento manual.

## Requisitos funcionales del PRD maestro sin implementar

- **RF-12** — Exportar la señal cargada a un archivo Excel (`.xlsx`).
- **RF-13** — Importar una señal desde un archivo Excel (`.xlsx`).
- **RF-15** — Persistir cambios (marcadores, filtros, recortes) solo al presionar "Guardar"
  explícitamente (implica el backend con SQLite para estudios guardados).

`ClosedXML` y `Microsoft.Data.Sqlite` ya están documentados en `AGENTS.md` como dependencias
previstas para este trabajo, pero ningún `.csproj` los referencia todavía. Candidato a splitear en
sub-tickets (export xlsx / import xlsx / persistencia SQLite son bastante independientes entre sí),
como se hizo con FEAT-007 → FEAT-007a/b.

## Deuda técnica y gaps de proceso

- **Cobertura de tests de renderizado del gráfico ECG.** Las ACs de performance (≥10fps, frame
  <100ms) se validan hoy de forma manual/informal por ticket, sin un harness automatizado
  repetible para las funciones de dibujo en Canvas.
- **Migrar documentación de pendientes desde "modulo4"** a este repo (destino y contenido exacto a
  definir con el usuario cuando se retome).
- **CI**: no existe ningún workflow en `.github/workflows/`. Falta al menos un job que corra
  typecheck/lint/test de `src/frontend` (y `dotnet test` de `src/backend`) en cada push/PR.
- **CD a GitHub Pages**: deploy del build de `src/frontend` a GitHub Pages. Puede construirse sobre
  el CI una vez que exista.
- **Regla — tooltip Δt/ΔmV**: falta más separación vertical/horizontal entre las dos líneas del
  tooltip (`drawOverlay.ts`, `drawRuler`) y reducir un poco el tamaño de fuente actual (20px, subido
  desde 10px en FIX-003) — confirmar el tamaño objetivo exacto con el usuario antes de implementar.
- **Límite de 500.000 muestras en `POST /api/filters/apply`** (FEAT-007b): mitigación temporal de un
  riesgo HIGH de DoS aceptada en el threat model. Deberá ampliarse/revisarse a futuro; evaluar si
  conviene hacerlo configurable (env var / `appsettings`) en vez de una constante hardcodeada.
- **`AppLayout` dejó de ser un shell agnóstico del estado** porque monta `TopBar`, que lee
  `signalStore` (lo prescribe la spec de FEAT-009, Block 2). Refactor candidato al cerrar FEAT-009:
  montar `TopBar` desde `App.tsx` o desde `MainPanel`, para que el shell vuelva a ser testeable sin
  stores.

## Notas de uso

Cuando se arranque una nueva sesión, revisar este archivo y preguntar al usuario si quiere convertir
alguno de estos puntos en un ticket DAW antes de asumir que el backlog es solo RF-12/13/15.
