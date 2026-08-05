# PRD-001: ECGViewer — Visor y analizador web de electrocardiogramas (ECG) desde CSV/XLSX

> Versión endurecida derivada del PRD original, reescrita contra el template y el checklist
> de calidad del curso. La aplicación es de **libre acceso** (sin autenticación ni datos por
> usuario). Las herramientas de **zoom, regla y recorte** se operan con el **mouse** sobre el
> gráfico, con un cursor propio por herramienta. Accesibilidad (WCAG) y autenticación quedan
> fuera de alcance.

## Contexto y Problema

En el día a día del técnico electrocardiógrafo, del médico y del estudiante se manipulan
señales de ECG de lectura dificultosa (ruidosas), que requieren procedimientos manuales
para detectar métricas clave y no pueden indexarse de forma sencilla para un análisis
posterior. Además, no existen herramientas gratuitas, accesibles e integradas orientadas
a la visualización y el análisis de este tipo de señales biomédicas.

### Personas
- **Técnico electrocardiógrafo**: prepara al paciente y realiza la toma del ECG. Opera un
  equipo del cual con frecuencia desconoce su estado de calibración y cuyos filtros de
  ruido son básicos (muchas veces analógicos, que degradan la señal) o inexistentes,
  debiendo aceptar la señal capturada sin poder mejorarla.
- **Médico**: recibe la señal capturada "como salió", sin posibilidad de aplicarle filtros
  para mejorar su lectura, lo que dificulta el diagnóstico. Analiza y diagnostica sobre lo
  observado, normalmente en papel térmico, con los problemas que ello conlleva.
- **Docente/Estudiante de ingeniería biomédica/electrónica**: visualiza señales de ECG,
  las guarda, las compara y saca conclusiones a partir de la comparación. Realiza
  anotaciones para marcar artefactos (ruido eléctrico), arritmias (alteraciones de ritmo)
  y anomalías (alteraciones morfológicas).

## Objetivos

Desarrollar **ECGViewer**, una aplicación web para **visualizar, filtrar y analizar
señales de electrocardiograma (ECG)** a partir de archivos CSV/XLSX sencillos, orientada a
entornos **educativos y de investigación**. El usuario puede **cargar señales desde
archivos**, **visualizarlas en un gráfico principal**, **aplicar filtros digitales**,
**consultar métricas cardíacas**, **anotar sobre el gráfico**, **realizar mediciones
asistidas con el mouse**, **importar/exportar datos en Excel** y **guardar su trabajo**.

## Requerimientos Funcionales
- RF-01: El sistema debe permitir cargar una señal ECG de un solo canal desde un archivo CSV cuya primera línea sea un encabezado con columnas de tiempo y valor.
- RF-02: El sistema debe visualizar la señal cargada en un gráfico principal con el tiempo en el eje X (en segundos) y la amplitud en el eje Y (en mV), respetando el orden temporal del archivo.
- RF-03: El sistema debe permitir crear un marcador de evento anclado a un instante del eje temporal del gráfico.
- RF-04: El sistema debe permitir editar la etiqueta o comentario de un marcador de evento existente.
- RF-05: El sistema debe permitir eliminar un marcador de evento existente.
- RF-06: El sistema debe permitir, con la herramienta Zoom activa, acercar un rango del eje temporal seleccionándolo con el mouse mediante arrastre horizontal, y restablecer el zoom original.
- RF-07: El sistema debe permitir mostrar u ocultar una rejilla ECG sobre el gráfico.
- RF-08: El sistema debe permitir, con la herramienta Regla activa, medir con el mouse la diferencia de tiempo (Δt) y de amplitud (Δamplitud) entre el punto donde se presiona y el punto donde se suelta, sin modificar la señal.
- RF-09: El sistema debe permitir, con la herramienta Recorte activa, seleccionar con el mouse un rango del eje temporal y, previa confirmación del usuario, recortar la señal a ese rango generando una nueva señal acotada.
- RF-10: El sistema debe permitir aplicar un filtro digital (pasa bajo, pasa alto, pasa banda o notch) a la señal desde la pantalla principal.
- RF-11: El sistema debe permitir revertir la señal filtrada a la señal original cargada.
- RF-12: El sistema debe permitir exportar la señal cargada a un archivo Excel (.xlsx).
- RF-13: El sistema debe permitir importar una señal desde un archivo Excel (.xlsx).
- RF-14: El sistema debe calcular y mostrar las métricas cardíacas (BPM, SDNN, RMSSD, pNN50) sobre la ventana de tiempo visible en el gráfico.
- RF-15: El sistema debe persistir los cambios (marcadores, filtros, recortes) únicamente cuando el usuario lo solicita explícitamente con la acción "Guardar".

## Requerimientos No Funcionales
- RNF-01: El sistema debe renderizar el gráfico del ECG en menos de 0.1 s en el percentil 95 sobre 20 mediciones, tomando como referencia un archivo de 1 minuto de señal.
- RNF-02: El sistema, al actualizar el gráfico (zoom, filtro, nuevo dato o interacción con el mouse), no debe ejecutar un redibujado completo del lienzo y debe mantener al menos 10 fps (frame < 100 ms), medido con el panel Performance del navegador.
- RNF-03: El sistema debe calcular las métricas (BPM, SDNN, RMSSD, pNN50) en menos de 0.1 s en el percentil 95 sobre 20 mediciones, tomando como referencia un archivo de 1 minuto de señal.
- RNF-04: El sistema debe funcionar sin errores de compatibilidad en las últimas 2 versiones estables de Chrome, Firefox y Edge en escritorio, y de Chrome en Android y Safari en iOS.
- RNF-05: El sistema no debe guardar automáticamente ningún cambio del gráfico o de la información: la persistencia ocurre solo por acción explícita del usuario.
- RNF-06: El sistema debe alertar al usuario y pedir confirmación antes de cerrar o recargar cuando existan cambios sin guardar.

## Criterios de Aceptación
- AC-01 (RF-01): Dado un archivo CSV válido de un canal con columnas tiempo/valor y encabezado, cuando se carga, entonces el sistema lo acepta e ingresa la señal sin errores.
- AC-02 (RF-01): Dado un archivo CSV con formato inválido (columnas faltantes, valores no numéricos o encabezado incorrecto), cuando se intenta cargar, entonces el sistema muestra un mensaje de error y no carga la señal.
- AC-03 (RF-01): Dado un archivo CSV con más de un canal, cuando se intenta cargar, entonces el sistema informa que solo soporta un canal y no procesa el archivo.
- AC-04 (RF-02): Dado un archivo válido cargado, cuando se dibuja el gráfico, entonces el tiempo aparece en el eje X con escala numérica en segundos y la amplitud en el eje Y con escala numérica en mV, respetando el orden temporal del archivo.
- AC-05 (RF-03): Dado un gráfico ECG cargado con la herramienta Marcar activa, cuando el usuario hace clic sobre un punto del eje temporal, entonces se crea un marcador de evento anclado a ese instante, visible y persistente mientras dure la sesión de trabajo.
- AC-06 (RF-04): Dado un evento ya marcado, cuando el usuario lo selecciona y edita su etiqueta/comentario, entonces el cambio queda reflejado en el marcador.
- AC-07 (RF-05): Dado un evento ya marcado, cuando el usuario lo selecciona y elige eliminarlo, entonces el marcador desaparece del gráfico.
- AC-08 (RF-06): Dada la herramienta Zoom activa, cuando el usuario arrastra horizontalmente sobre el gráfico, entonces el cursor toma forma de lupa, la selección abarca todo el eje Y (sin importar la posición vertical del cursor) y define el rango en el eje X, y al soltar el botón la vista se acerca a ese rango de tiempo.
- AC-09 (RF-06): Dado un gráfico con zoom aplicado, cuando el usuario usa la opción "Restablecer zoom", entonces la vista vuelve a mostrar la señal completa.
- AC-10 (RF-07): Dado un gráfico cargado, cuando el usuario activa o desactiva la rejilla ECG, entonces la cuadrícula se muestra u oculta sobre el gráfico.
- AC-11 (RF-08): Dada la herramienta Regla activa, cuando el usuario arrastra el mouse sobre el gráfico, entonces el cursor toma forma de regla y se muestra en tiempo real Δt (en s) y Δamplitud (en mV) entre el punto inicial y la posición del cursor; cuando el usuario suelta el botón, la medición desaparece y la señal no se altera.
- AC-12 (RF-09): Dada la herramienta Recorte activa, cuando el usuario arrastra horizontalmente sobre el gráfico, entonces el cursor toma forma de tijera, la selección abarca todo el eje Y y define el rango en el eje X, y se resalta la región a conservar sin alterar todavía la señal.
- AC-13 (RF-09): Dado un rango de recorte seleccionado, cuando el sistema pide confirmación mediante un cartel, entonces si el usuario acepta la señal se recorta a ese rango (generando una nueva señal acotada) y si el usuario cancela la señal permanece intacta.
- AC-14 (RF-10): Dado un gráfico cargado, cuando el usuario aplica un filtro (pasa bajo, pasa alto, pasa banda o notch) con sus parámetros de frecuencia de corte, entonces el gráfico se actualiza mostrando la señal filtrada sin salir de la pantalla principal.
- AC-15 (RF-11): Dado un filtro aplicado, cuando el usuario decide no aceptar los cambios y revertir, entonces la señal vuelve exactamente a la original cargada.
- AC-16 (RF-12): Dada una señal cargada, cuando el usuario exporta a .xlsx, entonces se genera un archivo válido que, al reabrirse en Excel o reimportarse en la app, conserva los valores de tiempo y señal originales.
- AC-17 (RF-13): Dado un archivo .xlsx con la estructura esperada, cuando el usuario lo importa, entonces el sistema carga y grafica los datos igual que con un CSV válido (AC-04); si la estructura no es la esperada, se rechaza con un mensaje de error.
- AC-18 (RF-14): Dado un gráfico con una ventana de tiempo visible, cuando se calculan las métricas, entonces BPM, SDNN, RMSSD y pNN50 se muestran calculados únicamente sobre los datos visibles en esa ventana, no sobre todo el archivo.
- AC-19 (RF-14): Dado que el usuario cambia el rango visible (zoom in/out o desplazamiento), cuando el gráfico se actualiza, entonces las métricas se recalculan y reflejan el nuevo rango.
- AC-20 (RF-15): Dado un gráfico con cambios pendientes (marcadores, filtros o recortes), cuando el usuario presiona explícitamente "Guardar", entonces recién en ese momento los cambios quedan persistidos.
- AC-21 (RNF-01): Dado el archivo de referencia de 1 minuto, cuando se carga y renderiza 20 veces, entonces el tiempo de renderizado es menor a 0.1 s en el percentil 95.
- AC-22 (RNF-02): Dado un gráfico en pantalla, cuando se actualiza (zoom, filtro, nuevo dato o arrastre del mouse), entonces no se dispara un redibujado completo del lienzo y se mantienen ≥ 10 fps (frame < 100 ms), verificado con el panel Performance del navegador.
- AC-23 (RNF-03): Dado el archivo de referencia de 1 minuto, cuando se calculan BPM, SDNN, RMSSD y pNN50 20 veces, entonces el tiempo total de cálculo es menor a 0.1 s en el percentil 95.
- AC-24 (RNF-04): Dada la aplicación abierta en las últimas 2 versiones estables de Chrome/Firefox/Edge (escritorio) y de Chrome Android y Safari iOS, cuando se realizan las operaciones básicas (carga, zoom, filtro, marcado de eventos), entonces todas funcionan sin errores de compatibilidad.
- AC-25 (RNF-05): Dado un gráfico con marcadores, filtros o recortes aplicados, cuando el usuario cierra o recarga sin haber presionado "Guardar", entonces los cambios no se persisten y se pierden (comportamiento esperado, no un bug).
- AC-26 (RNF-06): Dado un gráfico con cambios pendientes, cuando el usuario intenta cerrar o recargar la pantalla, entonces el sistema lo alerta y pide confirmación antes de descartar los cambios.

## Fuera de Alcance
- Captura, lectura o registro en tiempo real desde dispositivos hardware (puerto serie u otros).
- Espacios de trabajo de filtrado separados del gráfico principal.
- Exportación a formatos de simulación o firmware (Proteus, tablas C, EDF, WFDB, etc.).
- Diagnóstico clínico certificado; la herramienta no sustituye equipamiento médico homologado.
- Autenticación, cuentas de usuario, sesiones y aislamiento de datos por usuario: la aplicación es de libre acceso, sin inicio de sesión.
- Almacenamiento en la nube y multi-tenancy (los estudios guardados se persisten localmente).
- Integración con estándares hospitalarios (HL7, DICOM, HL7-aECG).
- Sparklines decorativas u otros gráficos de estadísticas de señal (energía por banda, histogramas de amplitud, etc.) en el panel de métricas.
- Accesibilidad y cumplimiento de estándares WCAG (fuera de v1).
- Soporte multicanal.

## Riesgos y Dependencias
- Riesgo: la librería gráfica no cumple los umbrales de rendimiento (render < 0.1 s p95, sin full-repaint, ≥ 10 fps) → mitigación: renderizar sobre Canvas con un lienzo base (señal/ejes) y un lienzo superpuesto para la interacción del mouse, y medir contra el archivo de referencia de 1 minuto (RNF-01, RNF-02, AC-21, AC-22).
- Riesgo: detección poco fiable de picos R sobre señal ruidosa que arroje métricas erróneas (BPM, SDNN, RMSSD, pNN50) → mitigación: aplicar el filtrado digital antes del cálculo y validar contra señales conocidas (RF-10, RF-14, AC-18).
- Dependencia: librería gráfica de alto rendimiento (Canvas/WebGL); algoritmos de filtrado digital (DSP) y de detección de picos R.
- Dependencia: `FftSharp` para los filtros DSP; `ClosedXML`/`DocumentFormat.OpenXml` para import/export .xlsx; SQLite para persistir los estudios guardados.

## Glosario
- **ECG**: Electrocardiograma; registro de la actividad eléctrica del corazón.
- **BPM**: Frecuencia cardíaca en latidos por minuto.
- **HRV**: Variabilidad de la frecuencia cardíaca; en este producto se cuantifica mediante SDNN, RMSSD y pNN50.
- **SDNN**: Desviación estándar de los intervalos NN (ms).
- **RMSSD**: Raíz cuadrada de la media de las diferencias sucesivas al cuadrado entre intervalos RR (ms).
- **pNN50**: Porcentaje de pares RR consecutivos cuya diferencia supera 50 ms.
- **Ventana visible**: Rango temporal `[fromTime, toTime]` mostrado actualmente en el gráfico ECG tras pan/zoom.
- **p95**: Percentil 95 de una serie de mediciones; el valor por debajo del cual cae el 95 % de las observaciones.
