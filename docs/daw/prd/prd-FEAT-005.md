# PRD FEAT-005: Herramienta Recorte — recortar señal con confirmación (RF-09)

| Field | Value |
|-------|-------|
| Ticket | FEAT-005 |
| Tracker | none |
| Date | 2026-08-23 |
| PRD loops | 2 |

## Context and Problem

Los usuarios de ECGViewer suelen querer trabajar sobre un sub-tramo de la señal cargada (por
ejemplo, descartar ruido al inicio/final del registro o aislar un episodio de interés) en vez de
manipular el archivo completo. Hoy el gráfico permite Zoom (RF-06, solo visual), Marcar (RF-03/04/05)
y Regla (RF-08), pero ninguna herramienta modifica realmente los datos de la señal: `useSignalStore`
solo carga y resetea, no acota. No hay forma de generar una señal acotada a partir de una selección
del usuario.

## Goals

Agregar una herramienta "Recorte" a la toolbar, mutuamente excluyente con Zoom, Marcar y Regla, que
permita seleccionar un rango del eje temporal arrastrando el mouse, y que — previa confirmación
explícita del usuario mediante un cartel — reemplace la señal cargada por una nueva señal acotada a
ese rango. Cancelar la confirmación, o no confirmar, deja la señal intacta.

## Functional Requirements

- FR-01: El sistema debe ofrecer en la barra de herramientas un control que activa y desactiva la
  herramienta "Recorte", mutuamente excluyente con las demás herramientas de interacción sobre el
  gráfico (Zoom, Marcar, Regla).
- FR-02: El sistema debe, mientras la herramienta "Recorte" está activa, permitir seleccionar con el
  mouse (arrastre horizontal) un rango del eje temporal, resaltando sobre el gráfico la región que se
  conservaría, sin alterar la señal todavía.
- FR-03: El sistema debe, al soltar el mouse tras arrastrar con "Recorte" activo sobre un rango con
  desplazamiento mínimo perceptible, mostrar un cartel de confirmación con el rango de tiempo
  seleccionado (inicio y fin en segundos).
- FR-04: El sistema debe, si el usuario confirma el cartel, generar una nueva señal acotada al rango
  seleccionado (solo las muestras dentro de `[inicio, fin]`) y reemplazar la señal cargada por esa
  nueva señal.
- FR-05: El sistema debe, si el usuario cancela el cartel (o lo cierra sin confirmar), descartar la
  selección y dejar la señal original intacta, sin aplicar ningún recorte.
- FR-06: El sistema debe, tras confirmar un recorte, restablecer la ventana visible del gráfico
  (zoom) para mostrar la señal acotada completa.
- FR-07: El sistema debe cambiar la forma del cursor del mouse mientras la herramienta "Recorte"
  está activa, para indicar visualmente que está en uso (mismo criterio que el cursor de lupa de
  Zoom, AC-08 del PRD maestro; requisito ya existente en el PRD maestro como AC-12 y no trasladado a
  este PRD en su versión original — corregido en PRD loop 2, ver FIX-001).

## Non-Functional Requirements

- NFR-01: El sistema debe reusar el mismo mecanismo de overlay ya establecido por Zoom/Regla
  (FEAT-002/FEAT-004) para resaltar la selección durante el arrastre, sin provocar un redibujado
  completo del lienzo base, manteniendo el umbral de ≥10 fps (frame < 100 ms) definido en RNF-02 del
  PRD maestro.
- NFR-02: El cartel de confirmación debe ser un elemento de UI bloqueante (modal) que impida
  interactuar con el gráfico hasta que el usuario confirme o cancele, evitando recortes accidentales.

## Acceptance Criteria
*(EARS — ver `.daw/rules/validation-rules.instructions.md` §1 para los cinco patrones)*

- AC-01 (FR-01): WHEN el usuario alterna el control "Recorte", THE sistema SHALL marcar la
  herramienta como activa o inactiva según corresponda, desactivando Zoom, Marcar o Regla si alguna
  estaba activa.
- AC-02 (FR-02): WHILE la herramienta "Recorte" está activa y el usuario arrastra el mouse sobre el
  gráfico, THE sistema SHALL resaltar visualmente el rango de tiempo seleccionado sin modificar la
  señal.
- AC-03 (FR-03): WHEN el usuario suelta el mouse tras arrastrar con "Recorte" activo y desplazamiento
  mínimo perceptible, THE sistema SHALL mostrar un cartel de confirmación con el rango seleccionado.
- AC-04 (FR-03): IF el arrastre con "Recorte" activo no tiene desplazamiento mínimo perceptible
  (equivalente a un clic sin arrastre), THEN THE sistema SHALL no mostrar el cartel de confirmación
  ni alterar la señal.
- AC-05 (FR-04): WHEN el usuario confirma el cartel de recorte, THE sistema SHALL reemplazar la
  señal cargada por una nueva señal acotada al rango seleccionado.
- AC-06 (FR-05): IF el usuario cancela el cartel de recorte, THEN THE sistema SHALL descartar la
  selección y mantener la señal original sin cambios.
- AC-07 (FR-06): WHEN se confirma un recorte, THE sistema SHALL mostrar la ventana visible del
  gráfico ajustada a la extensión completa de la nueva señal acotada.
- AC-08 (FR-07): WHEN la herramienta "Recorte" está activa, THE sistema SHALL mostrar un cursor
  distintivo (no el cursor por defecto) mientras el mouse está sobre el gráfico.

## Out of Scope

- Deshacer un recorte ya confirmado / volver a la señal original cargada (decisión de alcance: el
  recorte queda fijo tras confirmar, similar al AC-13 del PRD maestro que solo exige que cancelar
  antes de confirmar preserve la señal intacta; un mecanismo de "señal original vs. señal de
  trabajo" que cubra revertir recortes queda fuera de este ticket).
- RF-11 (revertir filtro aplicado a la señal original) — no relacionado con esta herramienta.
- Recortes múltiples o encadenados en una sola operación.
- Exportar o persistir el recorte (RF-12/RF-15, fuera de este ticket).
- Herramientas Zoom (RF-06), Marcar (RF-03/04/05) y Regla (RF-08), ya entregadas.

## Risks and Mitigations

- Riesgo: agregar una cuarta herramienta mutuamente excluyente (`activeTool`) podría introducir
  condiciones no contempladas en los guards de `onMouseDown`/`onMouseMove`/`onMouseUp` de
  `ECGChart.tsx`, ya delicados tras FEAT-003a/FEAT-004 → mitigación: seguir el mismo patrón exacto ya
  usado para diferenciar `'zoom'`, `'mark'` y `'ruler'` en esos handlers.
- Riesgo: reemplazar `signal` en `useSignalStore` con la señal acotada podría dejar inconsistente el
  resto del estado dependiente (ventana visible del `viewStore`, marcadores fuera de rango en
  `markersStore`) → mitigación: FR-06/AC-07 exige restablecer la ventana visible tras confirmar; PLAN
  debe decidir explícitamente si los marcadores fuera del nuevo rango se eliminan o se conservan
  ocultos.
- Riesgo: un recorte accidental (clic sin intención de confirmar) sería destructivo e irreversible en
  este ticket (ver Out of Scope) → mitigación: NFR-02 exige un cartel de confirmación bloqueante
  antes de aplicar cualquier cambio a la señal.

## Dependencies

- **FEAT-002** (en `main`): `ECGChart` (Canvas base + overlay), `ChartToolbar` (patrón de toggle de
  herramienta mutuamente excluyente), `viewStore` (`activeTool`), `useSignalStore` (señal cargada).
- **FEAT-003a/b** (en `main`): `markersStore` (marcadores existentes que podrían quedar fuera del
  rango recortado; PLAN debe decidir su tratamiento, ver Risks).
- **FEAT-004** (en `main`): precedente directo de cómo se agregó una tercera herramienta (`'ruler'`)
  a `activeTool` sin romper los guards existentes — mismo patrón a replicar para `'crop'`.
- Stack Front declarado en `AGENTS.md` → React 19.2 + Vite 6 + TS 5.7; Vitest + RTL.
