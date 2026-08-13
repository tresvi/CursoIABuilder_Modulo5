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
