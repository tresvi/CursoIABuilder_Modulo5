# Backlog

Pendientes conocidos de ECGViewer que todavía no se convirtieron en tickets DAW. No confundir con
`docs/daw/`, que es namespace exclusivo de los artefactos que produce el pipeline (PRDs, specs,
RCAs, reportes) — este archivo es libre, de mantenimiento manual.

## Requisitos funcionales del PRD maestro sin implementar

- **RF-12** — Exportar la señal cargada a un archivo Excel (`.xlsx`).
- **RF-13** — Importar una señal desde un archivo Excel (`.xlsx`).
- **RF-15** — Persistir cambios (marcadores, filtros, recortes) solo al presionar "Guardar"
  explícitamente (implica el backend con SQLite para estudios guardados).

Desde FEAT-009 (Block 4) los tres ya tienen **su lugar reservado en la UI**: la sección "Archivo"
del sidebar muestra "Importar XLSX" (RF-13), "Guardar" (RF-15), "Guardar como CSV" y "Exportar
XLSX" (RF-12) como ítems visibles pero deshabilitados (`components/layout/DisabledMenuItem.tsx`,
sin handler asociado). Implementar cada RF implica reemplazar su `DisabledMenuItem` por el control
real; no hay que agregar entradas de menú nuevas.

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
- **Validación de rango invertido de `FilterPanel` sin cobertura.** El mensaje
  `'La frecuencia baja debe ser menor que la alta.'` (`FilterPanel.tsx:104`) no lo ejercita ningún
  test: se puede borrar entero y la suite sigue verde. No se corrige en FEAT-009 porque el criterio
  de cierre del Block 3 exige que `FilterPanel.test.tsx` quede sin modificar. Candidato a QUICK-FIX
  posterior.
- **Herramienta "Desplazar" (pan) inexistente.** La referencia visual
  (`docs/UI/UI_Without_any_ECG_Loaded.PNG`) la lista entre las herramientas y el PRD de FEAT-009 la
  nombra en AC-03, pero la app no tiene implementación de desplazamiento: la unión
  `ChartTool` de `viewStore.ts` es `'none' | 'zoom' | 'mark' | 'ruler' | 'crop'`. FEAT-009 la
  renderiza **visible pero deshabilitada** en la sección "Herramientas" (decisión de diseño 5 de
  `docs/daw/specs/spec-FEAT-009.md`), porque ese PRD deja fuera de alcance modificar la lógica de
  las herramientas. Queda como funcionalidad futura: agregar el miembro `'pan'` a `ChartTool`, el
  arrastre sobre el Canvas y el reemplazo del `DisabledMenuItem` por un toggle real.

- **Los filtros deben vivir en el panel central, no en el sidebar** (decisión de producto tomada,
  según la referencia visual `docs/UI/UI_With_ECG_Loaded.PNG`). FEAT-009 los deja en el sidebar
  porque así lo mandan su FR-04/AC-04; el traslado se hará en un ticket **FEAT-010** con su propio
  PRD, que sacará `FilterPanel` del sidebar y lo llevará al panel principal como tarjeta
  "Filtro digital".

- **Los ítems deshabilitados salen del orden de foco.** `DisabledMenuItem` usa `<button disabled>`,
  que es inalcanzable por teclado: para quien navega con tabulador o lector de pantalla, esos ítems
  no existen. Si la intención de FR-08 es _anunciar_ funcionalidad futura, el patrón correcto sería
  `aria-disabled="true"` **sin** `disabled` (focusable, sin handler, sin activación). Decisión de
  producto pendiente.
- **`title="No disponible todavía"` no es un mecanismo accesible.** No se anuncia de forma fiable en
  lectores de pantalla y no es alcanzable por teclado ni en táctil. Debería reemplazarse por texto
  visible o por `aria-describedby` apuntando a un texto real.
- **Diferencias con la referencia visual pendientes de resolver** (candidatas a FEAT-010): la app
  rotula "Recorte" y `docs/UI/UI_Without_any_ECG_Loaded.PNG` rotula "Recortar"; el orden de las
  herramientas difiere (la referencia: Rejilla / Zoom / Restablecer / Desplazar / Regla / Recortar /
  Marcar); y la referencia muestra un selector **"Velocidad 25 mm/s"** en la barra superior que no
  existe en la app ni está especificado en ningún bloque de la spec de FEAT-009.
- **`accept=".csv,text/csv"` de `CsvUpload.tsx` sin cobertura.** Ningún test lo asevera: se puede
  borrar y la suite sigue verde. Gap preexistente en `main`, no una regresión de FEAT-009.
- **Redacción imprecisa en el threat model de FEAT-009.** `docs/daw/security/threat-FEAT-009.md:114`
  afirma que R-04 queda "verificada por el test de AC-08"; en rigor ningún test conductual puede
  distinguir un `disabled` con `onClick` de uno sin él, porque React no entrega eventos de mouse a
  elementos deshabilitados. La garantía real la dan el tipo de props de `DisabledMenuItem` (no
  admite handlers) y la guarda de compilación `@ts-expect-error` de `FileSection.test.tsx`.
  Corregir la redacción cuando corresponda tocar ese artefacto (es de PLAN).

## Notas de uso

Cuando se arranque una nueva sesión, revisar este archivo y preguntar al usuario si quiere convertir
alguno de estos puntos en un ticket DAW antes de asumir que el backlog es solo RF-12/13/15.
