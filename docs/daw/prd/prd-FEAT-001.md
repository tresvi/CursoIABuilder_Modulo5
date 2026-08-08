# PRD FEAT-001: Cargar señal ECG de un canal desde CSV (RF-01)

| Field | Value |
|-------|-------|
| Ticket | FEAT-001 |
| Tracker | none |
| Date | 2026-08-06 |
| PRD loops | 0 |

> PRD de ticket derivado del PRD maestro `docs/daw/prd/PRD.md` (RF-01, AC-01/02/03).
> Alcance acotado a **RF-01** y **exclusivamente Front-end**: la carga ocurre en el navegador
> (File API), sin intervención de back-end ni de la API. La visualización de la señal es RF-02
> (ticket posterior) y queda fuera de alcance.

## Contexto y Problema

ECGViewer necesita, como primer paso de todo su flujo, incorporar una señal de ECG al sistema.
Hoy no existe forma de cargar datos: sin este ticket, ningún otro requerimiento (visualizar,
filtrar, medir, anotar, exportar) tiene sobre qué operar. El usuario (técnico, médico, docente o
estudiante) dispone de sus registros como archivos CSV sencillos de un solo canal, y requiere
poder ingresarlos en la aplicación de manera confiable, con validación clara de qué archivo es
aceptable y cuál no.

El contrato del archivo, tomado de un ejemplo real:

```
tiempo,  mV
0,-0.085
0.002,-0.0551153886513551
0.004,-0.0283361648989909
```

Primera línea = cabecera; filas siguientes = datos. Dos columnas: tiempo (segundos) y amplitud
(mV). Separador de columnas: coma. Separador decimal: punto. Los valores pueden ser negativos y
puede haber espacios en blanco alrededor de nombres y valores.

## Objetivos

Permitir al usuario **seleccionar y cargar** un archivo CSV de ECG de un solo canal desde el
navegador, **parsearlo y validarlo** contra un contrato explícito, e **ingresar la señal** (pares
tiempo/amplitud) en el estado de la aplicación para que RF-02 pueda graficarla más adelante.
Ante un archivo inválido o multicanal, dar retroalimentación visible y no cargar datos corruptos
ni parciales.

## Requerimientos Funcionales

- FR-01: El sistema debe permitir seleccionar un archivo CSV mediante un control de selección de archivo en la interfaz (input de archivo o zona de arrastre).
- FR-02: El sistema debe parsear el CSV interpretando la primera línea como cabecera (cuyo nombre de columna no se valida) y las líneas siguientes como filas de datos de dos columnas —tiempo en segundos y amplitud en mV—, usando la coma como separador de columnas y el punto como separador decimal, y aplicando trim a los espacios en blanco alrededor de nombres y valores.
- FR-03: El sistema debe, cuando el archivo es válido, ingresar la señal como una secuencia ordenada de pares (tiempo, amplitud) en el estado de la aplicación, preservando el orden temporal del archivo.
- FR-04: El sistema debe rechazar el archivo sin ingresar ninguna señal cuando el formato es inválido, entendiendo por inválido: menos de dos columnas, algún valor no numérico en una fila de datos, ausencia de filas de datos (archivo vacío o solo cabecera), o filas con cantidad de columnas inconsistente.
- FR-05: El sistema debe rechazar el archivo sin procesar ninguna señal cuando detecta tres o más columnas (multicanal).
- FR-06: El sistema debe mostrar una indicación de éxito cuando la señal se ingresa correctamente, y un mensaje de error explicativo cuando el archivo se rechaza.

## Requerimientos No Funcionales

- NFR-01: El sistema debe parsear y validar el archivo de referencia de 1 minuto de señal (aproximadamente 30.000 muestras) en menos de 0.2 s en el percentil 95 sobre 20 mediciones. *(Supuesto propuesto en DEFINE — pendiente de confirmación del usuario.)*
- NFR-02: El sistema debe funcionar sin errores de compatibilidad en las últimas 2 versiones estables de Chrome, Firefox y Edge en escritorio, y de Chrome en Android y Safari en iOS.

## Criterios de Aceptación
*(EARS — ver `.daw/rules/validation-rules.instructions.md` §1 para los cinco patrones)*

- AC-01 (FR-01): WHEN el usuario selecciona un archivo mediante el control de selección, THE sistema SHALL leer su contenido e iniciar el proceso de carga.
- AC-02 (FR-02, FR-03): WHEN se carga un archivo CSV de un solo canal con una línea de cabecera y filas de exactamente dos columnas numéricas (tiempo, mV), THE sistema SHALL parsear e ingresar la señal en el estado sin errores, respetando el orden temporal, aplicando trim a nombres y valores, y usando la coma como separador de columnas y el punto como separador decimal.
- AC-03 (FR-06): WHEN la señal se ingresa correctamente, THE sistema SHALL mostrar una indicación visible de que la carga fue exitosa.
- AC-04 (FR-04): IF el archivo tiene menos de dos columnas, o algún valor no numérico en una fila de datos, o ninguna fila de datos, o filas con distinta cantidad de columnas, THEN THE sistema SHALL mostrar un mensaje de error y no ingresar ninguna señal.
- AC-05 (FR-05): IF el archivo tiene tres o más columnas, THEN THE sistema SHALL informar que solo se soporta un canal y no procesar el archivo.

## Fuera de Alcance

- Visualización o dibujo de la señal en el gráfico ECG (RF-02) — ticket posterior.
- Importación de señales desde archivos Excel `.xlsx` (RF-13).
- Persistencia o guardado del estudio (RF-15), back-end, API y base de datos.
- Detección o procesamiento de más de un canal (el multicanal se rechaza, no se procesa).
- Soporte de formatos con separador de columnas distinto de la coma o separador decimal distinto del punto.
- Cualquier transformación de la señal (filtros, recortes, remuestreo) sobre los datos cargados.

## Riesgos y Mitigaciones

- Riesgo: un archivo muy grande podría bloquear el hilo principal del navegador durante el parseo → mitigación: medir contra el archivo de referencia (NFR-01) y, de ser necesario, parsear de forma incremental o en streaming.
- Riesgo: ambigüedad por formatos regionales (coma como separador decimal) que corrompería el parseo → mitigación: fijar el contrato (coma = separador de columnas, punto = decimal) y rechazar todo lo que no lo cumpla vía AC-04.
- Riesgo: señales con muestreo irregular o tiempos no monótonos que RF-02 no espere → mitigación: este ticket preserva el orden del archivo sin reordenar; la validación de monotonía temporal, si se requiere, se define en RF-02.

## Dependencias

- Sin dependencias de back-end ni de la API: la carga es 100% en el navegador (File API). La API (`VITE_API_BASE`) no participa en este ticket.
- Stack Front declarado en `AGENTS.md` → sección "Stack": React 19.2 + Vite 6 + TypeScript 5.7; Vitest + React Testing Library para pruebas.
- Dependencia downstream (no bloqueante): la señal ingresada en el estado será consumida por RF-02 (visualización) en un ticket posterior.
