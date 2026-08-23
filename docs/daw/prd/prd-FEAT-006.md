# PRD FEAT-006: Métricas cardíacas HRV — BPM, SDNN, RMSSD, pNN50 sobre ventana visible (RF-14)

| Field | Value |
|-------|-------|
| Ticket | FEAT-006 |
| Tracker | none |
| Date | 2026-08-23 |
| PRD loops | 0 |

## Context and Problem

ECGViewer permite hoy cargar una señal (FEAT-001), visualizarla (FEAT-002), marcar eventos
(FEAT-003a/b), hacer zoom (RF-06) y medir Δt/Δamplitud con la Regla (FEAT-004). Sin embargo, no
calcula ninguna métrica cardíaca: el técnico, médico o estudiante que quiere conocer la frecuencia
cardíaca (BPM) o la variabilidad de la frecuencia cardíaca (HRV: SDNN, RMSSD, pNN50) de un tramo de
la señal debe hacerlo a mano. El PRD maestro (RF-14, RNF-03, AC-18, AC-19, AC-23) exige que estas
métricas se calculen y muestren **solo sobre la ventana de tiempo visible** en el gráfico, no sobre
todo el archivo, y que se recalculen al cambiar esa ventana (zoom in/out, restablecer zoom).

## Goals

Agregar un panel de métricas cardíacas que, a partir de la detección de picos R sobre los datos
visibles en el gráfico, calcule y muestre BPM, SDNN, RMSSD y pNN50, actualizándose automáticamente
cada vez que cambia la ventana visible (zoom o restablecer zoom), sin modificar la señal ni afectar
el rendimiento del gráfico.

## Functional Requirements

- FR-01: El sistema debe detectar los picos R (latidos) presentes en los datos de la ventana de
  tiempo visible del gráfico, sin modificar la señal cargada.
- FR-02: El sistema debe calcular, a partir de los picos R detectados en la ventana visible, el BPM
  (frecuencia cardíaca en latidos por minuto), el SDNN (desviación estándar de los intervalos NN en
  ms), el RMSSD (raíz cuadrada de la media de las diferencias sucesivas al cuadrado entre intervalos
  RR, en ms) y el pNN50 (porcentaje de pares RR consecutivos cuya diferencia supera 50 ms).
- FR-03: El sistema debe mostrar en un panel de métricas los valores de BPM, SDNN, RMSSD y pNN50
  calculados para la ventana visible actual.
- FR-04: El sistema debe recalcular y actualizar el panel de métricas cada vez que cambia la ventana
  de tiempo visible (zoom con la herramienta Zoom, o "Restablecer zoom").
- FR-05: El sistema debe indicar en el panel, sin interrumpir el resto de la aplicación, cuando la
  ventana visible no tiene suficientes picos R detectados para calcular una o más métricas (por
  ejemplo, se necesitan al menos 2 picos R para BPM/RMSSD/pNN50 y al menos 2 intervalos NN para
  SDNN).

## Non-Functional Requirements

- NFR-01: El sistema debe calcular BPM, SDNN, RMSSD y pNN50 en menos de 0.1 s en el percentil 95
  sobre 20 mediciones, tomando como referencia un archivo de 1 minuto de señal (RNF-03 del PRD
  maestro).
- NFR-02: El cálculo y actualización de métricas no debe disparar un redibujado completo del lienzo
  del gráfico (RNF-02 del PRD maestro): el panel de métricas es un componente separado que reacciona
  a `visibleWindow`, no una responsabilidad del canvas.

## Acceptance Criteria
*(EARS — ver `.daw/rules/validation-rules.instructions.md` §1 para los cinco patrones)*

- AC-01 (FR-01/FR-02): WHEN el gráfico tiene una señal cargada y una ventana de tiempo visible, THE
  sistema SHALL calcular BPM, SDNN, RMSSD y pNN50 únicamente a partir de los datos visibles en esa
  ventana, no de todo el archivo.
- AC-02 (FR-03): WHEN se calculan las métricas de la ventana visible, THE sistema SHALL mostrarlas en
  un panel de métricas visible junto al gráfico.
- AC-03 (FR-04): WHEN el usuario cambia la ventana visible (acerca con Zoom o usa "Restablecer
  zoom"), THE sistema SHALL recalcular y actualizar los valores mostrados en el panel de métricas
  para reflejar el nuevo rango.
- AC-04 (FR-05): IF la ventana visible no tiene suficientes picos R para calcular una métrica, THEN
  THE sistema SHALL mostrar esa métrica como no disponible en el panel, sin generar un error ni
  interrumpir el resto de la aplicación.
- AC-05 (FR-05): IF no hay ninguna señal cargada, THEN THE sistema SHALL no mostrar valores de
  métricas (panel vacío o ausente), sin calcular ni mostrar datos inválidos.

## Out of Scope

- Detección de arritmias o clasificación morfológica de latidos: solo se detectan picos R para
  calcular BPM/HRV, no se diagnostica.
- Ajuste fino o configuración manual del algoritmo de detección de picos R (umbrales, ventanas de
  búsqueda) por parte del usuario.
- Filtrado digital de la señal antes del cálculo (RF-10/RF-11): esa herramienta no existe todavía en
  la app: ver Riesgos.
- Persistencia de las métricas calculadas (no forman parte de "Guardar", RF-15): se recalculan en
  vivo a partir de la ventana visible y no se guardan en el estudio.
- Cálculo de métricas sobre múltiples canales: la app soporta un solo canal (según AGENTS.md).

## Risks and Mitigations

- Riesgo: sin filtrado digital disponible todavía (RF-10/RF-11 no implementados), la detección de
  picos R sobre una señal ruidosa puede ser poco fiable y arrojar BPM/HRV erróneos (riesgo señalado
  en el PRD maestro). Mitigación aceptada: usar un algoritmo de detección de picos R robusto a ruido
  moderado (basado en umbral adaptativo sobre la derivada/energía de la señal, sin llegar a Pan-
  Tompkins completo) y documentar la limitación en el panel cuando la métrica no sea calculable
  (AC-04). **Riesgo aceptado por**: usuario del producto (owner de este PRD), **justificación**: RF-10
  todavía no existe y bloquear RF-14 hasta entonces retrasa una funcionalidad ya solicitada,
  **condición de revisión**: revisar la precisión de la detección de picos R cuando se implemente
  RF-10 (filtros DSP), ya que en ese momento la señal filtrada estará disponible como entrada.
- Riesgo: recalcular métricas en cada cambio de ventana visible (arrastre continuo durante zoom)
  podría degradar el frame rate del gráfico → mitigación: el cálculo se dispara al soltar el mouse
  (cuando `visibleWindow` cambia de forma definitiva), no en cada frame del arrastre, igual que ya
  hace el propio Zoom (FEAT-002) al aplicar el rango.

## Dependencies

- FEAT-002 (gráfico ECG, `viewStore` con `visibleWindow`/`fullWindow`): fuente de la ventana visible
  sobre la que se calculan las métricas.
- FEAT-001 (`signalStore`, `ECGSignal`): fuente de los datos de la señal cargada.
- RF-06 (Zoom, ya implementado en `lib/ecg/chart/zoom.ts` y `viewStore`): dispara el recálculo al
  cambiar la ventana visible.
