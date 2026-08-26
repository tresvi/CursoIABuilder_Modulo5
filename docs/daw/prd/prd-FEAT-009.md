# PRD FEAT-009: Interfaz gráfica según referencia visual (docs/UI/)

| Field | Value |
|-------|-------|
| Ticket | FEAT-009 |
| Tracker | none |
| Date | 2026-08-26 |
| PRD loops | 1 |

## Context and Problem

La UI actual de ECGViewer (`src/frontend/src/App.tsx`) es un stack vertical simple: título,
`BackendStatus`, `CsvUpload`, `ChartToolbar`, `FilterPanel`, `ECGChart`, `MetricsPanel`,
`MarkerList` y `MarkerForm`, uno debajo del otro, sin navegación lateral ni agrupación visual.
Todas las herramientas (Regla, Recorte, Zoom, Marcar) y los filtros DSP conviven sin jerarquía
clara, y las métricas HRV se muestran en un bloque más entre otros.

El usuario dejó en `docs/UI/` una referencia visual completa del aspecto que la aplicación
debería tener: dos capturas de pantalla (`UI_Without_any_ECG_Loaded.PNG`,
`UI_With_ECG_Loaded.PNG`) y un HTML exportado (`ECGViewer.html` + `ECGViewer_files/`) con los
estilos y la estructura de referencia. Esa referencia define un sidebar oscuro fijo con
secciones "Archivo", "Herramientas" y "Filtros", un panel principal claro con el trazado ECG,
una tarjeta de "Métricas" a la derecha cuando hay señal cargada, y paneles inferiores de
"Filtro digital" y "Marcadores".

Además, la referencia incluye un desplegable "Cargar ejemplo" que no existe hoy en la app. En la
raíz del repo se agregaron 3 archivos CSV de ejemplo (`ECGSamples/CSV/ECG_20_Seg_FILTRADO.csv`,
`ECG_20_Seg_NO_FILTRADO.csv`, `ECG_20_Seg_ESPANTOSO.csv`) pensados para ser cargados desde ese
menú.

La referencia también muestra ítems de menú ("Guardar", "Guardar como CSV", "Exportar XLSX",
"Importar XLSX") que corresponden a RF-12/RF-13/RF-15, todavía no implementados
(`docs/BACKLOG.md`). Este ticket no los implementa: solo reproduce su presencia visual,
deshabilitada, tal como aparecen en `UI_Without_any_ECG_Loaded.PNG`.

## Goals

- Reestructurar el layout de la aplicación en un shell de dos columnas: sidebar de navegación
  fijo (oscuro) + panel de contenido principal (claro), replicando la organización visual de
  `docs/UI/ECGViewer.html` y las dos capturas de referencia.
- Agrupar las herramientas y filtros existentes bajo las secciones del sidebar ("Archivo",
  "Herramientas", "Filtros") en vez de mostrarlos todos al mismo nivel.
- Mostrar el estado "sin archivo" (placeholder con call-to-action "Cargar ejemplo") y el estado
  "con señal cargada" (trazado + tarjeta de Métricas) equivalentes a las dos capturas de
  referencia.
- Agregar la función "Cargar ejemplo": un desplegable que lista los 3 CSV de
  `ECGSamples/CSV/` y, al elegir uno, lo carga igual que si el usuario lo hubiera subido con
  "Abrir CSV".
- Dejar visibles pero deshabilitados los ítems de menú de RF-12/13/15 ("Guardar", "Guardar como
  CSV", "Exportar XLSX", "Importar XLSX") hasta que esos requisitos se implementen.

## Functional Requirements

- FR-01: El sistema debe presentar la aplicación en un layout de sidebar de navegación fijo
  (secciones "Archivo", "Herramientas", "Filtros") más un panel de contenido principal, en
  reemplazo del stack vertical actual.
- FR-02: El sistema debe agrupar bajo la sección "Archivo" del sidebar las acciones "Abrir CSV"
  y "Cargar ejemplo" (habilitadas) y "Importar XLSX", "Guardar", "Guardar como CSV", "Exportar
  XLSX" (visibles pero deshabilitadas).
- FR-03: El sistema debe agrupar bajo la sección "Herramientas" del sidebar los controles de
  Rejilla ECG, Zoom, Restablecer zoom, Desplazar, Regla, Recorte y Marcar existentes.
- FR-04: El sistema debe agrupar bajo la sección "Filtros" del sidebar los controles de filtro
  digital (Pasa Bajo, Pasa Alto, Pasa Banda, Notch, Restaurar) existentes.
- FR-05: El sistema debe mostrar, cuando no hay ninguna señal cargada, un estado vacío en el
  panel principal con un mensaje de instrucción y un botón "Cargar ejemplo" destacado,
  equivalente a `UI_Without_any_ECG_Loaded.PNG`.
- FR-06: El sistema debe mostrar, cuando hay una señal cargada, el trazado ECG en el panel
  principal junto con una tarjeta "Métricas" (BPM, SDNN, RMSSD, pNN50) a su derecha, equivalente
  a `UI_With_ECG_Loaded.PNG`.
- FR-07: El sistema debe permitir, desde un control "Cargar ejemplo" (botón en el estado vacío y
  entrada de menú en "Archivo"), elegir entre las 3 señales de ejemplo servidas por el frontend
  (`ECG_20_Seg_FILTRADO`, `ECG_20_Seg_NO_FILTRADO`, `ECG_20_Seg_ESPANTOSO`) y cargar la
  seleccionada con el mismo flujo de parseo/validación que usa "Abrir CSV" (`parseCsv.ts`).
- FR-08: El sistema debe mostrar, dentro de la sección "Archivo", los ítems "Guardar", "Guardar
  como CSV", "Exportar XLSX" e "Importar XLSX" en estado deshabilitado (no disparan acción),
  sin implicar que estén implementados.
- FR-09: El sistema debe mostrar en el encabezado del panel principal el nombre del archivo
  cargado (o "sin archivo") y la duración de la señal, igual que en las capturas de referencia.

## Non-Functional Requirements

- NFR-01: El sidebar y el panel principal deben reutilizar el mismo Canvas 2D existente
  (`ECGChart.tsx`) sin cambiar su implementación de renderizado ni su presupuesto de
  performance (RNF-01/RNF-02 del PRD maestro): la reestructuración es de layout/CSS, no de la
  lógica de dibujo.
- NFR-02: Los estilos deben implementarse con Tailwind CSS v4 y los primitivos existentes en
  `src/frontend/src/components/ui/`, sin introducir una librería de UI/CSS nueva (regla
  "Dependencies" de `AGENTS.md`).
- NFR-03: La carga de un ejemplo debe completarse en menos de 1 s en una conexión local
  (archivos de ejemplo ≤ 260 KB), medido desde el clic hasta que el trazado se renderiza.

## Acceptance Criteria

- AC-01 (FR-01): WHEN el usuario abre la aplicación, THE sistema SHALL presentarla en un layout
  de sidebar de navegación fijo con las tres secciones ("Archivo", "Herramientas", "Filtros")
  más un panel de contenido principal, en reemplazo del stack vertical anterior.
- AC-02 (FR-02, FR-08): WHEN el usuario despliega la sección "Archivo" del sidebar, THE sistema
  SHALL mostrar "Abrir CSV" y "Cargar ejemplo" habilitados, y "Importar XLSX", "Guardar",
  "Guardar como CSV" y "Exportar XLSX" visibles pero deshabilitados.
- AC-03 (FR-03): WHEN el usuario despliega la sección "Herramientas" del sidebar, THE sistema
  SHALL mostrar los controles de Rejilla ECG, Zoom, Restablecer zoom, Desplazar, Regla, Recorte
  y Marcar agrupados bajo esa sección.
- AC-04 (FR-04): WHEN el usuario despliega la sección "Filtros" del sidebar, THE sistema SHALL
  mostrar los controles de Pasa Bajo, Pasa Alto, Pasa Banda, Notch y Restaurar agrupados bajo
  esa sección.
- AC-05 (FR-05): WHEN el usuario abre la aplicación sin ninguna señal cargada, THE sistema SHALL
  mostrar en el panel principal un mensaje de instrucción y un botón "Cargar ejemplo" destacado,
  equivalente a `UI_Without_any_ECG_Loaded.PNG`.
- AC-06 (FR-06): WHEN el usuario carga una señal (por CSV o por ejemplo), THE sistema SHALL
  mostrar el trazado ECG en el panel principal junto con la tarjeta "Métricas" (BPM, SDNN,
  RMSSD, pNN50) a su derecha, equivalente a `UI_With_ECG_Loaded.PNG`.
- AC-07 (FR-07): WHEN el usuario despliega "Cargar ejemplo" y selecciona una de las 3 señales de
  ejemplo (`ECG_20_Seg_FILTRADO`, `ECG_20_Seg_NO_FILTRADO`, `ECG_20_Seg_ESPANTOSO`), THE sistema
  SHALL cargar y graficar esa señal con el mismo flujo de parseo/validación que usa "Abrir CSV".
- AC-08 (FR-08): IF el usuario hace clic en un ítem deshabilitado del menú ("Guardar", "Guardar
  como CSV", "Exportar XLSX", "Importar XLSX"), THEN THE sistema SHALL no disparar ninguna
  acción y mantener el ítem visualmente deshabilitado.
- AC-09 (FR-07): IF uno de los archivos de ejemplo no puede cargarse (por ejemplo, un fallo de
  red al servirlo), THEN THE sistema SHALL mostrar un mensaje de error y no dejar la aplicación
  en un estado inconsistente (sin señal parcialmente cargada).
- AC-10 (FR-09): WHEN hay una señal cargada, THE sistema SHALL mostrar en el encabezado del
  panel principal el nombre del archivo cargado (o "sin archivo" si no hay ninguna) y la
  duración de la señal.
- AC-11 (FR-03): WHEN el usuario activa una herramienta (Zoom, Regla, Recorte, Marcar) desde la
  sección "Herramientas" del sidebar, THE sistema SHALL comportarse igual que con los controles
  actuales (sin regresión funcional respecto a FEAT-004/FEAT-005/FIX-001/FIX-002).
- AC-12 (FR-04): WHEN el usuario aplica un filtro digital desde la sección "Filtros" del
  sidebar, THE sistema SHALL comportarse igual que con el `FilterPanel` actual (sin regresión
  funcional respecto a FEAT-007b).

## Out of Scope

- Implementar RF-12 (exportar XLSX), RF-13 (importar XLSX) o RF-15 (persistencia con "Guardar",
  backend SQLite): quedan como FEAT futuros del backlog; este ticket solo reproduce su presencia
  visual deshabilitada.
- Modificar la lógica de cálculo de métricas, filtros DSP, marcadores, zoom, regla o recorte:
  solo se reorganiza su presentación visual.
- Accesibilidad (WCAG) más allá de lo ya cubierto por los componentes existentes (fuera de
  alcance del PRD maestro).
- Soporte responsive/mobile: la referencia visual es de escritorio; no se define comportamiento
  para viewports angostos.
- Agregar más señales de ejemplo además de las 3 provistas en `ECGSamples/CSV/`.

## Risks and Mitigations

- Riesgo: reorganizar el layout puede introducir una regresión funcional en herramientas ya
  probadas (Zoom, Regla, Recorte, Marcadores, Filtros) → mitigación: AC-06/AC-07 exigen
  paridad de comportamiento, y la suite de tests existente (`ChartToolbar`, `FilterPanel`,
  `MarkerList`, etc.) debe seguir en verde tras el refactor de layout.
- Riesgo: los archivos de `ECGSamples/CSV/` están en la raíz del repo, no en `src/frontend`; hay
  que decidir en PLAN cómo se sirven al frontend (copiarlos a `public/`, servirlos vía Vite,
  etc.) sin violar la separación de capas de `AGENTS.md` → mitigación: se resuelve como decisión
  de implementación en PLAN, documentada si amerita un ADR.
- Riesgo: fidelidad visual alta exige revisar contra el HTML de referencia con precisión ítem
  por ítem → mitigación: `docs/UI/ECGViewer.html` queda como referencia de estilos consultable
  durante CODE y VERIFY.

## Dependencies

- `docs/UI/ECGViewer.html`, `docs/UI/UI_Without_any_ECG_Loaded.PNG`,
  `docs/UI/UI_With_ECG_Loaded.PNG` como especificación visual.
- `ECGSamples/CSV/*.csv` como fuente de las señales de ejemplo.
- Componentes existentes: `ChartToolbar`, `FilterPanel`, `ECGChart`, `MetricsPanel`,
  `MarkerList`, `MarkerForm`, `CsvUpload`, `lib/ecg/parseCsv.ts`.
- Comportamiento a preservar sin regresión, verificado por AC-11/AC-12: FEAT-004 (herramienta
  Regla), FEAT-005 (herramienta Recorte), FIX-001/FIX-002 (cursores y selección de Regla),
  FEAT-007b (filtros DSP vía backend .NET).
