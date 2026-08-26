# Backlog

Pendientes conocidos de ECGViewer que todavía no se convirtieron en tickets DAW. No confundir con
`docs/daw/`, que es namespace exclusivo de los artefactos que produce el pipeline (PRDs, specs,
RCAs, reportes) — este archivo es libre, de mantenimiento manual.

## Requisitos funcionales del PRD maestro sin implementar

- **RF-12** — Exportar la señal cargada a un archivo Excel (`.xlsx`).
- **RF-13** — Importar una señal desde un archivo Excel (`.xlsx`).
- **RF-15** — Persistir cambios (marcadores, filtros, recortes) solo al presionar "Guardar"
  explícitamente (implica el backend con SQLite para estudios guardados).

Desde FEAT-009 (Block 4) los tres ya tienen **su lugar reservado en la UI**: la sección "Archivo"
del sidebar muestra "Importar XLSX" (RF-13), "Guardar" (RF-15), "Guardar como CSV" y "Exportar
XLSX" (RF-12) como ítems visibles pero deshabilitados (`components/layout/DisabledMenuItem.tsx`,
sin handler asociado). Implementar cada RF implica reemplazar su `DisabledMenuItem` por el control
real; no hay que agregar entradas de menú nuevas.

`ClosedXML` y `Microsoft.Data.Sqlite` ya están documentados en `AGENTS.md` como dependencias
previstas para este trabajo, pero ningún `.csproj` los referencia todavía. Candidato a splitear en
sub-tickets (export xlsx / import xlsx / persistencia SQLite son bastante independientes entre sí),
como se hizo con FEAT-007 → FEAT-007a/b.

## Deuda técnica y gaps de proceso

- **Cobertura de tests de renderizado del gráfico ECG.** Las ACs de performance (≥10fps, frame
  <100ms) se validan hoy de forma manual/informal por ticket, sin un harness automatizado
  repetible para las funciones de dibujo en Canvas.
- **Migrar documentación de pendientes desde "modulo4"** a este repo (destino y contenido exacto a
  definir con el usuario cuando se retome).
- **CI**: no existe ningún workflow en `.github/workflows/`. Falta al menos un job que corra
  typecheck/lint/test de `src/frontend` (y `dotnet test` de `src/backend`) en cada push/PR.
- **CD a GitHub Pages**: deploy del build de `src/frontend` a GitHub Pages. Puede construirse sobre
  el CI una vez que exista.
- **Regla — tooltip Δt/ΔmV**: falta más separación vertical/horizontal entre las dos líneas del
  tooltip (`drawOverlay.ts`, `drawRuler`) y reducir un poco el tamaño de fuente actual (20px, subido
  desde 10px en FIX-003) — confirmar el tamaño objetivo exacto con el usuario antes de implementar.
- **Límite de 500.000 muestras en `POST /api/filters/apply`** (FEAT-007b): mitigación temporal de un
  riesgo HIGH de DoS aceptada en el threat model. Deberá ampliarse/revisarse a futuro; evaluar si
  conviene hacerlo configurable (env var / `appsettings`) en vez de una constante hardcodeada.
- **`AppLayout` dejó de ser un shell agnóstico del estado** porque monta `TopBar`, que lee
  `signalStore` (lo prescribe la spec de FEAT-009, Block 2). Refactor candidato al cerrar FEAT-009:
  montar `TopBar` desde `App.tsx` o desde `MainPanel`, para que el shell vuelva a ser testeable sin
  stores.
- **Validación de rango invertido de `FilterPanel` sin cobertura.** El mensaje
  `'La frecuencia baja debe ser menor que la alta.'` (`FilterPanel.tsx:104`) no lo ejercita ningún
  test: se puede borrar entero y la suite sigue verde. No se corrige en FEAT-009 porque el criterio
  de cierre del Block 3 exige que `FilterPanel.test.tsx` quede sin modificar. Candidato a QUICK-FIX
  posterior.
- **Herramienta "Desplazar" (pan) inexistente.** La referencia visual
  (`docs/UI/UI_Without_any_ECG_Loaded.PNG`) la lista entre las herramientas y el PRD de FEAT-009 la
  nombra en AC-03, pero la app no tiene implementación de desplazamiento: la unión
  `ChartTool` de `viewStore.ts` es `'none' | 'zoom' | 'mark' | 'ruler' | 'crop'`. FEAT-009 la
  renderiza **visible pero deshabilitada** en la sección "Herramientas" (decisión de diseño 5 de
  `docs/daw/specs/spec-FEAT-009.md`), porque ese PRD deja fuera de alcance modificar la lógica de
  las herramientas. Queda como funcionalidad futura: agregar el miembro `'pan'` a `ChartTool`, el
  arrastre sobre el Canvas y el reemplazo del `DisabledMenuItem` por un toggle real.

- **Los filtros deben vivir en el panel central, no en el sidebar** (decisión de producto tomada,
  según la referencia visual `docs/UI/UI_With_ECG_Loaded.PNG`). FEAT-009 los deja en el sidebar
  porque así lo mandan su FR-04/AC-04; el traslado se hará en un ticket **FEAT-010** con su propio
  PRD, que sacará `FilterPanel` del sidebar y lo llevará al panel principal como tarjeta
  "Filtro digital".

- **Los ítems deshabilitados salen del orden de foco.** `DisabledMenuItem` usa `<button disabled>`,
  que es inalcanzable por teclado: para quien navega con tabulador o lector de pantalla, esos ítems
  no existen. Si la intención de FR-08 es _anunciar_ funcionalidad futura, el patrón correcto sería
  `aria-disabled="true"` **sin** `disabled` (focusable, sin handler, sin activación). Decisión de
  producto pendiente.
- **`title="No disponible todavía"` no es un mecanismo accesible.** No se anuncia de forma fiable en
  lectores de pantalla y no es alcanzable por teclado ni en táctil. Debería reemplazarse por texto
  visible o por `aria-describedby` apuntando a un texto real.
- **Diferencias con la referencia visual pendientes de resolver** (candidatas a FEAT-010): la app
  rotula "Recorte" y `docs/UI/UI_Without_any_ECG_Loaded.PNG` rotula "Recortar"; el orden de las
  herramientas difiere (la referencia: Rejilla / Zoom / Restablecer / Desplazar / Regla / Recortar /
  Marcar); y la referencia muestra un selector **"Velocidad 25 mm/s"** en la barra superior que no
  existe en la app ni está especificado en ningún bloque de la spec de FEAT-009.
- **`accept=".csv,text/csv"` de `CsvUpload.tsx` sin cobertura.** Ningún test lo asevera: se puede
  borrar y la suite sigue verde. Gap preexistente en `main`, no una regresión de FEAT-009.
- **El alert de `CsvUpload` es del store, no del control que originó el fallo.**
  `CsvUpload.tsx:116` renderiza el error del `signalStore` de forma incondicional, y `CsvUpload`
  está siempre montado en el sidebar: cualquier fallo de carga lo anuncia él, lo haya originado o
  no. FEAT-009 lo fue conteniendo caso por caso pasando `showError={false}` a los `ExampleLoader`
  que conviven con él — el de la sección "Archivo" (Block 5) y el del `EmptyState` (Block 6,
  `components/layout/EmptyState.tsx`) —, así que hoy **no hay duplicado**: hay un único dueño del
  mensaje y un test que lo asevera (`src/App.test.tsx`, "un fallo al cargar un ejemplo desde el
  estado vacío muestra UNA sola alerta"). Lo que sigue vigente es la causa: mientras el alert
  dependa del store y no del origen, cada control nuevo que quiera mostrar errores tendrá que
  apagarse a mano, y basta olvidarlo una vez para volver a tener dos `role="alert"` con el mismo
  texto (`aria-live="assertive"`: el lector de pantalla los anuncia dos veces, interrumpiéndose).
  Tampoco es un problema de un solo camino: el fallo puede originarlo "Abrir CSV" tanto como
  "Cargar ejemplo", y en ambos casos el store queda igual. La solución limpia es acotar el alert de
  `CsvUpload` a los errores que él mismo originó, pero el Block 5 de
  `docs/daw/specs/spec-FEAT-009.md` fija que `CsvUpload` se modifica "sin cambio de textos ni de
  comportamiento", así que no se puede hacer dentro de FEAT-009.
- **La atribución de errores del `ExampleLoader` es por valor y tiene un límite conocido.**
  `ExampleLoader.tsx` decide si una alerta es suya comparando el error actual del store contra el
  `SignalError` que quedó tras su propio intento. Eso distingue tipos distintos (los errores del
  parser son objetos nuevos en cada parseo; `'read-error'` no es igual a `{ kind: 'multichannel' }`),
  pero **dos errores del mismo literal de string son indistinguibles**: si "Abrir CSV" produce su
  propio `'read-error'` (o `'file-too-large'`), el `ExampleLoader` lo toma como propio y lo anuncia.
  La solución de fondo es un contador monótono de mutación en `signalStore` (`errorSeq`/`mutationId`,
  incrementado en `loadFromText`, `setError` y `reset`): el componente guarda el seq de su propia
  carga y compara contra el actual, con lo que el guard queda **derivado** del store y se auto-limpia
  en cualquier transición ajena, incluida `error → error`. Exige tocar `signalStore.ts`, que está
  fuera de la lista de archivos del Block 5 de `docs/daw/specs/spec-FEAT-009.md`, así que queda para
  un ticket propio (el mismo que acote el alert de `CsvUpload` a su propio origen, arriba).
- **Condición de carrera entre instancias de `ExampleLoader`.** El flag `isLoading`
  (`ExampleLoader.tsx`) es estado por instancia: con una sola instancia no hay carrera, porque el
  `disabled` del `<select>` bloquea un segundo cambio mientras carga. Block 6 monta una segunda
  instancia en `EmptyState`, simultánea a la de `FileSection`: deshabilitar una no deshabilita la
  otra, así que pueden convivir dos `fetch` concurrentes y gana el que resuelva último, que puede
  no ser la última elección del usuario. Falta un token de secuencia (o un `AbortController`) que
  descarte el resultado de un intento superado.
- **`fetch` fuera de `lib/api/`.** `src/frontend/src/lib/ecg/samples.ts:68` es el único `fetch` de
  `lib/ecg/`, carpeta que en todo el resto es pura y sin I/O; el acceso a red vive en `lib/api/`.
  No es una desprolijidad de la implementación: la ruta del archivo la prescribe la spec de FEAT-009
  (línea 327), así que moverlo sería desviarse de la spec, no corregirla. Revisar al abrir el
  próximo ticket que toque esa capa.
- **`signalErrorMessage` es presentación viviendo en la capa de dominio.**
  `src/frontend/src/lib/ecg/signalErrorMessage.ts` mapea errores a copy de UI en español e importa
  el tipo `SignalError` desde `@/state/signalStore`, invirtiendo la dirección de dependencia
  habitual (no hay ciclo en runtime porque es `import type`). Su lugar natural sería
  `src/components/` o un `src/lib/ui/`. La ruta también la fija la spec de FEAT-009, por lo que el
  movimiento queda para un ticket propio.
- **`src/frontend/public/samples/README.md` se publica en el build.** Vite no restringe `publicDir`:
  todo lo que está bajo `public/` se copia tal cual, así que ese README queda servible en
  `/samples/README.md` en producción. No expone secretos, pero sí rutas internas del repo y un
  documento de mantenimiento que no tiene por qué ser público. Alternativas: mover la nota a
  `docs/`, o excluir el archivo en el build.
- **Sin guarda de deriva entre `ECGSamples/CSV/` y `src/frontend/public/samples/`.** Hoy los tres
  CSV son byte-idénticos (verificado con `cmp`), pero la copia es manual (decisión de diseño 1 de
  la spec de FEAT-009) y el único test de guarda (`src/frontend/src/lib/ecg/samples.test.ts:39`)
  valida tamaño ≤ 260 KB, no equivalencia: si alguien regenera la fuente de verdad y olvida
  re-copiar, no falla nada y la app sirve la versión vieja en silencio. Una aserción de igualdad de
  bytes (o de hash) entre ambas carpetas cerraría el hueco sin dependencias nuevas ni paso de build.
- **Redacción imprecisa en el threat model de FEAT-009.** `docs/daw/security/threat-FEAT-009.md:114`
  afirma que R-04 queda "verificada por el test de AC-08"; en rigor ningún test conductual puede
  distinguir un `disabled` con `onClick` de uno sin él, porque React no entrega eventos de mouse a
  elementos deshabilitados. La garantía real la dan el tipo de props de `DisabledMenuItem` (no
  admite handlers) y la guarda de compilación `@ts-expect-error` de `FileSection.test.tsx`.
  Corregir la redacción cuando corresponda tocar ese artefacto (es de PLAN).
- **Dos `<select aria-label="Cargar ejemplo">` simultáneos en el estado vacío.** Sin señal cargada
  conviven el `ExampleLoader` de `FileSection` (sidebar) y el de `EmptyState` (panel central), y
  ambos toman su nombre accesible del `aria-label` hardcodeado en `ExampleLoader.tsx:115`. Un lector
  de pantalla anuncia dos combos idénticos sin forma de distinguirlos, y a nivel `App` un
  `getByLabelText('Cargar ejemplo')` sin `within()` tira "found multiple elements". Además
  materializa la carrera multi-instancia anotada más abajo, que hasta Block 6 era hipotética:
  `isLoading` es estado por instancia, así que una puede quedar en "Cargando…" mientras la otra
  sigue habilitada. La solución es un `aria-label` diferenciable por instancia, lo que exige una
  prop nueva en `ExampleLoader.tsx` — archivo del Block 5 de `docs/daw/specs/spec-FEAT-009.md`, y
  por lo tanto fuera del alcance del Block 6.
- **Barra inferior con Fs / Duración / Muestras.** La referencia visual
  (`docs/UI/UI_With_ECG_Loaded.PNG`) muestra una barra al pie con frecuencia de muestreo, duración y
  cantidad de muestras. No existe en la app ni está especificada en ningún bloque de la spec de
  FEAT-009. Candidata a FEAT-010.
- **Encabezado: formato de duración y badge "Analizado".** La referencia muestra la duración como
  `00:00:20` y un badge verde "Analizado"; `TopBar.tsx:26` muestra `20.0 s` y no tiene badge. Es del
  Block 2 de FEAT-009 y no había quedado anotado.
- **El estado vacío de `ECGChart` quedó inalcanzable desde la app.** Con `MainPanel` (Block 6)
  decidiendo la rama según `signalStore.signal`, `ECGChart` ya nunca se monta sin señal: su propio
  estado vacío (`ECGChart.tsx:255-262`, `role="status"`, "Cargá una señal para visualizarla.") es
  código muerto a nivel aplicación, aunque su cobertura unitaria siga viva
  (`ECGChart.test.tsx:93`). Quedan dos estados vacíos para el mismo concepto, uno de ellos muerto.
  No se puede borrar dentro de FEAT-009 porque `ECGChart.tsx` está protegido por NFR-01 y el
  Principio V de `AGENTS.md`.
- **`MarkerForm` abierto sobre el estado vacío.** `markersStore` es independiente de `signalStore`:
  con el formulario abierto en modo `create` y una carga que falla (`setError` deja `signal` en
  `null`), el diálogo "Nuevo marcador" queda flotando sobre el estado vacío, y confirmarlo agrega un
  marcador a una señal que ya no está. Es un caso de borde preexistente, pero Block 6 lo vuelve
  alcanzable por primera vez al montar `MarkerForm` fuera de la rama con señal (a propósito:
  desmontarlo cerraría en silencio un formulario abierto).
- **El CI del front no verifica formato ni typecheck.** `.github/workflows/ci.yml` corre
  `npm run lint` y `npm test` en el job `frontend`, pero NO `npm run build`, así que el
  `tsc --noEmit` nunca se ejecuta en CI pese a que `AGENTS.md` exige mantenerlo verde. Tampoco hay
  chequeo de Prettier (`eslint.config.js` no lo integra) y hay 9 archivos preexistentes de
  `src/frontend/src/` fuera de formato. Es una asimetría con el back, que sí corre
  `dotnet format --verify-no-changes`. Propuesta: normalizar los 9 archivos con `npm run format` y
  agregar `npx prettier --check` y `npm run build` al job `frontend`.

- **El CI de FEAT-008 sigue sin haberse ejecutado nunca de punta a punta.** En el PR #17 (FEAT-009)
  el workflow se disparó pero murió en `startup_failure` a los 0 s, sin llegar a crear checks.
  Descartado lo que depende del repo: Actions habilitado, workflow `active`, `ci.yml` con YAML
  válido e **idéntico al de `main`** (que sí corrió bien en los PRs #15 y #16). La causa aparente es
  que GitHub nunca pudo calcular el merge del PR (`mergeable: null`, `mergeable_state: "unknown"`
  sostenido ~20 min), y los workflows de `pull_request` corren contra ese merge commit; por eso
  además `gh run rerun` lo rechaza con "its workflow file may be broken". FEAT-008 ya se había
  cerrado con esta misma confirmación pendiente. Formas de forzar el recálculo: cerrar y reabrir el
  PR, o pushear un commit nuevo. Vale la pena evaluar agregar `workflow_dispatch` al workflow para
  poder dispararlo a mano sin depender del merge commit.

## Notas de uso

Cuando se arranque una nueva sesión, revisar este archivo y preguntar al usuario si quiere convertir
alguno de estos puntos en un ticket DAW antes de asumir que el backlog es solo RF-12/13/15.
