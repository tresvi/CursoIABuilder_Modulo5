# Threat Model FEAT-009: Interfaz gráfica según referencia visual (docs/UI/)

| Field | Value |
|-------|-------|
| Ticket | FEAT-009 |
| Spec | docs/daw/specs/spec-FEAT-009.md |
| PRD | docs/daw/prd/prd-FEAT-009.md |
| Tier | FEATURE |
| Date | 2026-08-26 |
| Metodología | STRIDE (Microsoft SDL) + OWASP Threat Modeling |

## Alcance del análisis

Cambio íntegramente en el frontend (`src/frontend`): reestructuración de layout, ítems de menú
deshabilitados y carga de 3 señales CSV de ejemplo servidas como assets estáticos de Vite. **No se
modifica el backend .NET** (`ECGViewer.Api`), no se agrega autenticación, no se agrega persistencia
y no se agregan dependencias (NFR-02). El único flujo de datos nuevo es un `GET` mismo-origen a
`/samples/*.csv`.

## Componentes analizados

| # | Componente | Origen | Entrada que recibe |
|---|---|---|---|
| C1 | `AppLayout` / `Sidebar` / `SidebarSection` (Block 1) | nuevo | ninguna (estructural) |
| C2 | `TopBar` + `fileName` en `signalStore` + `lib/ecg/duration.ts` (Block 2) | nuevo/modificado | `File.name` del archivo elegido por el usuario |
| C3 | Controles reubicados: `ChartToolbar`, `FilterPanel`, `CsvUpload`, `MetricsPanel`, `ECGChart` (Block 3) | modificado (solo `className`) | la misma que ya recibían |
| C4 | `FileSection` + `DisabledMenuItem` (Block 4) | nuevo | ninguna (los ítems deshabilitados no aceptan entrada) |
| C5 | `public/samples/*.csv` + `lib/ecg/samples.ts` + `ExampleLoader` (Block 5) | nuevo | selección del `<select>` (lista blanca de 3 ids) + contenido CSV descargado |
| C6 | `MainPanel` / `EmptyState` (Block 6) | nuevo | ninguna (delega en C4 y C5) |

## Límites de confianza (F-TM-02)

| # | Cruce | Zonas | Control aplicado |
|---|---|---|---|
| TB-1 | Usuario → navegador (input de archivo de `CsvUpload`, `<select>` de `ExampleLoader`) | usuario no confiable → código del cliente | Guardia de tamaño (25 MB), `accept=".csv,text/csv"`, lista blanca de 3 ids, validación de dominio en `parseCsv` |
| TB-2 | Navegador → servidor estático de Vite (`GET /samples/*.csv`) | código del cliente → assets de build, **mismo origen** | Ruta literal del catálogo (no concatena entrada), respuesta tratada como no confiable y pasada por `parseCsv` |
| TB-3 | Frontend → backend .NET (`POST /api/filters/apply`) | cliente → servidor, **origen distinto** (`VITE_API_BASE`) | **Preexistente, sin cambios en este ticket**: validación y límite de 500.000 muestras del lado del backend (FEAT-007b). Se declara porque C3 sigue cruzándolo tras la reubicación |

No se introduce ningún límite de confianza nuevo: TB-2 es el único cruce agregado, y es
mismo-origen contra archivos que forman parte del propio build.

## Clasificación de datos (F-TM-05)

| Dato | Clasificación | Justificación |
|---|---|---|
| Señales ECG de ejemplo (`public/samples/*.csv`) | **Público** | Trazados sintéticos/de laboratorio provistos por el propio equipo del curso, versionados en el repo público y servidos como asset de build. No pertenecen a ningún paciente identificable |
| Señal ECG cargada por el usuario | **No sensible en esta app** | Un par (tiempo, mV) sin identificadores; nunca se persiste (memoria volátil, `AGENTS.md`) y nunca sale del navegador salvo hacia `POST /api/filters/apply`, que ya existía |
| Nombre de archivo (`fileName`, C2) | **Público / metadato** | Lo elige el usuario; se muestra en pantalla y no se persiste ni se transmite |
| Credenciales / PII / datos financieros | **No aplica** | La app es de libre acceso, sin usuarios, sesiones ni cuentas (`AGENTS.md`). No existe ninguno de estos datos |

**F-TM-07:** no hay datos clasificados como PII ni credenciales, por lo que no aplica el requisito
de cifrado en reposo/tránsito. La `ANTHROPIC_API_KEY` (única credencial del proyecto) no participa
de ningún flujo de este ticket.

## Análisis STRIDE

### C1 — Shell de layout (`AppLayout`, `Sidebar`, `SidebarSection`)

| STRIDE | Análisis | Riesgo |
|---|---|---|
| Spoofing | Componentes estructurales sin identidad ni sesión; no hay nada que suplantar | Ninguno |
| Tampering | Estado local sin persistencia; una manipulación del DOM afecta solo a la pestaña del propio usuario | Ninguno |
| Repudiation | No ejecuta ninguna acción auditable | Ninguno |
| Information Disclosure | No renderiza datos: solo títulos de sección estáticos | Ninguno |
| Denial of Service | `<details>` nativo, sin bucles ni cálculo; no puede degradarse | Ninguno |
| Elevation of Privilege | No hay privilegios en la app | Ninguno |

### C2 — `TopBar` + `fileName` en `signalStore`

| STRIDE | Análisis | Riesgo |
|---|---|---|
| Spoofing | Sin identidad | Ninguno |
| Tampering | `fileName` vive en memoria; alterarlo solo cambia el rótulo que ve el propio usuario | Ninguno |
| Repudiation | No aplica (sin auditoría por diseño) | Ninguno |
| Information Disclosure | El nombre del archivo local queda visible en pantalla; no se transmite ni se registra | R-01 (LOW) |
| Denial of Service | `signalDurationSeconds` es O(1) (primera y última muestra) | Ninguno |
| Elevation of Privilege | No aplica | Ninguno |

**R-02 (Tampering/XSS):** `fileName` proviene del usuario y se renderiza en el encabezado.
Mitigación: se interpola en JSX, que escapa por defecto; la spec prohíbe explícitamente
`dangerouslySetInnerHTML` y cualquier uso del nombre para construir rutas.

### C3 — Controles reubicados (`ChartToolbar`, `FilterPanel`, `CsvUpload`, `MetricsPanel`, `ECGChart`)

| STRIDE | Análisis | Riesgo |
|---|---|---|
| Spoofing | Sin identidad | Ninguno |
| Tampering | Solo cambian clases CSS de contenedores; ninguna ruta de datos, validación ni llamada al backend se toca | R-03 (MEDIUM) |
| Repudiation | Sin cambios respecto de la situación actual | Ninguno |
| Information Disclosure | No se agregan datos a la vista; `MetricsPanel` sigue calculando sobre la ventana visible | Ninguno |
| Denial of Service | El límite de 500.000 muestras de `POST /api/filters/apply` (FEAT-007b) sigue vigente en el backend; este ticket no lo altera | Ninguno nuevo |
| Elevation of Privilege | No aplica | Ninguno |

**R-03 (MEDIUM):** una reubicación puede desactivar sin querer un control de seguridad existente
(guardia de tamaño de 25 MB, `accept` del input, validación de Nyquist/rangos de `FilterPanel`,
rechazo de multicanal de `parseCsv`). Mitigación: la spec exige que `CsvUpload.test.tsx`,
`FilterPanel.test.tsx`, `ChartToolbar.test.tsx`, `ECGChart.test.tsx` y `render/*.test.ts` queden
verdes **sin modificarse** (criterio de cierre de Block 3), lo que hace que cualquier pérdida de
validación aparezca como test en rojo.

### C4 — `FileSection` + `DisabledMenuItem`

| STRIDE | Análisis | Riesgo |
|---|---|---|
| Spoofing | Sin identidad | Ninguno |
| Tampering | Un atacante con DevTools puede quitar el atributo `disabled` | R-04 (LOW) |
| Repudiation | No aplica | Ninguno |
| Information Disclosure | Los rótulos revelan funcionalidad futura (RF-12/13/15); es información pública del backlog del repo | Ninguno |
| Denial of Service | Botones sin handler; no consumen recursos | Ninguno |
| Elevation of Privilege | No aplica | Ninguno |

**R-04 (LOW):** quitar `disabled` desde el navegador no habilita nada, porque los ítems **no tienen
`onClick` ni endpoint detrás**: no existe la funcionalidad que se podría disparar. Mitigación de
diseño: ausencia deliberada de handler (no solo el atributo `disabled`), verificada por el test de
AC-08.

### C5 — Señales de ejemplo (`public/samples/*.csv`, `lib/ecg/samples.ts`, `ExampleLoader`)

| STRIDE | Análisis | Riesgo |
|---|---|---|
| Spoofing | El fetch es mismo-origen y relativo; no hay host externo que suplantar ni certificado que validar | Ninguno |
| Tampering | Los CSV son assets versionados en el repo; alterarlos exige un commit y pasa por PR y CI. En tránsito viajan por el mismo canal (HTTP/S) que el resto del bundle | R-05 (LOW) |
| Repudiation | Descarga de un asset público; nada que repudiar | Ninguno |
| Information Disclosure | Los archivos son públicos por diseño (están en el repo). No exponen datos de ningún usuario | Ninguno |
| Denial of Service | Un usuario podría disparar cargas repetidas de 254 KB; el costo recae sobre su propio navegador y sobre un asset estático cacheable, no sobre el backend | R-06 (LOW) |
| Elevation of Privilege | No aplica | Ninguno |

**R-07 (MEDIUM) — Path traversal / SSRF por construcción de ruta:** si la ruta del `fetch` se
construyera concatenando la selección del usuario (`/samples/${id}.csv`), un id manipulado podría
apuntar a otra ruta del origen. Mitigación **folded into the spec** (Block 5, "Input validation"):
`EXAMPLE_SAMPLES` es una lista blanca con rutas **literales**; `fetchExampleSample(id)` busca el id
en el catálogo y, si no está, devuelve `{ ok: false }` **sin emitir ningún fetch**. Cubierto por el
test "un id fuera del catálogo devuelve ok:false y no dispara ningún fetch".

**R-08 (MEDIUM) — Contenido descargado tratado como confiable:** un CSV servido desde el propio
origen podría estar corrupto o manipulado (p. ej. tras un compromiso del repo) y llegar sin
validar al estado de la app. Mitigación **folded into the spec**: el texto descargado pasa por el
mismo `parseCsv` que "Abrir CSV" (≥2 columnas, rechazo de multicanal, celdas numéricas, filas
consistentes) antes de convertirse en señal; ante un fallo, el store queda en `status: 'error'` sin
señal. Cubierto por el test "si el contenido descargado es inválido, propaga el error del parser
sin dejar señal".

### C6 — `MainPanel` / `EmptyState`

| STRIDE | Análisis | Riesgo |
|---|---|---|
| Spoofing | Sin identidad | Ninguno |
| Tampering | Solo decide qué renderizar según `signal`; no muta estado | Ninguno |
| Repudiation | No aplica | Ninguno |
| Information Disclosure | Muestra la señal que el propio usuario cargó | Ninguno |
| Denial of Service | Sin cómputo propio; delega en `ECGChart` (presupuesto de render intacto, NFR-01) | Ninguno |
| Elevation of Privilege | No aplica | Ninguno |

## Registro de riesgos

| ID | Riesgo | STRIDE | Probabilidad | Impacto | Severidad | Tratamiento |
|---|---|---|---|---|---|---|
| R-01 | El nombre del archivo local queda visible en el encabezado | I | Alta | Bajo | 🟢 LOW | Mitigado: es información que el propio usuario aportó y ve solo él; no se transmite ni se persiste |
| R-02 | Nombre de archivo con markup renderizado en el encabezado (XSS) | T | Baja | Medio | 🟡 MEDIUM | Mitigado: interpolación en JSX (escapado por React); prohibido `dangerouslySetInnerHTML` y usar el nombre para rutas |
| R-03 | La reubicación desactiva en silencio una validación existente | T | Media | Medio | 🟡 MEDIUM | Mitigado: los tests de los componentes reubicados deben quedar verdes **sin modificarse** (criterio de cierre de Block 3) |
| R-04 | Quitar `disabled` de un ítem de menú desde DevTools | T | Baja | Bajo | 🟢 LOW | Mitigado por diseño: no hay handler ni endpoint detrás del ítem; verificado por el test de AC-08 |
| R-05 | Manipulación de los CSV de ejemplo versionados | T | Baja | Bajo | 🟢 LOW | Mitigado: cambiarlos requiere commit + PR + CI; además el contenido se revalida con `parseCsv` (R-08) |
| R-06 | Cargas repetidas del ejemplo más pesado (254 KB) | D | Baja | Bajo | 🟢 LOW | Mitigado: asset estático cacheable, mismo origen; el costo es del propio cliente y no toca el backend |
| R-07 | Path traversal por construir la ruta con la entrada del usuario | T/I | Media | Medio | 🟡 MEDIUM | Mitigado en la spec: lista blanca con rutas literales; id desconocido → sin fetch |
| R-08 | Contenido descargado tratado como confiable | T | Baja | Medio | 🟡 MEDIUM | Mitigado en la spec: el texto pasa por `parseCsv` antes de convertirse en señal |

**Riesgos aceptados sin mitigar (F-TM-04): ninguno.** Los 8 riesgos identificados tienen mitigación
documentada y test asociado en la spec.

## Cadena de suministro (W-TM-01)

No se agrega ninguna dependencia: NFR-02 lo prohíbe y la verificación final de la spec lo comprueba
con `git diff --exit-code src/frontend/package.json`. Los 3 CSV nuevos son datos, no código
ejecutable, y no se cargan como módulos. Superficie de supply chain sin cambios respecto de main.

## Disponibilidad (W-TM-02)

Analizada en C5 (R-06). El único vector es la descarga repetida de un asset estático de ≤ 254 KB
desde el mismo origen; no afecta al backend .NET ni comparte cuota con
`POST /api/filters/apply`, cuyo límite de 500.000 muestras (FEAT-007b) sigue siendo la mitigación
vigente de ese endpoint.

## Mitigaciones a incorporar en la spec

Todas ya están reflejadas en `docs/daw/specs/spec-FEAT-009.md`:

1. **Block 5 — "Input validation":** lista blanca `EXAMPLE_SAMPLES` con rutas literales;
   `fetchExampleSample` no emite fetch para un id desconocido (R-07).
2. **Block 5 — "Input validation" / "Error handling":** el contenido descargado pasa por `parseCsv`
   antes de convertirse en señal; ante fallo, `status: 'error'` sin señal parcial (R-08, AC-09).
3. **Block 2 — "Input validation":** `fileName` se renderiza escapado por JSX, sin
   `dangerouslySetInnerHTML` y sin usarlo para construir rutas (R-02).
4. **Block 3 — "Completion criterion":** los tests de los componentes reubicados deben quedar
   verdes sin modificarse, para que ninguna validación existente se pierda en el refactor (R-03).
5. **Block 4 — "Logic":** los ítems deshabilitados se implementan sin handler, no solo con el
   atributo `disabled` (R-04, AC-08).

## Verificación de reglas (§3 de validation-rules)

| Regla | Estado | Nota |
|---|---|---|
| F-TM-01 | ✅ | Los 6 componentes (C1–C6) analizados con las 6 categorías STRIDE |
| F-TM-02 | ✅ | 3 límites de confianza declarados (TB-1 nuevo/reforzado, TB-2 nuevo, TB-3 preexistente) |
| F-TM-03 | ✅ | Los 8 riesgos tienen mitigación documentada |
| F-TM-04 | ✅ | No hay riesgos aceptados sin mitigar |
| F-TM-05 | ✅ | Datos clasificados: señales de ejemplo (público), señal del usuario (no sensible), nombre de archivo (metadato); sin PII ni credenciales |
| F-TM-06 | ✅ | Referencia componentes, rutas y bloques concretos de la spec |
| F-TM-07 | ✅ | No aplica: no hay datos PII ni credenciales |
| W-TM-01 | ✅ | Cadena de suministro analizada: sin dependencias nuevas |
| W-TM-02 | ✅ | Disponibilidad analizada en C5/R-06 |

**Resultado: PASSED** — 0 riesgos CRITICAL, 0 HIGH, 4 MEDIUM mitigados, 4 LOW mitigados.
