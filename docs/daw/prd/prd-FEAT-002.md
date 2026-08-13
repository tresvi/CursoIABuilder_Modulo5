# PRD FEAT-002: Gráfico ECG — visualización, zoom y rejilla (RF-02/06/07)

| Field | Value |
|-------|-------|
| Ticket | FEAT-002 |
| Tracker | none |
| Date | 2026-08-08 |
| PRD loops | 0 |

> PRD de ticket derivado del PRD maestro `docs/daw/prd/PRD.md` (RF-02, RF-06, RF-07; AC-04, AC-08,
> AC-09, AC-10; RNF-01, RNF-02). Alcance **exclusivamente Front-end**. Agrupa la visualización base
> de la señal y las dos capas de vista más ligadas a ella (zoom y rejilla). **Regla dura del
> proyecto:** el gráfico es **Canvas 2D propio, sin librería de charting** (AGENTS.md, Principio V).
> Consume la señal cargada por FEAT-001 (store Zustand `signalStore`, tipo `ECGSignal`), ya en `main`.

## Contexto y Problema

FEAT-001 dejó la señal ECG cargada en memoria, pero **no hay forma de verla**. Sin visualización, el
resto del producto (marcar eventos, medir, filtrar, calcular métricas) no tiene sobre qué operar: el
gráfico es la superficie central de la aplicación. Este ticket entrega esa superficie base —dibujar
la señal con ejes legibles— y las dos capacidades de vista que la acompañan naturalmente: **acercar**
un tramo temporal para inspeccionarlo (zoom) y **mostrar/ocultar** la rejilla de referencia ECG.

Las herramientas que se operan con el mouse sobre el gráfico usan un **cursor propio por
herramienta**; en este ticket, la única es el Zoom (cursor de lupa). Marcadores, regla y recorte
llegan en tickets posteriores y compartirán la barra de herramientas que aquí se inicia.

## Objetivos

Renderizar la señal ECG cargada en un **Canvas 2D propio** con eje X en segundos y eje Y en mV,
respetando el orden temporal y autoescalando los ejes al rango de la señal. Permitir **acercar** un
rango de tiempo arrastrando con la herramienta Zoom activa y **restablecer** la vista completa, y
**mostrar u ocultar** una rejilla ECG. Todo con el rendimiento exigido (render < 0.1 s p95;
actualización fluida sin redibujado completo del lienzo).

## Requerimientos Funcionales

- FR-01: El sistema debe dibujar la señal cargada en un Canvas 2D con el tiempo en el eje X (en segundos) y la amplitud en el eje Y (en mV), respetando el orden temporal del archivo y autoescalando los ejes al rango de la señal.
- FR-02: El sistema debe mostrar un estado vacío (sin curva) cuando no hay ninguna señal cargada en el estado.
- FR-03: El sistema debe ofrecer una barra de herramientas con un control que activa y desactiva la herramienta Zoom.
- FR-04: El sistema debe, mientras la herramienta Zoom está activa y el usuario arrastra horizontalmente sobre el gráfico, mostrar el cursor de lupa y resaltar una selección que abarca todo el eje Y sobre el rango de tiempo arrastrado, y al soltar acercar la vista a ese rango de tiempo.
- FR-05: El sistema debe ofrecer un control "Restablecer zoom" que devuelve la vista a la señal completa.
- FR-06: El sistema debe permitir mostrar u ocultar una rejilla ECG sobre el gráfico mediante un control.

## Requerimientos No Funcionales

- NFR-01: El sistema debe renderizar el gráfico de un archivo de referencia de 1 minuto de señal (aproximadamente 30.000 muestras) en menos de 0.1 s en el percentil 95 sobre 20 mediciones.
- NFR-02: El sistema debe, al actualizar la vista por zoom o por alternar la rejilla, mantener al menos 10 fps (frame < 100 ms), sin ejecutar un redibujado completo del lienzo de la señal en cada interacción de mouse. La estrategia (lienzo base para señal/ejes + lienzo superpuesto para la interacción) se define en la spec.

## Criterios de Aceptación
*(EARS — ver `.daw/rules/validation-rules.instructions.md` §1 para los cinco patrones)*

- AC-01 (FR-01): WHEN hay una señal cargada en el estado, THE sistema SHALL dibujarla en el Canvas con el eje X en segundos y el eje Y en mV, respetando el orden temporal y autoescalando los ejes al rango de la señal.
- AC-02 (FR-02): IF no hay ninguna señal cargada, THEN THE sistema SHALL mostrar un estado vacío en lugar de la curva.
- AC-03 (FR-03): WHEN el usuario alterna el control "Zoom", THE sistema SHALL marcar la herramienta Zoom como activa o inactiva según corresponda.
- AC-04 (FR-04): WHILE la herramienta Zoom está activa, WHEN el usuario arrastra horizontalmente sobre el gráfico, THE sistema SHALL mostrar el cursor de lupa, resaltar la selección abarcando todo el eje Y sobre el rango de tiempo arrastrado y, al soltar, acercar la vista a ese rango de tiempo.
- AC-05 (FR-04): IF el arrastre de zoom define un rango de tiempo nulo o despreciable (por ejemplo, un clic sin desplazamiento horizontal), THEN THE sistema SHALL no modificar la vista.
- AC-06 (FR-05): WHEN el usuario acciona "Restablecer zoom", THE sistema SHALL volver la vista a mostrar la señal completa.
- AC-07 (FR-06): WHEN el usuario alterna la rejilla ECG, THE sistema SHALL mostrarla u ocultarla sobre el gráfico.

## Fuera de Alcance

- Marcadores de evento (RF-03/04/05), herramienta Regla (RF-08) y herramienta Recorte (RF-09).
- Filtros digitales (RF-10/11), import/export Excel (RF-12/13), métricas cardíacas (RF-14) y persistencia (RF-15).
- Desplazamiento (pan) del gráfico y zoom con la rueda del mouse: en este ticket el zoom es solo arrastrar-para-acercar + restablecer.
- Zoom sobre el eje Y: la selección abarca todo el eje Y y solo acota el rango temporal (X); el eje Y permanece autoescalado.
- Exportar el gráfico como imagen.
- Soporte multicanal.

## Riesgos y Mitigaciones

- Riesgo: el render de ~30.000 puntos no cumple los umbrales (RNF-01/02) o parpadea → mitigación: dibujar sobre un lienzo base (señal/ejes/rejilla) y un lienzo superpuesto para la interacción del mouse; considerar decimación de puntos por píxel; medir contra el archivo de referencia de 1 minuto.
- Riesgo: el render sobre Canvas es difícil de verificar en jsdom → mitigación: extraer la lógica pura a funciones testeables (mapeo tiempo→X y amplitud→Y, cálculo de ticks de ejes, cálculo del rango de zoom a partir del arrastre) y mockear el contexto 2D en los tests de componente.
- Riesgo: el estado de "ventana visible" `[fromTime, toTime]` que fija el zoom será consumido luego por las métricas (RF-14) → mitigación: modelarlo explícitamente en el estado desde ya, para no rehacerlo después.

## Dependencias

- **FEAT-001** (ya en `main`): la señal se lee del store Zustand `signalStore` (`ECGSignal`, `src/frontend/src/state/`) y los tipos de `src/frontend/src/lib/ecg/`.
- Stack Front declarado en `AGENTS.md` → "Stack": React 19.2 + Vite 6 + TS 5.7; Canvas 2D nativo (sin librería de charting, Principio V); Vitest + RTL para pruebas.
- Ubicación por convención (AGENTS.md): el gráfico vive en `src/frontend/src/components/ECGChart.tsx` + `render/`.
- Dependencia downstream (no bloqueante): la "ventana visible" que fija el zoom será consumida por RF-14 (métricas) y las herramientas RF-08/RF-09 en tickets posteriores.
