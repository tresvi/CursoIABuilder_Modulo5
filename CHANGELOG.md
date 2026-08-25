# Changelog

Todos los cambios notables de este proyecto se documentan en este archivo.

El formato sigue [Keep a Changelog](https://keepachangelog.com/es-ES/1.1.0/)
y el proyecto adhiere a [Versionado Semántico](https://semver.org/lang/es/).

## [Unreleased]

### Added

- FEAT-001 (RF-01): carga de una señal ECG de un solo canal desde un archivo CSV en el front-end.
  Selección por `input file` o zona de arrastre; parseo y validación (`parseCsv`, PapaParse) de
  CSV de 2 columnas (tiempo/mV, separador coma, decimal punto); rechazo de formato inválido
  (menos de 2 columnas, valores no numéricos, sin datos, columnas inconsistentes) y de multicanal
  (≥3 columnas); guardia de tamaño ≤ 25 MB antes de leer; la señal ingresada queda en un store
  Zustand para su consumo posterior (RF-02). Incluye el bootstrap del proyecto front
  (Vite + React + TypeScript + Tailwind v4 + Vitest).
- FEAT-002 (RF-02/06/07): gráfico ECG en Canvas 2D propio, sin librería de charting. Dibuja la
  señal cargada con eje X en segundos y eje Y en mV, autoescalado y decimado por píxel para
  cumplir el umbral de rendimiento. Herramienta de Zoom (arrastrar para acercar un rango de
  tiempo, con cursor de lupa, y botón "Restablecer zoom") y control para mostrar u ocultar la
  rejilla ECG. Estado de vista en un store Zustand separado (`viewStore`).
- FEAT-003a (RF-03): marcadores de evento sobre el gráfico ECG — crear y listar. Herramienta
  "Marcar" en la toolbar (mutuamente excluyente con Zoom); un clic simple sobre el gráfico con la
  herramienta activa abre un formulario (diálogo shadcn/ui) para confirmar el marcador con una
  etiqueta libre, anclado al instante de tiempo del clic. Los marcadores se dibujan en el mismo
  pase de render del gráfico (sin redibujados adicionales) y se listan en un panel colapsable
  debajo del gráfico, ordenados cronológicamente. Viven solo en memoria de sesión (sin
  persistencia hasta "Guardar", RF-15, fuera de alcance). Base para editar/eliminar marcadores
  (FEAT-003b, RF-04/05).
- FEAT-003b (RF-04/05): edición y eliminación de marcadores de evento. Desde el panel de la lista,
  cada marcador ofrece "Editar" (reabre el mismo formulario de creación, prellenado con la etiqueta
  actual) y "Eliminar" (pide confirmación en un diálogo antes de borrar). El formulario se cierra
  solo si el marcador que se está editando es eliminado mientras tanto. Sin cambios en el instante
  de tiempo de un marcador (solo la etiqueta es editable).
- FEAT-004 (RF-08): herramienta Regla para medir sobre el gráfico ECG. Mutuamente excluyente con
  Zoom y Marcar; arrastrar con "Regla" activa muestra en vivo una línea y un tooltip con Δt/Δamplitud
  entre el punto inicial y la posición actual del cursor, y la medición queda visible hasta la
  próxima o hasta cambiar de herramienta. No modifica la señal.
- FEAT-005 (RF-09): herramienta Recorte para acotar la señal ECG. Mutuamente excluyente con Zoom,
  Marcar y Regla; arrastrar con "Recorte" activa resalta el rango seleccionado (mismo mecanismo de
  overlay que Zoom) y, al soltar, muestra un cartel de confirmación con el rango elegido. Al
  confirmar, la señal se reemplaza por una nueva señal acotada a ese rango y los marcadores fuera
  del nuevo rango se eliminan; al cancelar, la señal queda intacta. La ventana visible se ajusta
  automáticamente a la extensión de la señal recortada.
- FEAT-006 (RF-14): panel de métricas cardíacas HRV (BPM, SDNN, RMSSD, pNN50), calculadas a partir
  de una detección de picos R por umbral adaptativo sobre la ventana de tiempo visible del gráfico
  (nunca sobre todo el archivo), recalculadas automáticamente al hacer zoom o restablecer zoom. Cada
  métrica muestra "N/A" cuando no hay suficientes picos R detectados en la ventana. Cálculo
  enteramente client-side, sin persistencia ni dependencia del backend (RF-10, filtros DSP, aún no
  implementado).

### Fixed

- FIX-001: las herramientas Regla y Recorte no cambiaban la forma del cursor del mouse mientras
  estaban activas, pese a que el PRD maestro lo exige (igual que Zoom, que sí lo tenía). Ahora ambas
  muestran `cursor-crosshair` mientras están activas.
- FIX-002: la herramienta Regla dejaba acumuladas las líneas y los tooltips de mediciones anteriores
  durante un mismo arrastre (nunca limpiaba el overlay entre eventos de `mousemove`). Ahora limpia
  el overlay antes de cada redibujo y muestra la selección como un rectángulo (igual que Zoom y
  Recorte) en vez de una línea diagonal.
