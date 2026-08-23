# PRD FEAT-003b: Editar y eliminar marcadores de evento (RF-04/05)

| Field | Value |
|-------|-------|
| Ticket | FEAT-003b |
| Tracker | none |
| Date | 2026-08-14 |
| PRD loops | 0 |

> Sub-ticket de la división de FEAT-003 (ver `docs/daw/prd/prd-FEAT-003.md`, índice). Deriva de
> `docs/daw/prd/PRD.md` (RF-04, RF-05; AC-06, AC-07). Front-end. **Depende de FEAT-003a**: reutiliza
> la lista de marcadores, el formulario compartido crear/editar y el store de marcadores que
> FEAT-003a introduce.

## Contexto y Problema

FEAT-003a entregó la capacidad de crear marcadores y verlos en una lista, pero una vez creados no
hay forma de corregir una etiqueta mal escrita ni de eliminar un marcador que ya no aplica. Sin
edición ni eliminación, cualquier error de tipeo o marcador de prueba queda pegado a la señal durante
toda la sesión.

## Objetivos

Permitir, desde la lista de marcadores ya existente (FEAT-003a), **editar** la etiqueta/comentario de
un marcador reutilizando el mismo formulario de creación (ahora prellenado), y **eliminar** un
marcador existente, pidiendo confirmación antes de borrarlo.

## Requerimientos Funcionales

- FR-01: El sistema debe, al seleccionar la acción de editar un marcador desde la lista, abrir el mismo formulario usado para crear, prellenado con su etiqueta/comentario actual.
- FR-02: El sistema debe, al confirmar el formulario de edición, actualizar la etiqueta/comentario del marcador seleccionado, reflejando el cambio en el gráfico y en la lista.
- FR-03: El sistema debe, si el usuario cancela el formulario de edición, dejar la etiqueta/comentario del marcador sin cambios.
- FR-04: El sistema debe, al seleccionar la acción de eliminar un marcador desde la lista, pedir confirmación antes de eliminarlo.
- FR-05: El sistema debe, si el usuario confirma la eliminación, quitar el marcador del gráfico y de la lista; si cancela, dejarlo intacto.

## Requerimientos No Funcionales

- NFR-01: El sistema debe reflejar la edición o eliminación de un marcador en el gráfico sin provocar un redibujado completo del lienzo base fuera de los casos ya establecidos por FEAT-002/003a, manteniendo el umbral de ≥10 fps (frame < 100 ms) de RNF-02 del PRD maestro.

## Criterios de Aceptación
*(EARS — ver `.daw/rules/validation-rules.instructions.md` §1 para los cinco patrones)*

- AC-01 (FR-01): WHEN el usuario elige editar un marcador desde la lista, THE sistema SHALL abrir el formulario compartido prellenado con su etiqueta/comentario actual.
- AC-02 (FR-02): WHEN el usuario confirma el formulario de edición con una nueva etiqueta, THE sistema SHALL actualizar esa etiqueta en el gráfico y en la lista.
- AC-03 (FR-03): IF el usuario cancela el formulario de edición, THEN THE sistema SHALL dejar la etiqueta del marcador sin cambios.
- AC-04 (FR-04): WHEN el usuario elige eliminar un marcador desde la lista, THE sistema SHALL pedir confirmación antes de eliminarlo.
- AC-05 (FR-05): WHEN el usuario confirma la eliminación, THE sistema SHALL quitar el marcador del gráfico y de la lista.
- AC-06 (FR-05): IF el usuario cancela la confirmación de eliminación, THEN THE sistema SHALL dejar el marcador intacto en el gráfico y en la lista.

## Fuera de Alcance

- Crear marcadores y la lista base (RF-03) — ya entregado por FEAT-003a.
- Persistencia de marcadores más allá de la sesión (RF-15, "Guardar").
- Herramientas Regla (RF-08) y Recorte (RF-09).
- Edición del instante de tiempo de un marcador (solo se edita la etiqueta/comentario).
- Selección múltiple, edición o eliminación masiva.

## Riesgos y Mitigaciones

- Riesgo: reutilizar el formulario de creación para edición podría filtrar estado entre aperturas (p. ej. quedar con el tiempo fijado de una creación anterior) → mitigación: el formulario recibe explícitamente su modo (`create` | `edit`) y los datos iniciales correspondientes en cada apertura; se resetea al cerrarse.
- Riesgo: eliminar un marcador mientras el usuario edita otro simultáneamente (aunque la UI no lo permita directamente) podría dejar el formulario apuntando a un marcador inexistente → mitigación: el formulario de edición se cierra automáticamente si el marcador que edita deja de existir en el store.

## Dependencias

- **FEAT-003a** (mismo ticket padre, debe estar mergeado o su rama disponible): lista de marcadores, formulario compartido, store de marcadores.
- **FEAT-001/002** (en `main`): señal, `ECGChart`, `ChartToolbar`, `viewStore`.
- Stack Front declarado en `AGENTS.md` → "Stack": React 19.2 + Vite 6 + TS 5.7; Vitest + RTL.
