# Spec FEAT-001: Cargar señal ECG de un canal desde CSV (RF-01)

| Field | Value |
|-------|-------|
| Ticket | FEAT-001 |
| PRD | docs/daw/prd/prd-FEAT-001.md |
| Tier | FEATURE |
| Date | 2026-08-06 |
| Spec loops | 0 |

## Summary

Se bootstrapea el proyecto front (`src/frontend`) con React 19.2 + Vite 6 + TS 5.7 + Tailwind v4 +
Vitest, y sobre él se implementa RF-01: un núcleo puro de parseo/validación de CSV (con **PapaParse**
+ validación de dominio) que produce una señal tipada o un error discriminado, y una UI de carga
(`CsvUpload`) que lee el archivo (File API), valida tamaño, invoca el parser, ingresa la señal en un
store **Zustand** y muestra éxito/error. Sin back-end, sin API, sin visualización (RF-02).

## Decisiones de arquitectura y dependencias (justificación — regla de AGENTS.md)

- **`papaparse` + `@types/papaparse`** (decisión del usuario): parser CSV robusto ante saltos de
  línea, comillas y filas irregulares, más fiable que un `split` nativo para detectar filas
  inconsistentes. Se usa solo para tokenizar; la validación de dominio es propia.
- **`zustand`** (decisión del usuario): store de estado global de la señal. Justificación completa en
  **ADR-001** (`docs/adr/adr-001-estado-global-zustand.md`).
- **Carpeta `src/state/`**: patrón nuevo para stores; documentado en ADR-001.
- **Parseo/validación en el front (File API):** desviación intencional respecto de "el procesamiento
  de señal vive en el back". Es **ingestión de archivo**, no DSP (los filtros FftSharp del glosario);
  el PRD acota RF-01 a front-only sin back. Registrado aquí como intencional.
- Todas las versiones se fijan (exactas) en `package.json`; `npm audit` corre en el gate SAST (CODE).

## Coverage: PRD → blocks

| Requirement | Covered by |
|---|---|
| FR-01 (selección de archivo) | Block 3 |
| FR-02 (parseo del CSV) | Block 2 |
| FR-03 (ingesta de la señal al estado) | Block 2 (produce señal) + Block 3 (store) |
| FR-04 (rechazo de formato inválido) | Block 2 (detección) + Block 3 (mensaje) |
| FR-05 (rechazo multicanal) | Block 2 (detección) + Block 3 (mensaje) |
| FR-06 (indicación éxito/error) | Block 3 |
| NFR-01 (<0.2 s p95, archivo 1 min ≈ 30k muestras) | Strategy: PapaParse en modo síncrono sobre string en memoria; sin trabajo por muestra más allá de `parseFloat`+push. Test de rendimiento en Block 2 que parsea un CSV generado de 30.000 filas 20 veces y verifica p95 < 0.2 s. |
| NFR-02 (últimas 2 versiones Chrome/Firefox/Edge + Chrome Android + Safari iOS) | Strategy: solo APIs estándar (File, FileReader/`text()`, DOM) y toolchain Vite/React que transpila a targets modernos; sin APIs específicas de navegador. Verificación manual documentada; sin polyfills nuevos. |

## Dependencies between blocks

- **Block 1** (scaffolding) es prerequisito de todo.
- **Block 2** depende de Block 1 (necesita el proyecto y Vitest).
- **Block 3** depende de Block 1 y Block 2 (usa `parseCsv` y monta el store).
- Orden de ejecución: **1 → 2 → 3**.

---

## Block 1 — Scaffolding del proyecto front

**Files**
- `src/frontend/package.json` (new) — deps y scripts (`dev`, `build`, `test`, `lint`, `format`, `typecheck`). Versiones fijadas: react 19.2, react-dom 19.2, vite 6, @vitejs/plugin-react, typescript 5.7, tailwindcss v4, @tailwindcss/vite, vitest 2, @testing-library/react, @testing-library/jest-dom, jsdom, eslint 9, typescript-eslint, prettier 3, papaparse, @types/papaparse, zustand.
- `src/frontend/vite.config.ts` (new) — plugins `@vitejs/plugin-react` y `@tailwindcss/vite`; alias `@` → `./src`; config de Vitest (environment jsdom, setupFiles).
- `src/frontend/tsconfig.json` (new) — `strict: true`, `noEmit`, paths `@/*` → `src/*`.
- `src/frontend/tsconfig.node.json` (new) — config para archivos de tooling.
- `src/frontend/index.html` (new) — root `#root` + script a `main.tsx`.
- `src/frontend/src/main.tsx` (new) — monta `<App/>`.
- `src/frontend/src/App.tsx` (new) — cascarón mínimo (se completa en Block 3).
- `src/frontend/src/index.css` (new) — `@import "tailwindcss";`.
- `src/frontend/src/lib/utils.ts` (new) — helper `cn` (clsx + tailwind-merge) por convención de AGENTS.md.
- `src/frontend/src/test/setup.ts` (new) — importa `@testing-library/jest-dom`.
- `src/frontend/src/smoke.test.ts` (new) — test de humo trivial que valida que Vitest corre.
- `src/frontend/eslint.config.js` (new) — flat config con typescript-eslint.
- `src/frontend/.prettierrc` (new) — config Prettier.

**Logic**
Dejar el proyecto compilable y testeable: `npm install`, `npm run build`, `npm run typecheck` y
`npm test` operativos. Bloque **habilitador** sin FR directo (W-SPEC-01 esperado y justificado: es
el andamiaje sin el cual ningún FR puede existir).

**Input validation**
N/A (no recibe input de usuario).

**Error handling**
N/A (no hay lógica de runtime con entradas; los errores son de build/config y los detecta el gate de
tests/typecheck).

**Required tests**
- [ ] `smoke.test.ts` — `expect(true).toBe(true)` corre en Vitest (valida el runner y el setup).

**Completion criterion**
`npm run build` y `npm run typecheck` (tsc --noEmit) verdes; `npm test` ejecuta y pasa el test de
humo; `npm run lint` sin errores.

---

## Block 2 — Núcleo de parseo y validación del CSV

**Files**
- `src/frontend/src/lib/ecg/types.ts` (new) — tipos del dominio:
  - `ECGSample = { t: number; mV: number }`
  - `ECGSignal = { samples: ECGSample[] }`
  - `ParseError` (unión discriminada por `kind`): `'too-few-columns' | 'multichannel' | 'non-numeric' | 'no-data' | 'inconsistent-columns'` (los tres últimos con dato de contexto: `row`/`channels`).
  - `ParseResult = { ok: true; signal: ECGSignal } | { ok: false; error: ParseError }`
- `src/frontend/src/lib/ecg/parseCsv.ts` (new) — `parseCsv(text: string): ParseResult`.
- `src/frontend/src/lib/ecg/parseCsv.test.ts` (new) — tests unitarios (Vitest).

**Logic**
`parseCsv(text)`:
1. Tokeniza con PapaParse (`delimiter: ','`, `skipEmptyLines: true`).
2. Descarta la primera fila como cabecera (nombre no validado — FR-02).
3. Valida y construye la señal:
   - Cada fila de datos debe tener exactamente 2 celdas (tras `trim`).
   - Convierte con `Number(...)`; celda que dé `NaN` → error.
   - Preserva el orden del archivo (FR-03).
4. Devuelve `{ ok: true, signal }` o `{ ok: false, error }`.

**Input validation** (FR-02, FR-04, FR-05)
- Separador de columnas: coma. Separador decimal: punto. `trim` de nombres y valores.
- Nº de columnas de la cabecera/filas: exactamente 2 → válido; ≥3 → multicanal; <2 → inválido.
- Ambas celdas de cada fila de datos: numéricas (negativos permitidos).
- Debe existir al menos 1 fila de datos.
- Todas las filas de datos con el mismo número de columnas.

**Error handling** (cada error tiene su test — F-SPEC-16)
- `too-few-columns`: alguna fila (o la cabecera) tiene menos de 2 columnas → `{ok:false}`, no construye señal.
- `multichannel`: la cabecera/filas tienen 3 o más columnas → `{ok:false, error:{kind:'multichannel', channels}}`, no procesa.
- `non-numeric`: una celda de datos no es numérica → `{ok:false, error:{kind:'non-numeric', row}}`.
- `no-data`: no hay filas de datos (archivo vacío o solo cabecera) → `{ok:false, error:{kind:'no-data'}}`.
- `inconsistent-columns`: filas con distinto número de columnas entre sí → `{ok:false, error:{kind:'inconsistent-columns', row}}`.

**Required tests**
- [ ] Parsea un CSV válido de 1 canal (cabecera + filas tiempo/mV, con espacios) y devuelve la señal ordenada con valores correctos (incluye negativos) — **valida AC-02**.
- [ ] Rechaza CSV con menos de 2 columnas → error `too-few-columns` — **valida AC-04** (sad path).
- [ ] Rechaza CSV con valor no numérico en una fila → error `non-numeric` con `row` — **valida AC-04** (sad path).
- [ ] Rechaza CSV vacío y CSV con solo cabecera → error `no-data` — **valida AC-04** (sad path).
- [ ] Rechaza CSV con filas de distinta cantidad de columnas → error `inconsistent-columns` — **valida AC-04** (sad path).
- [ ] Rechaza CSV con 3+ columnas → error `multichannel` con `channels` — **valida AC-05** (sad path).
- [ ] **Rendimiento (NFR-01):** genera un CSV de 30.000 filas, lo parsea 20 veces y verifica p95 < 0.2 s.

**Completion criterion**
Todos los tests de `parseCsv.test.ts` pasan; `tsc --noEmit` verde; sin `any`.

---

## Block 3 — UI de carga (CsvUpload) + store de la señal

**Files**
- `src/frontend/src/state/signalStore.ts` (new) — store Zustand: `signal: ECGSignal | null`, `error: ParseError | 'file-too-large' | 'read-error' | null`, `status: 'idle' | 'loaded' | 'error'`, acciones `loadFromText(text)` (usa `parseCsv`) y `setError(...)`/`reset()`.
- `src/frontend/src/components/CsvUpload.tsx` (new) — input file nativo estilado (`aria-label`) + zona de arrastre; lee el `File`, valida tamaño, lee texto, delega en el store; renderiza mensaje de éxito o de error (mapea `ParseError.kind` → texto legible).
- `src/frontend/src/components/CsvUpload.test.tsx` (new) — tests RTL.
- `src/frontend/src/App.tsx` (modified) — monta `<CsvUpload/>`.

**Logic**
- FR-01: `<input type="file" accept=".csv,text/csv">` + drop zone; al seleccionar/soltar toma el `File`.
- Valida `file.size <= 25 MB` **antes** de leer (mitigación R1 del threat model). Si excede → estado `error: 'file-too-large'`, no lee ni parsea.
- Lee el contenido con `file.text()`; ante fallo de lectura → `error: 'read-error'`.
- Invoca `loadFromText(text)` → el store llama `parseCsv`; si `ok` guarda la señal (FR-03) y `status:'loaded'`; si no, guarda el `error` y `status:'error'`.
- FR-06: renderiza indicación de éxito (`status==='loaded'`) o mensaje de error mapeado por tipo, incluido el de multicanal ("solo se soporta un canal").

**Input validation** (FR-01, FR-04, FR-05, mitigación R1)
- Tipo/tamaño del archivo: `file.size <= 25 * 1024 * 1024`; se aceptan archivos de texto (la validación real de contenido la hace `parseCsv`).

**Error handling** (cada error tiene su test — F-SPEC-16)
- `file-too-large`: archivo > 25 MB → mensaje, no lee/parsea.
- `read-error`: `file.text()` falla → mensaje genérico, no ingresa señal.
- Errores de `parseCsv` (`too-few-columns`, `non-numeric`, `no-data`, `inconsistent-columns`, `multichannel`): se mapean a un mensaje legible; no se ingresa señal.
- **Mitigación R2 (XSS):** los mensajes se construyen a partir del `kind` del error (texto fijo), **nunca** incrustando contenido crudo del archivo, y sin `dangerouslySetInnerHTML`.

**Required tests**
- [ ] Al seleccionar un archivo válido, se dispara la lectura y el parseo (mock de `parseCsv`/File) — **valida AC-01**.
- [ ] Cargar un CSV válido deja la señal en el store y muestra la indicación de éxito — **valida AC-02, AC-03**.
- [ ] Cargar un CSV inválido (p. ej. no numérico) muestra mensaje de error y **no** deja señal en el store — **valida AC-04** (sad path).
- [ ] Cargar un CSV con 3+ columnas muestra el mensaje "solo se soporta un canal" y no procesa — **valida AC-05** (sad path).
- [ ] Seleccionar un archivo > 25 MB muestra el mensaje de tamaño y no lee/parsea — cubre error `file-too-large` (sad path).
- [ ] Un fallo de `file.text()` (mock que rechaza) muestra el mensaje de lectura y no ingresa señal — cubre error `read-error` (sad path).
- [ ] El mensaje de error no usa `dangerouslySetInnerHTML` ni refleja bytes crudos del archivo (mitigación R2).

**Completion criterion**
Todos los tests de `CsvUpload.test.tsx` pasan; el store expone la señal cargada; `tsc --noEmit`
verde; `npm run lint` limpio.

---

## Final verification

- Los 3 bloques implementados; `npm run build`, `npm run typecheck`, `npm run lint` y `npm test`
  verdes.
- Cada AC del PRD (AC-01…AC-05) tiene al menos un test que pasa.
- Mitigaciones del threat model aplicadas: límite de 25 MB (R1), mensajes sin HTML crudo (R2),
  versiones fijadas + `npm audit` en SAST (R4).
- La señal cargada queda disponible en el store Zustand para su consumo por RF-02 (ticket posterior).
