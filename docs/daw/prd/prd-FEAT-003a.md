# PRD FEAT-003a: Crear y listar marcadores de evento (RF-03)

| Field | Value |
|-------|-------|
| Ticket | FEAT-003a |
| Tracker | none |
| Date | 2026-08-14 |
| PRD loops | 0 |

> Sub-ticket de la división de FEAT-003 (ver `docs/daw/prd/prd-FEAT-003.md`, índice). Deriva de
> `docs/daw/prd/PRD.md` (RF-03, AC-05). Front-end, sobre el gráfico de FEAT-002 (`ECGChart` +
> `ChartToolbar` + `viewStore`) y la señal de FEAT-001. Es la **base** de FEAT-003b (editar/eliminar
> no tiene sentido sin poder crear ni ver marcadores).

## Contexto y Problema

Los usuarios de ECGViewer necesitan anotar sobre la señal ECG puntos de interés (artefactos de
ruido, arritmias, anomalías) para su análisis posterior. Hoy el gráfico (FEAT-002) permite
visualizar y navegar la señal, pero no anotarla. Este ticket entrega la capacidad de **crear** un
marcador anclado a un instante de tiempo y **verlos listados**, sentando la base (lista, formulario,
tipos de datos) sobre la que FEAT-003b construirá editar/eliminar.

## Objetivos

Permitir crear un marcador de evento anclado a un instante de tiempo mediante un clic sobre el
gráfico con la herramienta "Marcar" activa, a través de un formulario de confirmación, y listar los
marcadores existentes en un panel colapsable debajo del gráfico, en orden cronológico.

## Requerimientos Funcionales

- FR-01: El sistema debe ofrecer en la barra de herramientas un control que activa y desactiva la herramienta "Marcar".
- FR-02: El sistema debe, mientras la herramienta "Marcar" está activa, abrir al hacer clic simple (sin arrastre) sobre el gráfico un formulario para crear un marcador, con el instante de tiempo del clic fijado y no editable.
- FR-03: El sistema debe, al confirmar el formulario de creación, crear el marcador anclado al instante de tiempo fijado con la etiqueta/comentario ingresados, y mostrarlo en el gráfico y en la lista de marcadores.
- FR-04: El sistema debe, al cancelar el formulario de creación, no crear ningún marcador.
- FR-05: El sistema debe mostrar un panel colapsable debajo del gráfico con la lista de marcadores existentes, ordenados cronológicamente por su instante de tiempo, mostrando para cada uno el tiempo formateado y la etiqueta/comentario (o una indicación de que no tiene etiqueta).

## Requerimientos No Funcionales

- NFR-01: El sistema debe mantener los marcadores visibles y persistentes en memoria durante toda la sesión de trabajo, sin persistirlos en almacenamiento hasta la acción explícita "Guardar" (RF-15, fuera de alcance).
- NFR-02: El sistema debe renderizar los marcadores existentes en el gráfico sin provocar un redibujado completo del lienzo base fuera de los cambios de señal/ventana/rejilla ya establecidos por FEAT-002, manteniendo el umbral de ≥10 fps (frame < 100 ms) definido en RNF-02 del PRD maestro.

## Criterios de Aceptación
*(EARS — ver `.daw/rules/validation-rules.instructions.md` §1 para los cinco patrones)*

- AC-01 (FR-01): WHEN el usuario alterna el control "Marcar", THE sistema SHALL marcar la herramienta como activa o inactiva según corresponda.
- AC-02 (FR-02): WHILE la herramienta "Marcar" está activa, WHEN el usuario hace clic simple sobre el gráfico, THE sistema SHALL abrir el formulario de creación con el instante de tiempo del clic fijado y no editable.
- AC-03 (FR-03): WHEN el usuario confirma el formulario de creación con una etiqueta, THE sistema SHALL crear el marcador anclado a ese instante y mostrarlo en el gráfico y en la lista.
- AC-04 (FR-04): IF el usuario cancela el formulario de creación, THEN THE sistema SHALL no crear ningún marcador.
- AC-05 (FR-05): WHEN existen marcadores, THE sistema SHALL listarlos en el panel colapsable en orden cronológico, mostrando tiempo formateado y etiqueta (o su ausencia).

## Fuera de Alcance

- Editar la etiqueta/comentario de un marcador existente (RF-04) — ticket FEAT-003b.
- Eliminar un marcador existente (RF-05) — ticket FEAT-003b.
- Persistencia de marcadores más allá de la sesión (RF-15, "Guardar").
- Herramientas Regla (RF-08) y Recorte (RF-09).
- Edición del instante de tiempo de un marcador (no aplica: no hay edición en este ticket).
- Categorización o tipos de marcador: un marcador es genérico, con etiqueta libre.
- Selección múltiple o eliminación masiva.

## Riesgos y Mitigaciones

- Riesgo: dibujar N marcadores sobre el lienzo base en cada render podría degradar el rendimiento (NFR-02) si N crece mucho → mitigación: los marcadores se dibujan como parte del mismo pase de render del lienzo base (junto a señal/ejes/rejilla), sin redibujados adicionales por marcador; medir contra un número razonable de marcadores (definir en spec).
- Riesgo: el clic para crear un marcador podría confundirse con el arrastre de Zoom si ambas herramientas compartieran el mismo gesto → mitigación: "Marcar" y "Zoom" son herramientas mutuamente excluyentes en la toolbar (como ya lo es `activeTool` en `viewStore`); un clic simple con "Marcar" activo crea, un arrastre con "Zoom" activo acerca la vista.
- Riesgo: el diseño del store/tipos de marcador de este ticket debe anticipar las operaciones de FEAT-003b (editar etiqueta, eliminar) para no requerir un rediseño → mitigación: modelar el store de marcadores con identificador estable por marcador desde el inicio (aunque este ticket no exponga UI de edición/eliminación).

## Dependencias

- **FEAT-001** (en `main`): señal cargada en `signalStore`.
- **FEAT-002** (en `main`): `ECGChart` (Canvas base), `ChartToolbar` (patrón de toggle de herramienta), `viewStore` (`activeTool`, ventana visible).
- Stack Front declarado en `AGENTS.md` → "Stack": React 19.2 + Vite 6 + TS 5.7; Vitest + RTL.
- Dependencia downstream (no bloqueante): **FEAT-003b** (editar/eliminar) construye sobre la lista, el formulario y el store de marcadores que este ticket introduce.
