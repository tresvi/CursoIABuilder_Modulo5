# PRD FEAT-007b: Filtros DSP (RF-10/RF-11)

| Field | Value |
|-------|-------|
| Ticket | FEAT-007b |
| Tracker | none |
| Date | 2026-08-25 |
| PRD loops | 0 |

## Context and Problem

Con el esqueleto del backend disponible (FEAT-007a), ECGViewer puede finalmente implementar RF-10
(aplicar filtros DSP a la señal cargada) y RF-11 (revertir un filtro aplicado). El catálogo de
filtros que el usuario necesita es más amplio que "pasa bajo/alto/banda/notch": son 7 tipos, algunos
espectrales (vía `FftSharp`) y otros de dominio temporal (media móvil, mediana móvil,
Savitzky-Golay), cada uno con sus propios parámetros y validaciones. La aplicación de filtros es
encadenada/aditiva (cada filtro nuevo opera sobre la señal ya filtrada), con un único nivel de undo:
"Revertir" deshace solo el último filtro aplicado — volver a la señal original tal como fue cargada
requiere recargar el archivo, decisión explícita e intencional del usuario (no un "revertir todo").

## Goals

- Que el usuario pueda elegir uno de 7 filtros DSP desde un combo, configurar sus parámetros, y
  aplicarlo sobre la señal actualmente cargada (ya sea la original o una ya filtrada previamente).
- Que el usuario pueda deshacer el último filtro aplicado con un botón "Revertir", habilitado solo
  cuando hay un filtro aplicado para deshacer.
- Que los parámetros inválidos (frecuencias fuera de rango, ventanas no enteras, relaciones
  inconsistentes entre corte inferior/superior o entre grado de polinomio y ventana) se rechacen
  antes de aplicar el filtro, con mensajes de error claros.
- Mantener la regla del proyecto de no modificar destructivamente la señal cargada más allá de lo
  que el propio modelo de encadenado+undo de un nivel permite (documentado y aceptado explícitamente
  como el límite de este ticket, ver "Out of Scope").

## Functional Requirements

- FR-01: El sistema debe ofrecer un combo con 7 tipos de filtro: Pasa Bajo, Pasa Alto, Pasa Banda,
  Notch, Media Móvil, Mediana Móvil y Savitzky-Golay.
- FR-02: Al seleccionar "Pasa Bajo" o "Pasa Alto", el sistema debe pedir un campo "Frecuencia de
  corte" (Hz), con valor por defecto 49.5 Hz para Pasa Bajo y 1 Hz para Pasa Alto.
- FR-03: Al seleccionar "Pasa Banda" o "Notch", el sistema debe pedir dos campos: "Frecuencia de
  corte inferior" y "Frecuencia de corte superior" (Hz), con valores por defecto 1 Hz / 49.5 Hz para
  Pasa Banda y 50 Hz / 60 Hz para Notch.
- FR-04: Al seleccionar "Media Móvil" o "Mediana Móvil", el sistema debe pedir un campo "Ventana
  (muestras)", con valor por defecto 5 muestras para Media Móvil y 7 muestras para Mediana Móvil.
- FR-05: Al seleccionar "Savitzky-Golay", el sistema debe pedir dos campos: "Ventana (muestras)" y
  "Grado de Polinomio".
- FR-06: El sistema debe ofrecer un botón "Aplicar filtro" que envíe la señal actual y los parámetros
  elegidos al backend, y reemplace la señal cargada en el front por la señal filtrada devuelta.
- FR-07: El sistema debe ofrecer un botón "Revertir", deshabilitado por defecto, que se habilita
  únicamente cuando hay al menos un filtro aplicado sin deshacer.
- FR-08: Al presionar "Revertir", el sistema debe deshacer únicamente el último filtro aplicado,
  restaurando la señal al estado inmediatamente anterior a esa aplicación (no a la señal original si
  se aplicaron varios filtros en secuencia).
- FR-09: Los filtros se aplican de forma encadenada/aditiva: aplicar un filtro nuevo mientras ya hay
  uno aplicado opera sobre la señal ya filtrada, no sobre la señal original.
- FR-10: El sistema debe validar que toda frecuencia de corte ingresada sea positiva, con resolución
  de 0.1 Hz, y no exceda la frecuencia de Nyquist (mitad de la frecuencia de muestreo de la señal
  cargada) — rechazando la operación con un error si se excede.
- FR-11: Para Pasa Banda y Notch, el sistema debe validar que la frecuencia de corte inferior sea
  estrictamente menor que la frecuencia de corte superior antes de permitir aplicar el filtro.
- FR-12: Para Media Móvil, Mediana Móvil y Savitzky-Golay, el sistema debe validar que "Ventana
  (muestras)" sea un entero positivo antes de permitir aplicar el filtro.
- FR-13: Para Savitzky-Golay, el sistema debe validar que "Grado de Polinomio" sea un entero positivo
  estrictamente menor que "Ventana (muestras)" antes de permitir aplicar el filtro.
- FR-14: El procesamiento de cada filtro (pasa bajo/alto/banda/notch vía `FftSharp`; media
  móvil/mediana móvil/Savitzky-Golay en dominio temporal) debe ejecutarse en el backend, nunca en el
  front (la UI solo renderiza y consume el endpoint, según `AGENTS.md`).

## Non-Functional Requirements

- NFR-01: Aplicar un filtro a una señal de hasta 1 minuto (a la frecuencia de muestreo típica del
  proyecto) debe responder en menos de 500ms de round-trip (front→API→front), para no bloquear
  visualmente al usuario.
- NFR-02: El endpoint de filtrado debe rechazar payloads que representen señales multicanal (más de
  2 columnas equivalentes), devolviendo un error 400 explícito, consistente con la regla de "no
  procesar en silencio una entrada inválida" de `AGENTS.md`.
- NFR-03: Los cambios de filtro (aplicar/revertir) no se persisten automáticamente en SQLite — se
  mantienen en memoria de sesión hasta que el usuario presione "Guardar" (RF-15, fuera de alcance de
  este ticket), consistente con la regla de no persistir cambios sin confirmación explícita.

## Acceptance Criteria

- AC-01 (FR-01): WHEN el usuario abre el combo de filtros, THE sistema SHALL mostrar las 7 opciones
  (Pasa Bajo, Pasa Alto, Pasa Banda, Notch, Media Móvil, Mediana Móvil, Savitzky-Golay).
- AC-02 (FR-02): WHEN el usuario selecciona "Pasa Bajo", THE sistema SHALL mostrar el campo
  "Frecuencia de corte" prellenado con 49.5 Hz (y con 1 Hz si selecciona "Pasa Alto").
- AC-03 (FR-03): WHEN el usuario selecciona "Notch", THE sistema SHALL mostrar los campos de
  frecuencia inferior/superior prellenados con 50 Hz y 60 Hz respectivamente (y con 1 Hz / 49.5 Hz si
  selecciona "Pasa Banda").
- AC-04 (FR-04): WHEN el usuario selecciona "Media Móvil" o "Mediana Móvil", THE sistema SHALL
  mostrar el campo "Ventana (muestras)" prellenado con 5 o 7 respectivamente.
- AC-05 (FR-05): WHEN el usuario selecciona "Savitzky-Golay", THE sistema SHALL mostrar los campos
  "Ventana (muestras)" y "Grado de Polinomio".
- AC-06 (FR-06): WHEN el usuario presiona "Aplicar filtro" con parámetros válidos, THE sistema SHALL
  enviar la señal y los parámetros al backend y reemplazar la señal mostrada por la señal filtrada
  devuelta.
- AC-07 (FR-07): WHEN no hay ningún filtro aplicado sin deshacer, THE sistema SHALL mantener el botón
  "Revertir" deshabilitado.
- AC-08 (FR-07): WHEN se aplica un filtro exitosamente, THE sistema SHALL habilitar el botón
  "Revertir".
- AC-09 (FR-08): WHEN el usuario presiona "Revertir" tras haber aplicado uno o más filtros en
  secuencia, THE sistema SHALL restaurar únicamente la señal previa al último filtro aplicado (no la
  señal original si hubo más de un filtro).
- AC-10 (FR-09): WHEN el usuario aplica un segundo filtro teniendo ya uno aplicado, THE sistema SHALL
  aplicar el nuevo filtro sobre la señal ya filtrada (no sobre la señal original).
- AC-11 (FR-10): IF el usuario ingresa una frecuencia de corte que excede la frecuencia de Nyquist de
  la señal cargada, THEN THE sistema SHALL rechazar la operación y mostrar un mensaje de error, sin
  permitir presionar "Aplicar filtro".
- AC-12 (FR-11): IF el usuario ingresa, para Pasa Banda o Notch, una frecuencia de corte inferior
  mayor o igual a la superior, THEN THE sistema SHALL rechazar la operación y mostrar un mensaje de
  error.
- AC-13 (FR-12): IF el usuario ingresa una "Ventana (muestras)" que no es un entero positivo (para
  Media Móvil, Mediana Móvil o Savitzky-Golay), THEN THE sistema SHALL rechazar la operación y
  mostrar un mensaje de error.
- AC-14 (FR-13): IF el usuario ingresa, para Savitzky-Golay, un "Grado de Polinomio" mayor o igual a
  "Ventana (muestras)", THEN THE sistema SHALL rechazar la operación y mostrar un mensaje de error.
- AC-15 (FR-14): WHEN se aplica cualquiera de los 7 filtros, THE sistema SHALL ejecutar el cálculo en
  el backend (`ECGViewer.Api`), nunca en el código del front.
- AC-16 (NFR-02): IF el payload enviado al endpoint de filtrado representa una señal multicanal (más
  de 2 columnas equivalentes), THEN THE sistema SHALL responder con un error 400 explícito sin
  procesar el filtro.

## Out of Scope

- "Revertir todo a la señal original" cuando se encadenaron 2 o más filtros — decisión explícita del
  usuario: el único camino de vuelta a la señal original es recargar el archivo. No se implementa un
  historial de undo multinivel ni un botón adicional para esto.
- Persistencia de los filtros aplicados en SQLite (RF-15, "Guardar") — los filtros viven en memoria
  de sesión hasta que ese ticket futuro lo implemente.
- Configuración de filtros por el usuario más allá de los 7 tipos y sus parámetros ya definidos (no
  hay "filtros personalizados" ni combinaciones predefinidas).
- Aplicar más de un filtro en una sola operación de UI (el encadenado es secuencial: un filtro por
  clic en "Aplicar filtro", no un pipeline de varios filtros configurados de una vez).
- Validación de la calidad matemática del resultado del filtro (p. ej. artefactos de aliasing) más
  allá de las validaciones de parámetros de entrada — se asume que `FftSharp` y los algoritmos de
  dominio temporal implementados son correctos si los parámetros de entrada son válidos.

## Risks and Mitigations

- Riesgo: aplicar filtros IIR (pasa bajo/alto/banda/notch) de forma encadenada puede acumular
  inestabilidad numérica tras varias aplicaciones sucesivas. Mitigación: fuera de alcance detectar
  esto automáticamente en este ticket (ver "Out of Scope" sobre calidad matemática), pero se
  documenta como riesgo conocido para revisarlo si aparecen reportes de resultados extraños.
- Riesgo: la validación de Nyquist requiere conocer la frecuencia de muestreo real de la señal
  cargada, que puede no ser uniforme en todos los CSV soportados. Mitigación: el spec técnico (PLAN)
  debe definir cómo se calcula la frecuencia de muestreo efectiva a partir de la señal cargada antes
  de implementar AC-11.

## Dependencies

- Depende de FEAT-007a (esqueleto del backend) — reutiliza la solución `ECGViewer.Api` y su
  infraestructura de tests.
- `FftSharp` 2.2.0 (ya documentado en `AGENTS.md`) para los filtros espectrales (Pasa Bajo, Pasa
  Alto, Pasa Banda, Notch).
- Bloquea/desbloquea: ninguno de RF-12/13/15 depende de este ticket, pero comparte el mismo backend
  que FEAT-007a habilita.
