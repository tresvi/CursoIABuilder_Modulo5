# PRD FEAT-004: Herramienta Regla — medir Δt/Δamplitud (RF-08)

| Field | Value |
|-------|-------|
| Ticket | FEAT-004 |
| Tracker | none |
| Date | 2026-08-23 |
| PRD loops | 1 |

## Context and Problem

Los usuarios de ECGViewer necesitan medir intervalos de tiempo y diferencias de amplitud entre dos
puntos de la señal (por ejemplo, la duración de un complejo QRS o la amplitud de una onda) sin
alterar la señal ni depender de cálculos externos. Hoy el gráfico (FEAT-002) permite Zoom y, sobre
FEAT-003a/b, marcar/editar/eliminar eventos, pero no hay ninguna forma de medir directamente sobre el
gráfico.

## Goals

Agregar una herramienta "Regla" a la toolbar, mutuamente excluyente con Zoom y Marcar, que permita
arrastrar sobre el gráfico para medir la diferencia de tiempo (Δt) y de amplitud (Δamplitud) entre el
punto donde se presiona el mouse y el punto donde se suelta, sin modificar la señal.

## Functional Requirements

- FR-01: El sistema debe ofrecer en la barra de herramientas un control que activa y desactiva la
  herramienta "Regla", mutuamente excluyente con las demás herramientas de interacción sobre el
  gráfico (Zoom, Marcar).
- FR-02: El sistema debe, mientras la herramienta "Regla" está activa, mostrar en vivo sobre el
  gráfico (línea + tooltip) la diferencia de tiempo (Δt) y de amplitud (Δamplitud) entre el punto
  inicial y la posición actual del cursor, mientras el usuario arrastra el mouse.
- FR-03: El sistema debe, al soltar el mouse tras arrastrar con "Regla" activa, dejar visible sobre
  el gráfico el resultado de la última medición (línea + tooltip con Δt/Δamplitud), sin modificar la
  señal.
- FR-04: El sistema debe reemplazar la medición visible por la nueva cada vez que el usuario mide de
  nuevo (arrastra otra vez) con "Regla" activa.
- FR-05: El sistema debe ocultar la medición visible al desactivar la herramienta "Regla" o al
  cambiar a otra herramienta (Zoom, Marcar).
- FR-06: El sistema debe cambiar la forma del cursor del mouse mientras la herramienta "Regla" está
  activa, para indicar visualmente que está en uso (mismo criterio que el cursor de lupa de Zoom,
  AC-08 del PRD maestro; requisito ya existente en el PRD maestro como AC-11 y no trasladado a este
  PRD en su versión original — corregido en PRD loop 1, ver FIX-001).

## Non-Functional Requirements

- NFR-01: El sistema debe actualizar la medición en vivo durante el arrastre sin provocar un
  redibujado completo del lienzo base, usando el mismo mecanismo de overlay ya establecido por Zoom
  (FEAT-002) para el rectángulo de selección, manteniendo el umbral de ≥10 fps (frame < 100 ms)
  definido en RNF-02 del PRD maestro.

## Acceptance Criteria
*(EARS — ver `.daw/rules/validation-rules.instructions.md` §1 para los cinco patrones)*

- AC-01 (FR-01): WHEN el usuario alterna el control "Regla", THE sistema SHALL marcar la herramienta
  como activa o inactiva según corresponda, desactivando Zoom o Marcar si alguna estaba activa.
- AC-02 (FR-02): WHILE la herramienta "Regla" está activa y el usuario arrastra el mouse sobre el
  gráfico, THE sistema SHALL mostrar en vivo el Δt y el Δamplitud entre el punto inicial y la
  posición actual del cursor.
- AC-03 (FR-03): WHEN el usuario suelta el mouse tras arrastrar con "Regla" activa, THE sistema
  SHALL dejar visible el resultado de esa medición sobre el gráfico.
- AC-04 (FR-04): WHEN el usuario mide de nuevo con "Regla" activa, THE sistema SHALL reemplazar la
  medición anterior por la nueva.
- AC-05 (FR-05): IF el usuario desactiva "Regla" o activa otra herramienta, THEN THE sistema SHALL
  ocultar la medición visible.
- AC-06 (FR-03): IF el arrastre con "Regla" activa no tiene desplazamiento mínimo perceptible
  (equivalente a un clic sin arrastre), THEN THE sistema SHALL no dejar ninguna medición visible.
- AC-07 (FR-06): WHEN la herramienta "Regla" está activa, THE sistema SHALL mostrar un cursor
  distintivo (no el cursor por defecto) mientras el mouse está sobre el gráfico.

## Out of Scope

- Persistencia de mediciones más allá de la sesión o de la próxima medición (no hay "Guardar" para
  mediciones de Regla; a diferencia de los marcadores, RF-15 no aplica a esta herramienta).
- Múltiples mediciones simultáneas visibles a la vez (solo la última).
- Mostrar la medición en un panel fijo o exportarla.
- Herramientas Marcar (RF-03/04/05, ya entregada) y Recorte (RF-09, fuera de este ticket).
- Cálculo de BPM u otras métricas derivadas de la medición (RF-14, fuera de este ticket).

## Risks and Mitigations

- Riesgo: agregar una tercera herramienta mutuamente excluyente (`activeTool`) podría introducir
  condiciones no contempladas en los guards de `onMouseDown`/`onMouseMove`/`onMouseUp` de
  `ECGChart.tsx`, ya delicados tras FEAT-003a → mitigación: seguir el mismo patrón exacto ya usado
  para diferenciar `'zoom'` de `'mark'` en esos handlers, revisado con especial cuidado en PLAN/CODE.
- Riesgo: el tooltip en vivo durante el arrastre podría requerir un redibujado que degrade el
  rendimiento si no reusa el mecanismo de overlay ya existente → mitigación: NFR-01 exige reusar el
  overlay de Zoom, no crear un mecanismo de render nuevo.

## Dependencies

- **FEAT-002** (en `main`): `ECGChart` (Canvas base + overlay), `ChartToolbar` (patrón de toggle de
  herramienta mutuamente excluyente), `viewStore` (`activeTool`).
- **FEAT-003a** (en `main`): precedente directo de cómo se agregó una tercera herramienta (`'mark'`)
  a `activeTool` sin romper el guard de `onMouseMove` de Zoom — mismo patrón a replicar para
  `'ruler'`.
- Stack Front declarado en `AGENTS.md` → React 19.2 + Vite 6 + TS 5.7; Vitest + RTL.
