# Spec FEAT-009: Interfaz gráfica según referencia visual (docs/UI/)

| Field | Value |
|-------|-------|
| Ticket | FEAT-009 |
| PRD | docs/daw/prd/prd-FEAT-009.md |
| Tier | FEATURE |
| Date | 2026-08-26 |
| Spec loops | 0 |

## Summary

Se reemplaza el stack vertical de `App.tsx` por un shell de dos columnas — sidebar oscuro fijo
(`components/layout/`) + panel de contenido claro — que reagrupa los componentes ya existentes
(`ChartToolbar`, `FilterPanel`, `CsvUpload`, `ECGChart`, `MetricsPanel`, `MarkerList`,
`MarkerForm`) sin tocar su lógica: solo cambian el árbol de montaje y los contenedores de layout
(`mx-auto max-w-*` deja de aplicar bajo el sidebar). Se agrega el encabezado del panel principal
(nombre de archivo + duración), los ítems de menú de RF-12/13/15 en estado deshabilitado, y la
función "Cargar ejemplo", que sirve los 3 CSV de `ECGSamples/CSV/` como assets estáticos de Vite
desde `src/frontend/public/samples/` y los carga por el mismo camino de parseo que "Abrir CSV".
El Canvas 2D de `ECGChart` y los módulos de `components/render/` no se modifican (Principio V,
NFR-01).

## Coverage: PRD → blocks

| Requirement | Covered by |
|---|---|
| FR-01 | Block 1 |
| FR-02 | Block 4 |
| FR-03 | Block 3 |
| FR-04 | Block 3 |
| FR-05 | Block 6 |
| FR-06 | Block 6 |
| FR-07 | Block 5 (control y carga), Block 4 (entrada de menú), Block 6 (botón del estado vacío) |
| FR-08 | Block 4 |
| FR-09 | Block 2 |
| NFR-01 | Estrategia: ni `ECGChart.tsx` (cuerpo del componente, refs, efectos de dibujo) ni `components/render/*` se modifican. Lo único que cambia en `ECGChart.tsx` son las clases del contenedor externo (`mx-auto max-w-3xl` → ancho del panel). El presupuesto de render (RNF-01/RNF-02 del PRD maestro) queda intacto porque no se toca ninguna ruta de dibujo. Verificado por el test de Block 3 que exige `ECGChart.test.tsx` y `render/*.test.ts` verdes sin cambios. |
| NFR-02 | Estrategia: todo el estilado se hace con utilidades de Tailwind CSS v4 (ya configurado vía `@tailwindcss/vite`) y con los primitivos existentes de `src/frontend/src/components/ui/`. No se agrega ninguna dependencia: `package.json` no cambia. Verificado en la verificación final con `git diff --exit-code src/frontend/package.json`. |
| NFR-03 | Estrategia: los 3 CSV se copian a `src/frontend/public/samples/` y Vite los sirve como assets estáticos; la carga es un único `fetch` de un archivo local (máx. 254.711 bytes) sin transformación intermedia ni round-trip al backend, seguido del mismo `parseCsv` síncrono que ya usa "Abrir CSV". Se agrega un test de guarda que falla si algún archivo de `public/samples/` supera los 260 KB, para que una regeneración futura no rompa el presupuesto en silencio. |

## Dependencies between blocks

Orden de ejecución: **1 → 2 → 3 → 4 → 5 → 6**.

- **Block 1** no depende de nada: crea el shell (`AppLayout`, `Sidebar`, `SidebarSection`).
- **Block 2** depende de Block 1: `TopBar` se monta dentro de `AppLayout`.
- **Block 3** depende de Block 1: los controles existentes se montan dentro de `SidebarSection`.
- **Block 4** depende de Block 1 y Block 3: agrega la sección "Archivo" usando el mismo
  `SidebarSection`, y reubica `CsvUpload` reposicionado en Block 3.
- **Block 5** depende de Block 4: `ExampleLoader` se monta como entrada de la sección "Archivo".
- **Block 6** depende de Block 5: el estado vacío del panel principal reutiliza el `ExampleLoader`
  de Block 5, y el estado con señal reubica `ECGChart` + `MetricsPanel` ya ajustados en Block 3.

## Decisiones de diseño (resueltas antes de implementar)

1. **Fuente de verdad de los CSV de ejemplo.** `ECGSamples/CSV/` (raíz del repo) es la fuente
   canónica de los archivos; `src/frontend/public/samples/` es una **copia versionada** que existe
   porque Vite solo sirve estáticamente lo que está bajo `public/`. La relación se documenta en
   `src/frontend/public/samples/README.md`, que indica que cualquier cambio se hace primero en
   `ECGSamples/CSV/` y luego se re-copia. No se automatiza la copia con un script de build para no
   agregar un paso de build nuevo (NFR-02, "Dependencies" de `AGENTS.md`).
2. **Error de red al traer un ejemplo.** Se **reutiliza** `setError('read-error')` en vez de agregar
   una variante nueva a la unión `SignalError` (`signalStore.ts:13`): el mensaje al usuario es el
   mismo ("No se pudo leer el archivo. Intente nuevamente.") y agregar un miembro obligaría a tocar
   el `switch` exhaustivo de mapeo de mensajes sin ganancia funcional. Queda documentado en el
   comentario de `SignalError` y en el mapeo compartido.
3. **`ExampleLoader` es un `<select>` nativo** con `aria-label="Cargar ejemplo"`, siguiendo el
   patrón de `FilterPanel.tsx:199-212` y no un menú custom: preserva accesibilidad y testabilidad
   sin dependencias nuevas.
4. **`SidebarSection` usa `<details>`/`<summary>` nativos**, el mismo patrón ya probado en
   `MarkerList.tsx:36-76`, en vez de un mecanismo de estado propio.
5. **"Desplazar" (pan) no existe en la app.** La unión `ChartTool` de `viewStore.ts` es
   `'none' | 'zoom' | 'mark' | 'ruler' | 'crop'`: no hay herramienta de desplazamiento
   implementada, y el PRD deja fuera de alcance modificar la lógica de las herramientas. Por lo
   tanto "Desplazar" se renderiza en la sección "Herramientas" **visible pero deshabilitado**, con
   el mismo tratamiento que los ítems de RF-12/13/15 (Block 4), y queda anotado en
   `docs/BACKLOG.md` como funcionalidad futura.

## Block 1 — Shell de layout (sidebar + panel principal)

**Files**
- `src/frontend/src/components/layout/AppLayout.tsx` (new) — shell de dos columnas: `<aside>` con
  el sidebar fijo y `<main>` con el panel de contenido; recibe `sidebar` y `children` como props.
- `src/frontend/src/components/layout/Sidebar.tsx` (new) — columna oscura con el título
  "ECGViewer" y los `SidebarSection` que reciba por `children`.
- `src/frontend/src/components/layout/SidebarSection.tsx` (new) — sección colapsable
  (`<details>`/`<summary>`, patrón de `MarkerList.tsx:36-76`); props: `title: string`,
  `defaultOpen?: boolean`, `children`.
- `src/frontend/src/components/layout/AppLayout.test.tsx` (new) — tests del shell.
- `src/frontend/src/components/layout/SidebarSection.test.tsx` (new) — tests de la sección.
- `src/frontend/src/App.tsx` (modified) — pasa a montar `AppLayout` con `Sidebar` en vez del stack
  vertical; las tres secciones se agregan vacías aquí y se llenan en Blocks 3 y 4.
- `src/frontend/src/App.test.tsx` (modified) — el smoke actual asume el stack plano (heading
  `ECGViewer`, `aria-label`s accesibles sin abrir secciones); se actualiza para el shell nuevo,
  abriendo las secciones cuando haga falta.

**Logic**

`AppLayout` renderiza `<div class="flex h-screen">` con `<aside>` (ancho fijo, fondo oscuro) y
`<main class="flex-1 overflow-auto">`. `Sidebar` renderiza el título de la app y sus `children`.
`SidebarSection` renderiza `<details>` con `<summary>{title}</summary>` y el contenido debajo;
`defaultOpen` mapea al atributo `open`. Ningún componente de este bloque conoce los stores: son
puramente estructurales. `sidebar` es una prop **requerida** de `AppLayout`: omitirla no es un
error de runtime posible, porque el typecheck estricto (`tsc --noEmit`) no compila sin ella.

En `App.tsx` las secciones se crean con los títulos "Archivo", "Herramientas" y "Filtros"
(`defaultOpen` en las tres, para que la captura de referencia se reproduzca con todo desplegado);
los componentes existentes se siguen montando en el panel principal en este bloque y se reubican en
Blocks 3, 4 y 6.

**Input validation**

No aplica: este bloque no recibe entrada del usuario más allá del toggle nativo de `<details>`,
cuyo dominio de valores lo controla el navegador.

**Error handling**

- `SidebarSection` sin `children`: renderiza la sección vacía (solo el `<summary>`) sin lanzar.
  No hay estado de error posible en componentes estructurales.

**Required tests**
- [ ] `AppLayout — renderiza el sidebar y el panel principal en un shell de dos columnas` —
  valida AC-01.
- [ ] `App — muestra las tres secciones del sidebar ("Archivo", "Herramientas", "Filtros")` —
  valida AC-01.
- [ ] `SidebarSection — sin children renderiza el título sin lanzar` — sad path del error
  documentado (sección vacía).
- [ ] `SidebarSection — colapsa y despliega su contenido con el toggle nativo` — comportamiento
  base del patrón `<details>`.

**Completion criterion**

`npm test` verde con `AppLayout.test.tsx`, `SidebarSection.test.tsx` y el `App.test.tsx`
actualizado; `npm run build` (que corre `tsc --noEmit`) sin errores; la app monta el shell de dos
columnas y ningún test preexistente de `components/` queda en rojo.

## Block 2 — Encabezado del panel principal (nombre de archivo + duración)

**Files**
- `src/frontend/src/components/layout/TopBar.tsx` (new) — encabezado del panel principal: título
  "Trazado ECG", nombre del archivo cargado (o "sin archivo") y duración de la señal.
- `src/frontend/src/components/layout/TopBar.test.tsx` (new) — tests del encabezado.
- `src/frontend/src/lib/ecg/duration.ts` (new) — `signalDurationSeconds(signal): number | null`.
- `src/frontend/src/lib/ecg/duration.test.ts` (new) — tests del cálculo de duración.
- `src/frontend/src/state/signalStore.ts` (modified) — agrega `fileName: string | null` al estado y
  un parámetro opcional `fileName` a `loadFromText(text, fileName?)`; `reset()` lo vuelve a `null`.
- `src/frontend/src/state/signalStore.test.ts` (modified) — cubre el campo nuevo.
- `src/frontend/src/components/CsvUpload.tsx` (modified) — pasa `file.name` a `loadFromText`.
- `src/frontend/src/components/layout/AppLayout.tsx` (modified) — monta `TopBar` arriba del
  contenido del panel principal.

**Logic**

`signalDurationSeconds` devuelve `samples[n-1].t - samples[0].t` si hay ≥2 muestras, y `null` si no.
`TopBar` lee `signal` y `fileName` de `signalStore`: muestra `fileName ?? 'sin archivo'` y la
duración formateada con un decimal seguida de `s`, o `—` cuando `signalDurationSeconds` devuelve
`null`. El campo `fileName` se agrega al store porque hoy el nombre del archivo solo vive en el
`File` local de `CsvUpload` y el encabezado no tiene forma de conocerlo (FR-09).

**Data model**

No hay esquema persistido. Cambio en el estado en memoria de `signalStore` (Zustand):

| Campo | Tipo | Constraint | Default |
|---|---|---|---|
| `fileName` | `string \| null` | nullable; `null` = ninguna señal cargada o carga sin nombre | `null` |

`loadFromText(text: string, fileName?: string)`: el segundo parámetro es opcional para no romper a
los llamadores existentes (`signalStore.test.ts`); cuando se omite, `fileName` queda en `null`.
Únicos llamadores en el código: `CsvUpload.tsx` (se actualiza aquí) y `ExampleLoader.tsx`
(Block 5). No hay barrel/`index.ts` que actualizar.

**Input validation**

`fileName` se toma de `File.name`, controlado por el navegador. Se renderiza como texto en JSX
(escapado por React, sin `dangerouslySetInnerHTML`), por lo que un nombre con caracteres de markup
no puede inyectar HTML. No se usa para construir rutas ni para ninguna operación de filesystem.

**Error handling**

- Señal con menos de 2 muestras (duración indefinida): `signalDurationSeconds` devuelve `null` y
  `TopBar` muestra `—` en lugar de `NaN`.
- Señal cargada sin nombre de archivo (`loadFromText` invocado sin `fileName`): `TopBar` muestra
  "sin archivo" en vez de un espacio vacío.
- Error de carga (`status === 'error'`): `TopBar` vuelve a "sin archivo" y duración `—`, porque
  `setError` deja `signal` en `null`.

**Required tests**
- [ ] `TopBar — con señal cargada muestra el nombre del archivo y la duración` — valida AC-10.
- [ ] `TopBar — sin señal cargada muestra "sin archivo"` — valida AC-10 y el sad path "sin nombre".
- [ ] `TopBar — con una señal de menos de 2 muestras muestra "—" como duración` — sad path
  "duración indefinida".
- [ ] `TopBar — tras un error de carga vuelve a "sin archivo"` — sad path "error de carga".
- [ ] `duration — devuelve la diferencia entre la última y la primera muestra` — happy path del
  helper.
- [ ] `signalStore — loadFromText guarda fileName y reset lo limpia` — contrato del campo nuevo.

**Completion criterion**

`npm test` verde incluyendo los 6 tests anteriores y `CsvUpload.test.tsx` sin cambios de
comportamiento; el encabezado muestra `ECG_20_Seg_FILTRADO.csv · 20.0 s` tras cargar ese archivo.

## Block 3 — Secciones "Herramientas" y "Filtros" del sidebar

**Files**
- `src/frontend/src/App.tsx` (modified) — mueve `ChartToolbar` dentro de `SidebarSection`
  "Herramientas" y `FilterPanel` dentro de `SidebarSection` "Filtros"; `ECGChart`, `MetricsPanel`,
  `MarkerList` y `MarkerForm` quedan en el panel principal.
- `src/frontend/src/components/ChartToolbar.tsx` (modified) — solo `className`: `mx-auto flex
  max-w-3xl items-center gap-2` → disposición vertical a ancho del sidebar. Sin cambios de lógica
  ni de `aria-label`.
- `src/frontend/src/components/FilterPanel.tsx` (modified) — solo `className` (línea 196): quita
  `mx-auto max-w-3xl` y adapta el formulario al ancho del sidebar. Sin cambios de validación ni de
  llamadas al backend.
- `src/frontend/src/components/CsvUpload.tsx` (modified) — solo `className` (línea 102): quita
  `mx-auto max-w-xl`.
- `src/frontend/src/components/MetricsPanel.tsx` (modified) — solo `className` (línea 37): quita
  `mx-auto max-w-3xl` y pasa a disposición de tarjeta vertical (columna derecha, Block 6).
- `src/frontend/src/components/ECGChart.tsx` (modified) — solo `className` de los contenedores
  (líneas 258 y 273): quita `mx-auto max-w-3xl`. **No se toca el cuerpo del componente ni
  `components/render/*`** (NFR-01, Principio V).
- `src/frontend/src/App.test.tsx` (modified) — los controles del sidebar ahora se alcanzan tras
  abrir su sección.

**Logic**

Reubicación pura: los componentes se montan en un contenedor distinto y pierden sus utilidades de
centrado, que existían para una página a ancho completo y bajo el sidebar producen una columna
descentrada. Ni el estado (`viewStore`, `signalStore`), ni los handlers, ni los `aria-label`
cambian, que es lo que garantiza la paridad funcional exigida por AC-11/AC-12.

**Input validation**

No aplica: no se agrega ningún control de entrada nuevo. La validación existente de `FilterPanel`
(rangos, Nyquist, ventana/grado enteros positivos) permanece intacta.

**Error handling**

- Sin señal cargada, los controles de `ChartToolbar` y `FilterPanel` siguen deshabilitados por su
  lógica actual (`disabled={!hasSignal}`); reubicarlos no cambia esa condición.
- Un filtro inválido sigue mostrando el mensaje de validación de `FilterPanel` dentro de la sección
  "Filtros"; el `role="alert"` de error de aplicación se conserva.
- Sección "Herramientas" colapsada con una herramienta activa: la herramienta sigue activa
  (`viewStore.activeTool` no depende del montaje del `<summary>`), no se desactiva en silencio.

**Required tests**
- [ ] `App — la sección "Herramientas" contiene Rejilla, Zoom, Restablecer zoom, Regla, Recorte y
  Marcar` — valida AC-03.
- [ ] `App — la sección "Filtros" contiene el selector de tipo de filtro y sus controles` —
  valida AC-04.
- [ ] `App — activar Zoom desde el sidebar deja activeTool en 'zoom' igual que antes` —
  valida AC-11.
- [ ] `App — aplicar un filtro desde el sidebar invoca el mismo flujo de signalStore.applyFilter` —
  valida AC-12.
- [ ] `App — sin señal cargada, los controles de filtro del sidebar están deshabilitados` — sad
  path "sin señal".
- [ ] `App — con la sección "Herramientas" colapsada, la herramienta activa se mantiene` — sad
  path "sección colapsada".
- [ ] `FilterPanel — un rango de corte inválido sigue mostrando el mensaje de validación` — sad
  path "filtro inválido" (test existente que debe seguir verde).

**Completion criterion**

`npm test` verde con `ChartToolbar.test.tsx`, `FilterPanel.test.tsx`, `CsvUpload.test.tsx`,
`MetricsPanel.test.tsx`, `ECGChart.test.tsx` y `render/*.test.ts` **sin modificaciones en esos
archivos de test** (prueba de que solo cambió el layout), más los tests nuevos de `App.test.tsx`.

## Block 4 — Sección "Archivo": acciones habilitadas y deshabilitadas

**Files**
- `src/frontend/src/components/layout/FileSection.tsx` (new) — contenido de la sección "Archivo":
  "Abrir CSV" (monta `CsvUpload`), el hueco donde Block 5 monta "Cargar ejemplo", y los ítems
  deshabilitados "Importar XLSX", "Guardar", "Guardar como CSV", "Exportar XLSX".
- `src/frontend/src/components/layout/FileSection.test.tsx` (new) — tests de la sección.
- `src/frontend/src/components/layout/DisabledMenuItem.tsx` (new) — `<button type="button"
  disabled>` con estilo atenuado y `title` explicativo; se reutiliza también para "Desplazar" en
  la sección "Herramientas".
- `src/frontend/src/App.tsx` (modified) — monta `FileSection` en la sección "Archivo" y agrega el
  ítem deshabilitado "Desplazar" en "Herramientas" (decisión de diseño 5).
- `docs/BACKLOG.md` (modified) — anota "Desplazar (pan)" como herramienta pendiente, y que los
  ítems de RF-12/13/15 ya tienen su lugar reservado en la UI.

**Logic**

`DisabledMenuItem` es un `<button>` nativo con `disabled` y `aria-disabled="true"`, sin `onClick`:
el navegador ya suprime el evento, y la ausencia de handler garantiza que no exista acción alguna
que disparar (AC-08). El `title` indica "No disponible todavía". `FileSection` los lista en el
orden de `UI_Without_any_ECG_Loaded.PNG`: Abrir CSV, Cargar ejemplo, Importar XLSX, Guardar,
Guardar como CSV, Exportar XLSX.

**Input validation**

Los ítems deshabilitados no aceptan entrada. "Abrir CSV" conserva la validación existente de
`CsvUpload`: `accept=".csv,text/csv"`, guardia de tamaño de 25 MB antes de leer, y parseo
validado por `parseCsv` (una sola columna de tiempo + una de amplitud; multicanal rechazado).

**Error handling**

- Clic sobre un ítem deshabilitado: no hay handler ni evento; el estado de la app no cambia y el
  ítem permanece visualmente deshabilitado.
- Error de carga desde "Abrir CSV" (archivo demasiado grande, ilegible, multicanal, no numérico):
  el mensaje lo sigue mostrando `CsvUpload` con su `role="alert"` actual, ahora dentro de la
  sección "Archivo".

**Required tests**
- [ ] `FileSection — muestra "Abrir CSV" y "Cargar ejemplo" habilitados y los cuatro ítems de
  RF-12/13/15 deshabilitados` — valida AC-02.
- [ ] `FileSection — un clic sobre un ítem deshabilitado no dispara ninguna acción ni cambia el
  estado` — valida AC-08 y el sad path "clic en ítem deshabilitado".
- [ ] `FileSection — un CSV multicanal muestra el mensaje de error dentro de la sección` — sad
  path "error de carga".
- [ ] `App — la sección "Herramientas" incluye "Desplazar" deshabilitado` — decisión de diseño 5.

**Completion criterion**

`npm test` verde con `FileSection.test.tsx`; la sección "Archivo" reproduce los 6 ítems de
`UI_Without_any_ECG_Loaded.PNG` con exactamente 2 habilitados; `docs/BACKLOG.md` actualizado.

## Block 5 — Señales de ejemplo: assets estáticos y `ExampleLoader`

**Files**
- `src/frontend/public/samples/ECG_20_Seg_FILTRADO.csv` (new) — copia de `ECGSamples/CSV/`.
- `src/frontend/public/samples/ECG_20_Seg_NO_FILTRADO.csv` (new) — copia de `ECGSamples/CSV/`.
- `src/frontend/public/samples/ECG_20_Seg_ESPANTOSO.csv` (new) — copia de `ECGSamples/CSV/`.
- `src/frontend/public/samples/README.md` (new) — documenta que `ECGSamples/CSV/` es la fuente de
  verdad y esta carpeta su copia servible (decisión de diseño 1).
- `src/frontend/src/lib/ecg/samples.ts` (new) — catálogo `EXAMPLE_SAMPLES` (lista blanca de id,
  etiqueta y ruta) y `fetchExampleSample(id)`.
- `src/frontend/src/lib/ecg/samples.test.ts` (new) — tests del catálogo, del fetch y del guardia
  de tamaño (NFR-03).
- `src/frontend/src/lib/ecg/signalErrorMessage.ts` (new) — mapeo `SignalError → string`, extraído
  tal cual de `CsvUpload.tsx` para que `CsvUpload` y `ExampleLoader` usen los mismos textos.
- `src/frontend/src/components/ExampleLoader.tsx` (new) — `<select aria-label="Cargar ejemplo">`
  nativo con las 3 opciones; al elegir una, hace el fetch y llama a `loadFromText`.
- `src/frontend/src/components/ExampleLoader.test.tsx` (new) — tests del control.
- `src/frontend/src/components/CsvUpload.tsx` (modified) — importa `signalErrorMessage` en vez de
  su función local (sin cambio de textos ni de comportamiento).
- `src/frontend/src/components/layout/FileSection.tsx` (modified) — monta `ExampleLoader` en el
  hueco reservado en Block 4.

**Logic**

`EXAMPLE_SAMPLES` es un arreglo constante de `{ id, label, path }` con los 3 ejemplos; `path` es
literal (`/samples/<archivo>.csv`), nunca construido concatenando la entrada del usuario.
`fetchExampleSample(id)` busca el id en el catálogo, hace `fetch(path)` y devuelve
`{ ok: true, text }` o `{ ok: false }`. `ExampleLoader` deshabilita el `select` mientras carga,
llama a `loadFromText(text, fileName)` en el caso exitoso y a `setError('read-error')` en el
fallido (decisión de diseño 2). Tras cargar, el `select` vuelve a su opción placeholder.

**API contract**

No se crea ni modifica ningún endpoint del backend. El único acceso a red es un `GET` a un asset
estático servido por el mismo origen del frontend:

- Método + ruta: `GET /samples/{ECG_20_Seg_FILTRADO|ECG_20_Seg_NO_FILTRADO|ECG_20_Seg_ESPANTOSO}.csv`
- Request: sin body ni parámetros; la ruta sale de la lista blanca `EXAMPLE_SAMPLES`.
- Response: `text/csv` (el contenido del archivo, ≤ 254.711 bytes).
- Códigos de error: cualquier respuesta con `res.ok === false` (404, 5xx) o un rechazo de la
  promesa (fallo de red) se trata como un único caso de fallo → `read-error`.
- Auth: ninguna. La app es de libre acceso (`AGENTS.md`) y los archivos son assets públicos de
  build, no datos de negocio.

**Input validation**

- La única entrada del usuario es el `value` del `<select>`, restringido a los 3 ids del catálogo.
  `fetchExampleSample` valida contra la lista blanca: un id desconocido devuelve
  `{ ok: false }` sin emitir ningún `fetch`, de modo que no hay concatenación de entrada en la
  ruta (sin superficie de path traversal).
- El contenido descargado no se considera confiable por venir del propio origen: pasa por el mismo
  `parseCsv` que "Abrir CSV" (≥2 columnas, rechazo de multicanal, celdas numéricas, filas
  consistentes) antes de convertirse en señal.
- Tamaño: cada archivo del catálogo debe pesar ≤ 260 KB (NFR-03), verificado por test.

**Error handling**

- `fetch` rechazado o `res.ok === false`: `setError('read-error')` → mensaje "No se pudo leer el
  archivo. Intente nuevamente."; `setError` deja `signal` en `null`, con lo cual no queda ninguna
  señal parcialmente cargada (AC-09).
- Contenido descargado inválido para `parseCsv` (p. ej. un archivo corrupto): el error del parser
  se registra igual que en "Abrir CSV" y el store queda en `status: 'error'` sin señal.
- Id fuera del catálogo (no alcanzable desde la UI, sí desde un llamado directo):
  `fetchExampleSample` devuelve `{ ok: false }` sin hacer red.

**Required tests**
- [ ] `ExampleLoader — al elegir un ejemplo, lo carga y grafica por el mismo flujo que "Abrir CSV"`
  — valida AC-07 (fetch mockeado; sin llamadas de red reales).
- [ ] `ExampleLoader — ofrece exactamente las 3 señales del catálogo` — valida AC-07.
- [ ] `ExampleLoader — si el fetch falla, muestra el mensaje de error y no deja señal cargada` —
  valida AC-09 y el sad path "fetch fallido".
- [ ] `ExampleLoader — si el contenido descargado es inválido, propaga el error del parser sin
  dejar señal` — sad path "contenido inválido".
- [ ] `samples — un id fuera del catálogo devuelve ok:false y no dispara ningún fetch` — sad path
  "id desconocido".
- [ ] `samples — cada archivo de public/samples pesa ≤ 260 KB` — guarda de NFR-03.

**Completion criterion**

`npm test` verde con `ExampleLoader.test.tsx` y `samples.test.ts`; elegir cualquiera de los 3
ejemplos en la app carga y grafica la señal, y `CsvUpload.test.tsx` sigue verde sin cambios tras
la extracción de `signalErrorMessage`.

## Block 6 — Panel principal: estado vacío y estado con señal

**Files**
- `src/frontend/src/components/layout/MainPanel.tsx` (new) — decide entre el estado vacío y el
  estado con señal según `signalStore.signal`; en el estado con señal dispone `ECGChart` a la
  izquierda y `MetricsPanel` como tarjeta a la derecha, con `MarkerList` y `MarkerForm` debajo.
- `src/frontend/src/components/layout/EmptyState.tsx` (new) — mensaje de instrucción + el
  `ExampleLoader` de Block 5 destacado como call-to-action.
- `src/frontend/src/components/layout/MainPanel.test.tsx` (new) — tests de ambos estados.
- `src/frontend/src/components/layout/EmptyState.test.tsx` (new) — tests del estado vacío.
- `src/frontend/src/App.tsx` (modified) — monta `MainPanel` como contenido de `AppLayout`.
- `src/frontend/src/App.test.tsx` (modified) — smoke actualizado a los dos estados.

**Logic**

`MainPanel` lee `signal` de `signalStore`: si es `null` renderiza `EmptyState`; si no, un grid de
dos columnas con `ECGChart` (columna ancha) y `MetricsPanel` (tarjeta "Métricas" con BPM, SDNN,
RMSSD y pNN50, columna angosta), y debajo `MarkerList` + `MarkerForm`. La lógica de cálculo de
métricas no cambia: `MetricsPanel` sigue devolviendo `null` cuando no hay ventana visible, y ese
caso lo cubre el propio `MainPanel` mostrando la tarjeta vacía en vez de un hueco.

**Input validation**

No aplica: `MainPanel` y `EmptyState` no reciben entrada; delegan en `ExampleLoader` (Block 5) y
en `CsvUpload` (Block 4), que ya la validan.

**Error handling**

- `signal === null` (estado inicial o tras un error): se muestra `EmptyState` con la instrucción y
  el call-to-action, nunca un panel vacío sin explicación.
- Señal cargada pero sin ventana visible (`visibleWindow === null`): `MetricsPanel` devuelve
  `null`; `MainPanel` reserva la columna con la tarjeta "Métricas" vacía para que el layout no
  salte.
- `status === 'error'`: prevalece el estado vacío (porque `signal` quedó en `null`) y el mensaje de
  error lo sigue mostrando el componente que originó la carga.

**Required tests**
- [ ] `MainPanel — sin señal muestra el estado vacío con el mensaje y "Cargar ejemplo"` — valida
  AC-05.
- [ ] `MainPanel — con señal muestra el trazado y la tarjeta "Métricas" con BPM, SDNN, RMSSD y
  pNN50` — valida AC-06.
- [ ] `MainPanel — con señal pero sin ventana visible mantiene la columna de métricas sin romper el
  layout` — sad path "sin ventana visible".
- [ ] `MainPanel — tras un error de carga vuelve al estado vacío` — sad path "error de carga".
- [ ] `EmptyState — el botón "Cargar ejemplo" ofrece las 3 señales de ejemplo` — valida AC-05 y su
  enlace con FR-07.

**Completion criterion**

`npm test` verde con `MainPanel.test.tsx` y `EmptyState.test.tsx`; la app sin señal reproduce
`UI_Without_any_ECG_Loaded.PNG` y con señal cargada reproduce `UI_With_ECG_Loaded.PNG` en
estructura (sidebar, encabezado, trazado, tarjeta de métricas, paneles inferiores).

## Rollback (W-SPEC-03)

No hay cambios de esquema ni migraciones de datos: la persistencia (RF-15) sigue fuera de alcance y
el estado de la app es volátil. El rollback es revertir el merge del PR; los únicos artefactos
nuevos fuera de `src/frontend/src/` son los 3 CSV copiados a `src/frontend/public/samples/`, que
desaparecen con el revert sin dejar estado residual.

## Final verification

1. `npm run lint`, `npm run build` (incluye `tsc --noEmit`) y `npm test` verdes en `src/frontend`.
2. `dotnet test` verde en `src/backend` (no se toca el backend; sirve de control de no regresión).
3. Los 12 AC del PRD tienen al menos un test que los nombra (AC-01 a AC-12).
4. `git diff --exit-code src/frontend/package.json` sin cambios → ninguna dependencia nueva
   (NFR-02).
5. `src/frontend/src/components/render/` y el cuerpo de `ECGChart.tsx` sin cambios funcionales:
   solo `className` de contenedores (NFR-01).
6. Cada archivo de `src/frontend/public/samples/` pesa ≤ 260 KB (NFR-03).
7. La app, comparada contra `UI_Without_any_ECG_Loaded.PNG` y `UI_With_ECG_Loaded.PNG`, reproduce
   sidebar con las 3 secciones, encabezado con archivo y duración, estado vacío con call-to-action,
   y estado cargado con trazado + tarjeta de métricas.
