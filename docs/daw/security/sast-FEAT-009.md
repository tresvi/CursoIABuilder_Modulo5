# SAST FEAT-009: Interfaz gráfica según referencia visual

| Campo | Valor |
|-------|-------|
| Ticket | FEAT-009 |
| Tier | FEATURE |
| Fecha | 2026-08-26 |
| Alcance | 30 archivos `.ts`/`.tsx` de `src/frontend` + 4 assets nuevos en `src/frontend/public/samples/` |
| Threat model | `docs/daw/security/threat-FEAT-009.md` |
| Veredicto | **PASSED** — 0 Critical, 0 High, 0 Medium |

## Contexto del cambio

FEAT-009 es 100% frontend: shell de layout, ítems de menú deshabilitados, panel principal con
estado vacío y carga de 3 señales de ejemplo. **No toca el backend .NET**, no agrega autenticación
ni persistencia, y no incorpora dependencias (`package.json` sin cambios contra `main`).

La única superficie de red nueva es un `GET` a un asset estático del mismo origen.

## Resultados por categoría

| Regla | Categoría | Resultado |
|---|---|---|
| F-SAST-01 | Secretos hardcodeados | ✅ Limpio |
| F-SAST-02 | Inyección SQL/NoSQL | ✅ N/A — el front no accede a la base; el back no se tocó |
| F-SAST-03 | Inyección de comandos | ✅ Limpio — sin `exec`/`spawn`/`child_process` |
| F-SAST-04 | Deserialización insegura | ✅ Limpio |
| F-SAST-05 | Path traversal | ✅ Limpio — ver detalle abajo (R-07) |
| F-SAST-06 | XSS | ✅ Limpio — sin `dangerouslySetInnerHTML` ni `innerHTML` |
| F-SAST-07 | SSRF | ✅ Limpio — ver detalle abajo |
| F-SAST-08 | Criptografía débil | ✅ N/A — el ticket no maneja criptografía |
| F-SAST-09 | Debug en producción | ✅ Limpio — sin `console.log`/`console.debug` fuera de tests |
| F-SAST-10 | Logging de datos sensibles | ✅ N/A — no hay logging |
| F-SAST-11 | Upload sin restricción | ✅ Sin regresión — ver detalle abajo |
| F-SAST-12 | CSRF | ✅ N/A — sin sesiones ni cookies; la app es de libre acceso |
| F-SAST-13 | CVEs en dependencias | ✅ `npm audit` → 0 vulnerabilidades |
| F-SAST-14 | Validación de entrada incompleta | ✅ Limpio — ver detalle abajo (R-08) |
| F-SAST-15 | Errores que filtran internals | ✅ Limpio — ver detalle abajo |
| F-SAST-17 | Funciones inseguras | ✅ Limpio — sin `eval`/`new Function` |

## Detalle de las categorías relevantes

### F-SAST-01 — Secretos

- `.env` está en `.gitignore` (línea 12, patrón `*.env`).
- `git ls-files` no lista ningún `.env` ni variante: **ninguno versionado**.
- El grep de `api_key|password|secret|token|bearer|ANTHROPIC` sobre los 30 archivos del ticket
  devuelve **una sola coincidencia**, y es texto de un comentario
  (`ExampleLoader.tsx:52`, la palabra "secuencia" dentro de `errorSeq`). No es un secreto.
- La API key de Claude (`ANTHROPIC_API_KEY`) no aparece en el código: sigue viviendo en `.env`,
  como manda `AGENTS.md`.

### F-SAST-05 — Path traversal (mitigación R-07 del threat model)

El único punto donde la entrada del usuario podría alcanzar una ruta es la carga de ejemplos.
`src/frontend/src/lib/ecg/samples.ts:63-76`:

```ts
const sample = EXAMPLE_SAMPLES.find((candidate) => candidate.id === id);
if (!sample) return { ok: false };
const res = await fetch(sample.path);
```

La ruta sale del catálogo, **nunca del argumento**. Las 3 rutas de `EXAMPLE_SAMPLES` son literales.
Un id desconocido devuelve `{ ok: false }` **sin emitir ningún `fetch`**.

**Verificado por mutación, no por lectura:** reemplazando el guardia por
`fetch(\`/samples/${id}.csv\`)`, el test `samples.test.ts` muere mostrando intentos reales de
traversal (`/samples/../../etc/passwd.csv`, `/samples//etc/passwd.csv`). Con la implementación real,
esos mismos ids no producen ninguna llamada.

### F-SAST-07 — SSRF

Los 3 `fetch` del frontend, todos con destino no controlable por el usuario:

| Archivo | Destino |
|---|---|
| `lib/api/client.ts:12` | `${API_BASE}/api/health` — `API_BASE` viene de `VITE_API_BASE` (build-time) |
| `lib/api/filters.ts:36` | `${API_BASE}/api/filters/apply` — ídem |
| `lib/ecg/samples.ts:68` | `sample.path` — literal de la lista blanca |

Ninguno concatena entrada del usuario en el host ni en el path.

### F-SAST-11 / F-SAST-14 — Validación de la entrada (mitigación R-08)

El contenido descargado **no se considera confiable por venir del propio origen**:
`ExampleLoader.tsx` entrega el texto crudo a `loadFromText`, es decir al mismo `parseCsv` que usa
"Abrir CSV" (≥2 columnas, rechazo de multicanal, celdas numéricas, filas consistentes).

**Verificado por mutación:** salteando `parseCsv` y armando la señal directamente desde el texto,
mueren 2 tests (`expected 'loaded' to be 'error'`).

El guardia de tamaño de `CsvUpload` (`MAX_FILE_SIZE`, 25 MB, previo a leer el archivo) **no fue
modificado** por este ticket: el único cambio en `CsvUpload.tsx` es la extracción de
`signalErrorMessage`, sin cambio de textos ni de comportamiento.

### F-SAST-15 — Errores que filtran internals

`lib/ecg/signalErrorMessage.ts` mapea cada `SignalError` a un texto fijo en español. No se propagan
stack traces, rutas del sistema de archivos, ni detalles de la excepción original: el `catch` de
`fetchExampleSample` colapsa cualquier fallo (404, 5xx, rechazo de red) en `{ ok: false }`, que el
llamador traduce a `read-error`. **Falla segura**, sin filtración.

### F-SAST-06 — XSS

React escapa por defecto y el ticket no introduce ningún `dangerouslySetInnerHTML`. El nombre de
archivo que `TopBar` muestra (FR-09) se renderiza como texto, no como HTML.

La cobertura preexistente lo asevera: `CsvUpload.test.tsx` carga un CSV cuyo contenido es
`<img src=x onerror=alert(1)>` y verifica que `container.innerHTML` no lo contenga como marcado.

## Assets públicos nuevos

Los 4 archivos agregados bajo `src/frontend/public/samples/` se publican en el build. Revisados:

- Los 3 CSV son series numéricas de ECG (`tiempo, mV`) sin datos personales ni identificadores.
  Se publican **deliberadamente**: son las señales de ejemplo que ofrece FR-07.
- `README.md` documenta que `ECGSamples/CSV/` es la fuente de verdad. **No contiene secretos**,
  pero sí rutas internas del repositorio, y Vite lo publica en `/samples/README.md`.

**Disposición:** 🟢 Informational — no bloquea (F-SAST no tiene regla para exposición de rutas de
repositorio, y el repositorio es público). Registrado en `docs/BACKLOG.md`.

## Supresiones

**Ninguna.** No hubo hallazgos Medium que suprimir.

## Veredicto

**PASSED.** 0 Critical, 0 High, 0 Medium. `gates.sast` = `true`.

Las dos mitigaciones que el threat model marcaba como las de mayor exposición del ticket (R-07 path
traversal y R-08 contenido descargado tratado como confiable) están implementadas y **verificadas
por mutación**, no solo declaradas.
